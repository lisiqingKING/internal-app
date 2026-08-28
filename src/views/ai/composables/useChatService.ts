import { reactive } from 'vue'
import { aiConfig } from '../config'
import type { Message, ChatSession } from '../types'

// 从主进程获取当前激活的完整配置
async function getActiveProfile(): Promise<{
  apiUrl: string
  providerType: string
  model: string
  systemPrompt: string
}> {
  const ai = window.bridge.getModules(['ai']).ai
  const profile = await ai.getActiveProfile()
  if (!profile) {
    return {
      apiUrl: aiConfig.apiUrl,
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
export function createChatService(session: ChatSession) {
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

  // 监听主进程推送的流式事件
  function handleStream(payload: any) {
    if (payload.messageId !== currentMsgId) return
    if (payload.type === 'start') {
      // 流开始
    } else if (payload.type === 'chunk') {
      fullText += payload.content || ''
      fullReasoning += payload.reasoning || ''
      state.currentText = fullText
      state.currentReasoning = fullReasoning
    } else if (payload.type === 'complete') {
      // 写入响应
      const assistantMsg: Message = {
        msgId: createMsgId(),
        role: 'assistant',
        content: fullText,
        reasoning: fullReasoning || undefined
      }
      state.chatHistory.push(assistantMsg)
      session.updatedAt = Date.now()
      state.loading = false
      state.currentText = ''
      state.currentReasoning = ''
      state.abortController = null
    } else if (payload.type === 'halted' || payload.type === 'error') {
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
      state.error = payload.type === 'error' ? (payload.content || '请求失败') : null
      state.loading = false
      state.currentText = ''
      state.currentReasoning = ''
      state.abortController = null
    }
  }

  // 订阅流式事件
  ai.onStream(handleStream)

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

  // 发送消息
  async function sendMessage(content: string) {
    state.abortController = new AbortController()
    state.loading = true
    state.currentText = ''
    state.currentReasoning = ''
    fullText = ''
    fullReasoning = ''
    state.error = null

    // 添加用户消息
    const userMsg: Message = { msgId: createMsgId(), role: 'user', content }
    state.chatHistory.push(userMsg)

    // 从主进程获取当前激活配置的完整信息
    const { apiUrl, providerType, model, systemPrompt } = await getActiveProfile()

    // 准备 API 请求（深拷贝确保全是纯对象，IPC 序列化需要）
    const requestMessages = JSON.parse(JSON.stringify([
      { role: 'system', content: systemPrompt },
      ...state.chatHistory.slice(0, -1),
      { role: 'user', content }
    ]))

    try {
      const msgId = createMsgId()
      currentMsgId = msgId  // 在调用前就赋值，事件可能在 await 返回前就到了
      const result = await ai.chat({
        conversationId: String(session.convId),
        messageId: msgId,
        apiUrl,
        providerType,
        model,
        messages: requestMessages,
      }) as { messageId: string }
      currentMsgId = result.messageId
    } catch (err) {
      state.error = (err as Error).message || '请求失败，请检查网络或 API 配置'
      state.loading = false
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

  return {
    state,
    sendMessage,
    cancelRequest,
    clearError,
    syncFromSession,
    syncState
  }
}

export type ChatService = ReturnType<typeof createChatService>
