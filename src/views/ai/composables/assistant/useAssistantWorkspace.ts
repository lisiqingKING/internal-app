import { onScopeDispose, ref, watch, type InjectionKey, type Ref } from 'vue'
import {
  useAssistantConversations,
  type AssistantConversationsState,
} from './useAssistantConversations'
import { useAssistantNotes, type AssistantNotesState } from './useAssistantNotes'

/** 搜索结果跳转后的高亮目标（FR-5.4） */
export interface HighlightTarget {
  type: 'note' | 'message'
  id: string
  /** 消息所在会话；笔记不区分 */
  convId?: string
}

export interface AssistantWorkspace {
  /** 当前工作区 = 主会话 convId */
  scopeId: Ref<string | null>
  conversations: AssistantConversationsState
  notes: AssistantNotesState
  /** 当前高亮目标 */
  highlight: Ref<HighlightTarget | null>
  /** 高亮目标（短暂高亮后自动清除） */
  setHighlight: (target: HighlightTarget | null) => void
  /** 工作区是否加载完成 */
  ready: Ref<boolean>
  /** 等待当前工作区加载完成 */
  whenLoaded: () => Promise<void>
}

export const ASSISTANT_WORKSPACE: InjectionKey<AssistantWorkspace> = Symbol('assistantWorkspace')

const HIGHLIGHT_DURATION = 2000

interface AiApi {
  ensureConversation(convId: string): Promise<boolean>
}

function aiApi(): AiApi {
  return window.bridge.getModules(['ai']).ai as unknown as AiApi
}

/**
 * 辅助面板的工作区：辅助会话 + 笔记。
 *
 * 工作区跟随当前主会话切换（FLOW-6）；面板关闭时不做任何数据清理（FR-1.7），
 * 只释放 chat service —— 每个 service 持有若干 IPC 订阅，不能一直挂着。
 */
export function useAssistantWorkspace(
  scopeId: Ref<string | null>,
  enabled: Ref<boolean>
): AssistantWorkspace {
  const conversations = useAssistantConversations()
  const notes = useAssistantNotes()
  const highlight = ref<HighlightTarget | null>(null)
  const ready = ref(false)

  let pending: Promise<void> = Promise.resolve()
  let highlightTimer: ReturnType<typeof setTimeout> | null = null

  async function loadScope(id: string) {
    ready.value = false
    try {
      await ensureScope(id)
      await Promise.all([conversations.load(id), notes.load(id)])
    } finally {
      ready.value = true
    }
  }

  /**
   * 工作区 scope 必须是主进程已知的会话。
   * 新建对话在发出首条消息之前只存在于渲染进程内存，主进程查不到，
   * 辅助会话和笔记就没有归属 —— 先把会话行落库。
   */
  async function ensureScope(id: string): Promise<void> {
    try {
      await aiApi().ensureConversation(id)
    } catch (err) {
      console.error('[assistant] 准备工作区失败', id, err)
    }
  }

  watch(
    [scopeId, enabled],
    ([id, on]) => {
      if (!on) {
        // 面板关闭：释放所有 chat service，避免 IPC 订阅一直挂着
        conversations.disposeAll()
        return
      }
      if (!id) return
      // 有未保存修改时不加载，等用户确认（保存/放弃）后由挂起的动作继续
      if (notes.hasUnsavedChanges()) {
        notes.requestSwitch(() => {
          pending = loadScope(id)
        })
        return
      }
      pending = loadScope(id)
    },
    { immediate: true }
  )

  function setHighlight(target: HighlightTarget | null) {
    highlight.value = target
    if (highlightTimer) {
      clearTimeout(highlightTimer)
      highlightTimer = null
    }
    if (target) {
      highlightTimer = setTimeout(() => {
        highlight.value = null
        highlightTimer = null
      }, HIGHLIGHT_DURATION)
    }
  }

  function whenLoaded() {
    return pending
  }

  // 第二个参数 true：无活动 effect scope 时不报警（测试里直接实例化 composable）
  onScopeDispose(() => {
    if (highlightTimer) {
      clearTimeout(highlightTimer)
      highlightTimer = null
    }
  }, true)

  return {
    scopeId,
    conversations,
    notes,
    highlight,
    setHighlight,
    ready,
    whenLoaded,
  }
}
