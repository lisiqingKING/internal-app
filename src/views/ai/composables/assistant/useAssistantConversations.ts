import { computed, ref, shallowRef, watch, type ComputedRef, type Ref } from 'vue'
import { createChatService, type ChatService } from '../chat/useChatService'
import type { ChatSession, Message } from '../../types'

const DEFAULT_TITLE = '新会话'

export interface AssistantSessionRow {
  convId: string
  title: string
  createdAt: number
  updatedAt: number
  pinned: number
  categoryId: string | null
  scopeId: string | null
  ord: number
}

export interface AssistantApi {
  /** 主进程在 scope 不是已落库的主会话时返回 null */
  create(scopeId: string): Promise<{ convId: string } | null>
  list(scopeId: string): Promise<AssistantSessionRow[]>
  rename(convId: string, title: string): Promise<boolean>
  deleteSession(convId: string): Promise<boolean>
  reorder(scopeId: string, orderedConvIds: string[]): Promise<boolean>
}

export interface WorkspaceApi {
  getState(scopeId: string): Promise<{
    scopeId: string
    activeConvId: string | null
    activeNoteId: string | null
  }>
  setActive(
    scopeId: string,
    patch: { convId?: string | null; noteId?: string | null }
  ): Promise<unknown>
}

export function assistantApi(): AssistantApi {
  return window.bridge.getModules(['assistant']).assistant as unknown as AssistantApi
}

export function workspaceApi(): WorkspaceApi {
  return window.bridge.getModules(['workspace']).workspace as unknown as WorkspaceApi
}

export interface AssistantConversationsState {
  sessions: Ref<ChatSession[]>
  activeConvId: Ref<string | null>
  activeSession: ComputedRef<ChatSession | null>
  messages: ComputedRef<Message[]>
  loading: ComputedRef<boolean>
  currentText: ComputedRef<string>
  currentReasoning: ComputedRef<string>
  error: ComputedRef<string | null>
  load: (scopeId: string) => Promise<void>
  activate: (convId: string) => Promise<void>
  create: () => Promise<void>
  remove: (convId: string) => Promise<void>
  rename: (convId: string, title: string) => Promise<void>
  reorder: (orderedConvIds: string[]) => Promise<void>
  send: (content: string) => Promise<void>
  cancel: () => void
  disposeAll: () => void
}

function toLocalSession(row: AssistantSessionRow): ChatSession {
  return {
    convId: row.convId,
    title: row.title,
    messages: [],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    pinned: row.pinned,
    categoryId: row.categoryId,
    persisted: true,
  }
}

export function useAssistantConversations(): AssistantConversationsState {
  const sessions = ref<ChatSession[]>([])
  const activeConvId = ref<string | null>(null)
  const services = new Map<string, ChatService>()
  /**
   * 当前激活会话的 chat service。
   * 必须放在 ref 里：services 是普通 Map，写入它不会触发 computed 重算，
   * 组件会一直读到「service 还没创建」时的空值。
   */
  const activeService = shallowRef<ChatService | null>(null)
  /** 记录已落库的标题，用于识别自动改名并同步回主进程 */
  const titleSnapshot = new Map<string, string>()
  let currentScope: string | null = null
  /** 加载请求序号：只有最后一次 load 的结果会被采纳 */
  let loadTicket = 0

  const activeSession = computed(
    () => sessions.value.find(s => s.convId === activeConvId.value) ?? null
  )
  const messages = computed<Message[]>(() => activeService.value?.state.chatHistory ?? [])
  const loading = computed(() => activeService.value?.state.loading ?? false)
  const currentText = computed(() => activeService.value?.state.currentText ?? '')
  const currentReasoning = computed(() => activeService.value?.state.currentReasoning ?? '')
  /** 面板级错误（建不出辅助会话等），优先于 chat service 的错误展示 */
  const localError = ref<string | null>(null)
  const error = computed(() => localError.value ?? activeService.value?.state.error ?? null)

  function getOrCreateService(convId: string): ChatService | null {
    const session = sessions.value.find(s => s.convId === convId)
    if (!session) return null
    if (!services.has(convId)) {
      services.set(convId, createChatService(session, () => activeConvId.value))
    }
    return services.get(convId)!
  }

  function disposeAll() {
    for (const service of services.values()) service.dispose()
    services.clear()
    activeService.value = null
  }

  /** 加载工作区的辅助会话；空工作区按 FLOW-11 自动创建一条 */
  async function load(scopeId: string) {
    // 请求序号：快速切换主会话时，先发后到的旧响应必须丢弃，
    // 否则旧工作区的数据会盖掉新工作区，还会把激活项写进错误的工作区
    const ticket = ++loadTicket
    disposeAll()
    currentScope = scopeId
    sessions.value = []
    activeConvId.value = null
    titleSnapshot.clear()
    localError.value = null

    try {
      const rows = await assistantApi().list(scopeId)
      if (ticket !== loadTicket) return
      sessions.value = rows.map(toLocalSession)
      for (const s of sessions.value) titleSnapshot.set(s.convId, s.title)

      const state = await workspaceApi().getState(scopeId)
      if (ticket !== loadTicket) return
      const active = state?.activeConvId
      if (active && sessions.value.some(s => s.convId === active)) {
        await activate(active)
      } else if (sessions.value.length > 0) {
        await activate(sessions.value[0].convId)
      } else {
        await create()
      }
    } catch (err) {
      // 加载失败不能中断调用链：面板显示为空，用户可重试
      if (ticket !== loadTicket) return
      console.error('[assistant] 加载辅助会话失败', scopeId, err)
    }
  }

  async function activate(convId: string) {
    activeConvId.value = convId
    if (currentScope) await workspaceApi().setActive(currentScope, { convId })
    const service = getOrCreateService(convId)
    activeService.value = service
    await service?.syncFromSession()
  }

  async function create() {
    if (!currentScope) return
    const created = await assistantApi().create(currentScope)
    if (!created?.convId) {
      // 主进程拒绝了这个工作区（例如 scope 不是已落库的主会话）
      localError.value = '当前对话不可用作辅助工作区'
      console.error('[assistant] 创建辅助会话失败：工作区不可用', currentScope)
      return
    }
    localError.value = null
    const { convId } = created
    const now = Date.now()
    const local: ChatSession = {
      convId,
      title: DEFAULT_TITLE,
      messages: [],
      createdAt: now,
      updatedAt: now,
      pinned: 0,
      categoryId: null,
      persisted: true,
    }
    // 新会话的 ord 为当前最大值 + 1，追加到末尾与主进程排序一致
    sessions.value = [...sessions.value, local]
    titleSnapshot.set(convId, DEFAULT_TITLE)
    await activate(convId)
  }

  async function remove(convId: string) {
    if (!currentScope) return
    await assistantApi().deleteSession(convId)
    services.get(convId)?.dispose()
    services.delete(convId)
    sessions.value = sessions.value.filter(s => s.convId !== convId)
    titleSnapshot.delete(convId)

    if (activeConvId.value === convId) {
      activeConvId.value = null
      activeService.value = null
      if (sessions.value.length > 0) {
        await activate(sessions.value[0].convId)
      } else {
        await create()
      }
    }
  }

  async function rename(convId: string, title: string) {
    await assistantApi().rename(convId, title)
    const session = sessions.value.find(s => s.convId === convId)
    if (session) {
      session.title = title
      titleSnapshot.set(convId, title)
    }
  }

  async function reorder(orderedConvIds: string[]) {
    if (!currentScope) return
    const byId = new Map(sessions.value.map(s => [s.convId, s]))
    const next = orderedConvIds
      .map(id => byId.get(id))
      .filter((s): s is ChatSession => s !== undefined)
    for (const s of sessions.value) {
      if (!next.includes(s)) next.push(s)
    }
    sessions.value = next
    await assistantApi().reorder(currentScope, orderedConvIds)
  }

  async function send(content: string) {
    const service = activeService.value
    if (!service) return
    await service.sendMessage(content)
  }

  function cancel() {
    activeService.value?.cancelRequest()
  }

  // 标题被自动改名（取首条用户消息）时同步回主进程
  watch(
    () => JSON.stringify(sessions.value.map(s => [s.convId, s.title])),
    () => {
      for (const session of sessions.value) {
        const persisted = titleSnapshot.get(session.convId)
        titleSnapshot.set(session.convId, session.title)
        if (persisted !== undefined && persisted !== session.title) {
          void assistantApi().rename(session.convId, session.title)
        }
      }
    }
  )

  return {
    sessions,
    activeConvId,
    activeSession,
    messages,
    loading,
    currentText,
    currentReasoning,
    error,
    load,
    activate,
    create,
    remove,
    rename,
    reorder,
    send,
    cancel,
    disposeAll,
  }
}
