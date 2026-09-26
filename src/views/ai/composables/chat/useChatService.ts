import { reactive } from 'vue'
import { aiConfig } from '@/views/ai/config'
import type { Message, ChatSession } from '@/views/ai/types'

// 从主进程获取当前激活的完整配置
async function getActiveProfile(): Promise<{
  apiUrl: string
  apiKey: string
  providerType: string
  model: string
  systemPrompt: string
}> {
  const ai = window.bridge.getModules(['ai']).ai
  const profile = await ai.getActiveProfile()
  if (!profile) {
    return {
      apiUrl: aiConfig.apiUrl,
      apiKey: '',
      providerType: 'openai',
      model: aiConfig.model,
      systemPrompt: '',
    }
  }
  const ids = profile.systemPromptIds || []
  let systemPrompt = ''
  if (ids.length > 0) {
    const prompts = await ai.getSystemPromptsByIds(ids)
    const foundIds = prompts.map((p: any) => p.id)
    const missing = ids.filter((id: string) => !foundIds.includes(id))
    if (missing.length > 0) {
      console.warn(`[useChatService] prompts not found: ${missing.join(', ')}`)
    }
    systemPrompt = prompts.map((p: any) => p.content).join('\n\n')
  }
  return {
    apiUrl: profile.apiUrl || aiConfig.apiUrl,
    apiKey: profile.apiKey || '',
    providerType: profile.providerType || 'openai',
    model: profile.model || aiConfig.model,
    systemPrompt,
  }
}

// 生成唯一 msgId
function createMsgId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

interface SessionState {
  chatHistory: Message[]
  currentText: string
  currentReasoning: string
  loading: boolean
  abortController: AbortController | null
  error: string | null
}

// 为每个 session 创建独立的服务实例
// getCurrentConvId: 回调，用于判断当前是否为本 session
export function createChatService(
  session: ChatSession,
  getCurrentConvId: () => string | null
) {
  const state = reactive<SessionState>({
    chatHistory: [...session.messages],
    currentText: '',
    currentReasoning: '',
    loading: false,
    abortController: null,
    error: null
  })

  const ai = window.bridge.getModules(['ai']).ai
  let currentMsgId: string | null = null
  let fullText = ''
  let fullReasoning = ''

  // 同步状态到 session
  function syncState() {
    session.messages = [...state.chatHistory]
    session.updatedAt = Date.now()
    if (session.title === '新会话' && state.chatHistory.length > 0) {
      const firstUserMsg = state.chatHistory.find(m => m.role === 'user')
      if (firstUserMsg) {
        session.title = firstUserMsg.content.slice(0, 20) + (firstUserMsg.content.length > 20 ? '...' : '')
      }
    }
  }

  // 订阅流式事件（渲染进程只知道 onStart/onChunk/onComplete，不知道 ai:stream channel）
  function onStart(_messageId: string) {
    // 流开始
  }

  function onChunk(messageId: string, content: string, reasoning?: string) {
    if (messageId !== currentMsgId) return
    fullText += content
    fullReasoning += reasoning || ''
    state.currentText = fullText
    state.currentReasoning = fullReasoning
  }

  function onComplete(messageId: string) {
    if (messageId !== currentMsgId) return
    const assistantMsg: Message = {
      msgId: createMsgId(),
      role: 'assistant',
      content: fullText,
      reasoning: fullReasoning || undefined
    }
    state.chatHistory.push(assistantMsg)
    syncState()  // 同步到 session.messages（用于持久化）
    state.loading = false
    session.isLoading = false
    state.currentText = ''
    state.currentReasoning = ''
    state.abortController = null

    // 非当前会话标记有新消息
    if (getCurrentConvId() !== session.convId) {
      session.hasNewMessages = true
    }
  }

  function onHalted(messageId: string) {
    if (messageId !== currentMsgId) return
    commitPartial()
    state.loading = false
    session.isLoading = false
    state.currentText = ''
    state.currentReasoning = ''
    state.abortController = null
  }

  function onError(messageId: string) {
    if (messageId !== currentMsgId) return
    commitPartial()
    state.error = '请求失败'
    state.loading = false
    session.isLoading = false
    state.currentText = ''
    state.currentReasoning = ''
    state.abortController = null
  }

  function commitPartial() {
    if (fullText || fullReasoning) {
      const assistantMsg: Message = {
        msgId: createMsgId(),
        role: 'assistant',
        content: fullText,
        reasoning: fullReasoning || undefined
      }
      state.chatHistory.push(assistantMsg)
      syncState()
    }
  }

  const offStart = ai.onStart(onStart)
  const offChunk = ai.onChunk(onChunk)
  const offComplete = ai.onComplete(onComplete)
  const offHalted = ai.onHalted(onHalted)
  const offError = ai.onError(onError)

  // 发送消息
  async function sendMessage(content: string) {
    state.abortController = new AbortController()
    state.loading = true
    session.isLoading = true  // 同步到 session（供 sidebar 显示）
    state.currentText = ''
    state.currentReasoning = ''
    fullText = ''
    fullReasoning = ''
    state.error = null

    // 添加用户消息
    const userMsg: Message = { msgId: createMsgId(), role: 'user', content }
    state.chatHistory.push(userMsg)

    // 从主进程获取当前激活配置的完整信息
    const { apiUrl, apiKey, providerType, model, systemPrompt } = await getActiveProfile()

    // 准备 API 请求（深拷贝确保全是纯对象，IPC 序列化需要）
    const requestMessages = JSON.parse(JSON.stringify([
      { role: 'system', content: systemPrompt },
      ...state.chatHistory.slice(0, -1),
      { role: 'user', content }
    ]))

    try {
      const msgId = createMsgId()
      currentMsgId = msgId  // 在调用前就赋值，事件可能在 await 返回前就到了
      await ai.chat({
        conversationId: String(session.convId),
        messageId: msgId,
        apiUrl,
        apiKey,
        providerType,
        model,
        messages: requestMessages,
      })
    } catch (err) {
      state.error = (err as Error).message || '请求失败，请检查网络或 API 配置'
      state.loading = false
      session.isLoading = false
      state.abortController = null
      currentMsgId = null
    }
  }

  // 取消请求
  function cancelRequest() {
    if (currentMsgId) {
      ai.abort(currentMsgId)
    }
  }

  // 清除错误
  function clearError() {
    state.error = null
  }

  // 更新 chatHistory（当切换回该 session 时调用）
  function syncFromSession() {
    state.chatHistory = [...session.messages]
  }

  // 清理订阅
  function dispose() {
    offStart()
    offChunk()
    offComplete()
    offHalted()
    offError()
  }

  return {
    state,
    sendMessage,
    cancelRequest,
    clearError,
    syncFromSession,
    syncState,
    dispose,
  }
}

export type ChatService = ReturnType<typeof createChatService>
