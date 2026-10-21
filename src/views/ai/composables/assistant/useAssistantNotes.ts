import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { sanitizeHtml } from '@/utils/sanitizeHtml'
import { workspaceApi } from './useAssistantConversations'

export interface NoteRow {
  id: string
  scopeId: string
  title: string
  content: string
  ord: number
  sourceType: string | null
  sourceConvId: string | null
  sourceMsgId: string | null
  sourceConvTitle: string | null
  sourceMsgContent: string | null
  createdAt: number
  updatedAt: number
}

export interface CreateNoteInput {
  scopeId: string
  title?: string
  content?: string
  sourceType?: string | null
  sourceConvId?: string | null
  sourceMsgId?: string | null
  sourceConvTitle?: string | null
  sourceMsgContent?: string | null
}

export interface NotesApi {
  create(input: CreateNoteInput): Promise<NoteRow>
  list(scopeId: string): Promise<NoteRow[]>
  get(noteId: string): Promise<NoteRow | null>
  update(noteId: string, patch: { title?: string; content?: string }): Promise<NoteRow>
  delete(noteId: string): Promise<boolean>
  reorder(scopeId: string, orderedNoteIds: string[]): Promise<boolean>
}

export interface ExcerptInput {
  /** 所属工作区（主会话 convId） */
  scopeId: string
  /** 来源辅助会话 convId */
  convId: string
  convTitle: string
  msgId: string
  /** 摘录进笔记的正文（有选中文字时为选中部分，否则为整条消息） */
  content: string
  /** 来源消息的完整正文，写入快照字段 */
  fullContent: string
}

export interface AssistantNotesState {
  notes: Ref<NoteRow[]>
  activeNoteId: Ref<string | null>
  activeNote: ComputedRef<NoteRow | null>
  draftTitle: Ref<string>
  draftContent: Ref<string>
  dirty: ComputedRef<boolean>
  /**
   * 等待用户确认的待执行动作队列（未保存修改时的切换）。
   * 队列而非单槽位：切换笔记、关闭面板、切换主会话可能同时挂起，
   * 单槽位会互相覆盖，导致先来的那个动作永久丢失。
   */
  pendingAction: ComputedRef<(() => void) | null>
  load: (scopeId: string) => Promise<void>
  create: (input: CreateNoteInput) => Promise<NoteRow | null>
  excerpt: (input: ExcerptInput) => Promise<NoteRow | null>
  newNote: () => Promise<NoteRow | null>
  select: (noteId: string) => void
  setDraftTitle: (title: string) => void
  setDraftContent: (content: string) => void
  save: () => Promise<boolean>
  discard: () => void
  remove: (noteId: string) => Promise<void>
  reorder: (orderedNoteIds: string[]) => Promise<void>
  hasUnsavedChanges: () => boolean
  requestSwitch: (action: () => void) => boolean
  runPendingAction: () => void
  cancelPendingAction: () => void
}

export const MAX_CONTENT_BYTES = 1024 * 1024

export function notesApi(): NotesApi {
  return window.bridge.getModules(['notes']).notes as unknown as NotesApi
}

/** 由正文推导一个可读标题 */
function deriveTitle(content: string): string {
  const flat = content.replace(/\s+/g, ' ').trim()
  if (!flat) return '新笔记'
  return flat.length > 20 ? `${flat.slice(0, 20)}...` : flat
}

export function byteLength(text: string): number {
  return new TextEncoder().encode(text).length
}

export function useAssistantNotes(): AssistantNotesState {
  const notes = ref<NoteRow[]>([])
  const activeNoteId = ref<string | null>(null)
  const draftTitle = ref('')
  const draftContent = ref('')
  const pendingActions = ref<(() => void)[]>([])
  /** 队首动作：非空表示有未保存修改等待用户确认 */
  const pendingAction = computed(() => pendingActions.value[0] ?? null)
  /** 加载请求序号：只有最后一次 load 的结果会被采纳 */
  let loadTicket = 0
  let currentScope: string | null = null

  const activeNote = computed(
    () => notes.value.find(n => n.id === activeNoteId.value) ?? null
  )
  const dirty = computed(() => {
    const note = activeNote.value
    if (!note) return false
    return draftTitle.value !== note.title || draftContent.value !== note.content
  })

  async function load(scopeId: string) {
    // 请求序号：快速切换主会话时，旧工作区的响应必须丢弃
    const ticket = ++loadTicket
    // 重新加载前先记住草稿状态：刷新列表不应抹掉未保存的编辑
    const keepDraft = dirty.value && activeNoteId.value !== null
    const previousId = activeNoteId.value

    currentScope = scopeId
    try {
      const list = await notesApi().list(scopeId)
      if (ticket !== loadTicket) return
      notes.value = list
      const state = await workspaceApi().getState(scopeId)
      if (ticket !== loadTicket) return
      const active = state?.activeNoteId
      const target =
        (active ? notes.value.find(n => n.id === active) : undefined) ?? notes.value[0] ?? null

      if (keepDraft && target?.id === previousId) {
        // 还是同一条笔记：只刷新列表，保留草稿
        activeNoteId.value = target.id
        return
      }

      activeNoteId.value = target?.id ?? null
      draftTitle.value = target?.title ?? ''
      draftContent.value = target?.content ?? ''
    } catch (err) {
      // 加载失败不能中断调用链：保留现有列表，等用户重试
      if (ticket !== loadTicket) return
      console.error('[assistant] 加载笔记失败', scopeId, err)
    }
  }

  async function create(input: CreateNoteInput): Promise<NoteRow | null> {
    const note = await notesApi().create(input)
    notes.value = [...notes.value, note]
    return note
  }

  /** 从辅助会话消息摘录为笔记（FLOW-3），并写入来源快照 */
  async function excerpt(input: ExcerptInput): Promise<NoteRow | null> {
    const note = await create({
      scopeId: input.scopeId,
      title: deriveTitle(input.content),
      content: input.content,
      sourceType: 'ai_message',
      sourceConvId: input.convId,
      sourceMsgId: input.msgId,
      sourceConvTitle: input.convTitle,
      sourceMsgContent: input.fullContent,
    })
    // FLOW-3：摘录后新笔记被激活。当前笔记有未保存修改时挂起，等用户确认
    if (note) requestSwitch(() => applySelect(note.id))
    return note
  }

  /** 手动新建笔记（FR-4.8） */
  async function newNote(): Promise<NoteRow | null> {
    if (!currentScope) return null
    const note = await create({ scopeId: currentScope, sourceType: 'manual' })
    // 走 requestSwitch：直接 applySelect 会覆盖当前笔记未保存的草稿
    if (note) requestSwitch(() => applySelect(note.id))
    return note
  }

  function applySelect(noteId: string) {
    activeNoteId.value = noteId
    const note = notes.value.find(n => n.id === noteId) ?? null
    draftTitle.value = note?.title ?? ''
    draftContent.value = note?.content ?? ''
    if (currentScope) void workspaceApi().setActive(currentScope, { noteId })
  }

  /** 切换编辑目标；有未保存修改时挂起，交由确认条处理（FLOW-5） */
  function select(noteId: string) {
    requestSwitch(() => applySelect(noteId))
  }

  function setDraftTitle(title: string) {
    draftTitle.value = title
  }

  function setDraftContent(content: string) {
    draftContent.value = content
  }

  /** 手动保存：内容消毒后落库；失败时保留草稿（NFR-R5） */
  async function save(): Promise<boolean> {
    const noteId = activeNoteId.value
    if (!noteId) return false

    const content = sanitizeHtml(draftContent.value)
    if (byteLength(content) > MAX_CONTENT_BYTES) {
      throw new Error('笔记内容超过 1MB 上限')
    }

    const updated = await notesApi().update(noteId, {
      title: draftTitle.value,
      content,
    })
    const index = notes.value.findIndex(n => n.id === noteId)
    if (index !== -1) notes.value[index] = updated
    draftTitle.value = updated.title
    draftContent.value = updated.content
    return true
  }

  /** 放弃未保存的修改，回到已保存的版本 */
  function discard() {
    const note = activeNote.value
    draftTitle.value = note?.title ?? ''
    draftContent.value = note?.content ?? ''
  }

  async function remove(noteId: string) {
    await notesApi().delete(noteId)
    notes.value = notes.value.filter(n => n.id !== noteId)
    if (activeNoteId.value === noteId) {
      const next = notes.value[0] ?? null
      activeNoteId.value = next?.id ?? null
      draftTitle.value = next?.title ?? ''
      draftContent.value = next?.content ?? ''
      if (currentScope) {
        void workspaceApi().setActive(currentScope, { noteId: next?.id ?? null })
      }
    }
  }

  async function reorder(orderedNoteIds: string[]) {
    if (!currentScope) return
    const byId = new Map(notes.value.map(n => [n.id, n]))
    const next = orderedNoteIds
      .map(id => byId.get(id))
      .filter((n): n is NoteRow => n !== undefined)
    for (const note of notes.value) {
      if (!next.includes(note)) next.push(note)
    }
    notes.value = next
    await notesApi().reorder(currentScope, orderedNoteIds)
  }

  function hasUnsavedChanges(): boolean {
    return dirty.value
  }

  /** 有未保存修改时挂起动作，等用户确认后再执行 */
  function requestSwitch(action: () => void): boolean {
    if (!dirty.value) {
      action()
      return true
    }
    pendingActions.value = [...pendingActions.value, action]
    return false
  }

  /** 用户确认（保存 / 放弃）后执行队列里的全部动作 */
  function runPendingAction() {
    const actions = pendingActions.value
    pendingActions.value = []
    for (const action of actions) action()
  }

  /** 用户取消切换：丢弃队列，停留在当前笔记 */
  function cancelPendingAction() {
    pendingActions.value = []
  }

  return {
    notes,
    activeNoteId,
    activeNote,
    draftTitle,
    draftContent,
    dirty,
    pendingAction,
    load,
    create,
    excerpt,
    newNote,
    select,
    setDraftTitle,
    setDraftContent,
    save,
    discard,
    remove,
    reorder,
    hasUnsavedChanges,
    requestSwitch,
    runPendingAction,
    cancelPendingAction,
  }
}
