import { reactive } from 'vue'
import { aiConfig, systemPrompt } from '../config'
import { useStream } from './useStream'
import type { Message, ChatSession } from '../types'

// 从主进程获取最新 model 配置（带 fallback）
async function getModelFromSettings(): Promise<string> {
  try {
    const ai = window.bridge.getModules(['ai']).ai
    const model = await ai.getModel()
    return model || aiConfig.model
  } catch {
    return aiConfig.model
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
  const { parseSSE } = useStream()

  const state = reactive<SessionState>({
    chatHistory: [...session.messages],
    currentText: '',
    currentReasoning: '',
    loading: false,
    abortController: null,
    error: null
  })

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
    const abortController = new AbortController()
    state.abortController = abortController

    state.loading = true
    state.currentText = ''
    state.currentReasoning = ''

    // 添加用户消息
    const userMsg: Message = { msgId: createMsgId(), role: 'user', content }
    state.chatHistory.push(userMsg)

    // 从主进程获取最新 model
    const model = await getModelFromSettings()

    // 准备 API 请求
    const requestMessages = [
      { role: 'system', content: systemPrompt },
      ...state.chatHistory.slice(0, -1),
      { role: 'user', content }
    ]

    let fullText = ''
    let fullReasoning = ''
    try {
      const response = await fetch(aiConfig.apiUrl, {
        method: 'POST',
        signal: abortController.signal,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages: requestMessages,
          stream: true
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || `请求失败 (${response.status})`)
      }

      for await (const data of parseSSE(response)) {
        const choice = data.choices?.[0]
        if (!choice) continue

        const content = choice.delta?.content || ''
        const reasoning = choice.delta?.reasoning_content || ''

        if (content) {
          fullText += content
          state.currentText = fullText
        }
        if (reasoning) {
          fullReasoning += reasoning
          state.currentReasoning = fullReasoning
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        // 取消请求时，保存已拿到的数据
        if (fullText || fullReasoning) {
          const assistantMsg: Message = {
            msgId: createMsgId(),
            role: 'assistant',
            content: fullText,
            reasoning: fullReasoning || undefined
          }
          state.chatHistory.push(assistantMsg)
          syncState()
          state.currentText = ''
          state.currentReasoning = ''
        }
        state.loading = false
        state.abortController = null
        return
      }
      state.error = (err as Error).message || '请求失败，请检查网络或 API 配置'
      state.loading = false
      state.abortController = null
      state.currentText = ''
      return
    }

    // 写入响应
    const assistantMsg: Message = {
      msgId: createMsgId(),
      role: 'assistant',
      content: fullText,
      reasoning: fullReasoning || undefined
    }
    state.chatHistory.push(assistantMsg)
    syncState()
    session.updatedAt = Date.now()
    state.loading = false
    state.abortController = null
    state.currentText = ''
    state.currentReasoning = ''
  }

  // 取消请求
  function cancelRequest() {
    if (state.abortController) {
      state.abortController.abort()
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
