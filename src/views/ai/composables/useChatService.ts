import { reactive } from 'vue'
import { aiConfig, systemPrompt } from '../config'
import { useStream } from './useStream'
import type { Message, ChatSession } from '../types'

interface SessionState {
  chatHistory: Message[]
  currentText: string
  loading: boolean
  abortController: AbortController | null
}

// 为每个 session 创建独立的服务实例
export function createChatService(session: ChatSession) {
  const { parseSSE } = useStream()

  const state = reactive<SessionState>({
    chatHistory: [...session.messages],
    currentText: '',
    loading: false,
    abortController: null
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

    // 添加用户消息
    const userMsg: Message = { msgId: `msg-${Date.now()}`, role: 'user', content }
    state.chatHistory.push(userMsg)
    session.messages.push(userMsg)

    // 准备 API 请求
    const requestMessages = [
      { role: 'system', content: systemPrompt },
      ...session.messages.slice(0, -1),
      { role: 'user', content }
    ]

    let fullText = ''
    try {
      const response = await fetch(aiConfig.apiUrl, {
        method: 'POST',
        signal: abortController.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + aiConfig.apiKey
        },
        body: JSON.stringify({
          model: aiConfig.model,
          messages: requestMessages,
          stream: true
        })
      })

      for await (const data of parseSSE(response)) {
        const choice = data.choices?.[0]
        if (!choice) continue

        const content = choice.delta?.content || ''
        const reasoning = choice.delta?.reasoning_content || ''
        const text = content || reasoning

        if (text) {
          fullText += text
          state.currentText = fullText
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        // 取消请求时，保存已拿到的数据
        if (fullText) {
          syncState()
          const assistantMsg: Message = { msgId: `msg-${Date.now()}`, role: 'assistant', content: fullText }
          session.messages.push(assistantMsg)
          state.chatHistory.push(assistantMsg)
          state.currentText = ''
        }
        state.loading = false
        state.abortController = null
        return
      }
      throw err
    }

    // 写入响应
    syncState()
    const assistantMsg: Message = { msgId: `msg-${Date.now()}`, role: 'assistant', content: fullText }
    session.messages.push(assistantMsg)
    state.chatHistory.push(assistantMsg)
    session.updatedAt = Date.now()
    state.loading = false
    state.abortController = null
    state.currentText = ''
  }

  // 取消请求
  function cancelRequest() {
    if (state.abortController) {
      state.abortController.abort()
    }
  }

  // 更新 chatHistory（当切换回该 session 时调用）
  function syncFromSession() {
    state.chatHistory = [...session.messages]
  }

  return {
    state,
    sendMessage,
    cancelRequest,
    syncFromSession,
    syncState
  }
}

export type ChatService = ReturnType<typeof createChatService>
