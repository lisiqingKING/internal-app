import { computed, nextTick, provide, type ComputedRef, type Ref } from 'vue'
import { ASSISTANT_PANEL, useAssistantPanel, type AssistantPanelState } from './useAssistantPanel'
import {
  ASSISTANT_WORKSPACE,
  useAssistantWorkspace,
  type AssistantWorkspace,
} from './useAssistantWorkspace'
import type { SearchNavigateTarget } from './useAssistantSearch'

export interface AssistantIntegrationOptions {
  /** 当前主会话 id：辅助面板的工作区作用域 */
  currentSessionId: Ref<string | null>
  /** 切换主会话（调用方自行处理配置检查与滚动） */
  switchSession: (convId: string) => Promise<void>
  /** 打开面板前的额外动作（如收起灵感面板） */
  onOpen?: () => void
}

export interface AssistantIntegration {
  panel: AssistantPanelState
  workspace: AssistantWorkspace
  visible: Ref<boolean>
  fullscreen: Ref<boolean>
  /** 打开 / 关闭辅助面板；关闭时若笔记有未保存修改则挂起 */
  toggleAssistant: () => void
  /** 关闭搜索浮层 */
  closeSearch: () => void
  /** 搜索结果跳转：切主会话 → 打开工作区 → 定位并高亮 */
  navigateFromSearch: (target: SearchNavigateTarget) => void
  /** 主聊天区需要高亮的消息（辅助会话的消息由面板自己高亮） */
  mainHighlightMsgId: ComputedRef<string | null>
  /** 切换工作区前检查未保存修改；有则挂起切换，由行内确认条继续 */
  guardScopeChange: (action: () => void) => boolean
}

/**
 * 辅助面板与聊天页的集成层：面板状态、工作区、搜索跳转、未保存修改守卫。
 *
 * 面板与工作区都是 provide/inject 的，注入点必须与组件树一致，
 * 所以这个 composable 只能在 setup 期间调用。
 */
export function useAssistantIntegration(
  options: AssistantIntegrationOptions
): AssistantIntegration {
  const panel = useAssistantPanel()
  provide(ASSISTANT_PANEL, panel)

  const workspace = useAssistantWorkspace(options.currentSessionId, panel.visible)
  provide(ASSISTANT_WORKSPACE, workspace)

  // 关闭面板前检查笔记是否有未保存修改（FR-4.6）
  panel.setCloseGuard(() => workspace.notes.requestSwitch(() => panel.close()))

  function toggleAssistant() {
    if (panel.visible.value) {
      panel.requestClose()
      return
    }
    options.onOpen?.()
    panel.toggle()
  }

  /** 切换工作区前检查未保存修改；有则挂起切换，由行内确认条继续（FLOW-5 / FLOW-6） */
  function guardScopeChange(action: () => void): boolean {
    const executed = workspace.notes.requestSwitch(action)
    if (!executed && !panel.visible.value) {
      // 面板关闭时也要让用户看到确认条
      panel.toggle()
    }
    return executed
  }

  // ===== 搜索（FR-5 / FLOW-7） =====

  function closeSearch() {
    panel.searchOpen.value = false
  }

  async function performNavigate(target: SearchNavigateTarget) {
    try {
      await options.switchSession(target.scopeId)
      await nextTick()
      await workspace.whenLoaded()
      await nextTick()

      if (target.type === 'note' && target.noteId) {
        workspace.notes.select(target.noteId)
        workspace.setHighlight({ type: 'note', id: target.noteId })
        return
      }

      if (target.type === 'message' && target.msgId) {
        // 辅助会话里的消息：先切到那个辅助会话
        if (target.convId && target.convId !== target.scopeId) {
          await workspace.conversations.activate(target.convId)
        }
        workspace.setHighlight({
          type: 'message',
          id: target.msgId,
          convId: target.convId,
        })
      }
    } catch (err) {
      console.error('[assistant] 搜索跳转失败', err)
    }
  }

  /** 点击搜索结果：切主会话 → 打开工作区 → 定位并高亮 */
  function navigateFromSearch(target: SearchNavigateTarget) {
    closeSearch()
    workspace.notes.requestSwitch(() => void performNavigate(target))
  }

  const mainHighlightMsgId = computed(() => {
    const target = workspace.highlight.value
    if (!target || target.type !== 'message') return null
    if (!target.convId || target.convId !== options.currentSessionId.value) return null
    return target.id
  })

  return {
    panel,
    workspace,
    visible: panel.visible,
    fullscreen: panel.fullscreen,
    toggleAssistant,
    closeSearch,
    navigateFromSearch,
    mainHighlightMsgId,
    guardScopeChange,
  }
}
