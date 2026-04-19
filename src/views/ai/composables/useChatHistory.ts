import { ref, watch } from 'vue'
import type { Message, ChatSession } from '../types'

// 从 localStorage 加载历史
function loadSessions(): ChatSession[] {
  try {
    const data = localStorage.getItem('ai-chat-sessions')
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

// 保存到 localStorage
function saveSessions(sessions: ChatSession[]) {
  localStorage.setItem('ai-chat-sessions', JSON.stringify(sessions))
}

export function useChatHistory() {
  const storedSessions = loadSessions()
  const sessions = ref<ChatSession[]>(storedSessions)
  // 如果有历史会话，默认选中第一个（最新的）
  const currentSessionId = ref<string | null>(storedSessions[0]?.convId || null)

  // 监听变化自动保存
  watch(sessions, (newSessions) => {
    saveSessions(newSessions)
  }, { deep: true })

  // 创建新对话
  function createSession(): ChatSession {
    const session: ChatSession = {
      convId: `session-${Date.now()}`,
      title: '新对话',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    sessions.value.unshift(session)
    currentSessionId.value = session.convId
    return session
  }

  // 获取当前对话
  function getCurrentSession(): ChatSession | null {
    if (!currentSessionId.value) return null
    return sessions.value.find(s => s.convId === currentSessionId.value) || null
  }

  // 切换对话
  function switchSession(id: string) {
    currentSessionId.value = id
  }

  // 删除对话
  function deleteSession(id: string) {
    const index = sessions.value.findIndex(s => s.convId === id)
    if (index !== -1) {
      sessions.value.splice(index, 1)
      if (currentSessionId.value === id) {
        currentSessionId.value = sessions.value[0]?.convId || null
      }
    }
  }

  // 更新当前对话的消息
  function updateCurrentMessages(messages: Message[]) {
    const session = getCurrentSession()
    if (session) {
      session.messages = messages
      session.updatedAt = Date.now()
      // 如果还没有标题，用第一条用户消息作为标题
      if (session.title === '新对话' && messages.length > 0) {
        const firstUserMsg = messages.find(m => m.role === 'user')
        if (firstUserMsg) {
          session.title = firstUserMsg.content.slice(0, 20) + (firstUserMsg.content.length > 20 ? '...' : '')
        }
      }
    }
  }

  // 获取当前对话的消息
  function getCurrentMessages(): Message[] {
    const session = getCurrentSession()
    return session ? session.messages : []
  }

  return {
    sessions,
    currentSessionId,
    createSession,
    getCurrentSession,
    switchSession,
    deleteSession,
    updateCurrentMessages,
    getCurrentMessages
  }
}