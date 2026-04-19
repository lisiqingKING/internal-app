import { ref, watch } from 'vue'
import type { Message, ChatSession } from '../types'
import { electronStorageAdapter, initElectronStorage } from './storageElectron'

export { initElectronStorage }

export function useChatHistory() {
  const sessions = ref<ChatSession[]>([])
  const currentSessionId = ref<string | null>(null)

  // 监听 sessions 变化
  watch(sessions, (newVal, oldVal) => {
    console.log('[useChatHistory] sessions changed:', { oldLength: oldVal?.length, newLength: newVal.length })
  }, { deep: true })

  // 初始化加载数据
  async function init() {
    await initElectronStorage()
    const data = await electronStorageAdapter.readAll()
    sessions.value = data
    currentSessionId.value = null
  }

  // 创建新对话
  async function createSession(): Promise<ChatSession> {
    console.log('[useChatHistory] createSession called, sessions.value.length before:', sessions.value.length)
    const title = '新对话'
    const session = await electronStorageAdapter.add(title)
    console.log('[useChatHistory] createSession result:', session)
    console.log('[useChatHistory] sessions.value.length before unshift:', sessions.value.length)
    sessions.value.unshift(session)
    console.log('[useChatHistory] sessions.value.length after unshift:', sessions.value.length)
    currentSessionId.value = session.convId
    return session
  }

  // 获取当前对话
  function getCurrentSession(): ChatSession | null {
    if (!currentSessionId.value) return null
    return sessions.value.find(s => s.convId === currentSessionId.value) || null
  }

  // 切换对话
  function switchSession(convId: string) {
    currentSessionId.value = convId
  }

  // 删除对话
  async function deleteSession(convId: string) {
    const index = sessions.value.findIndex(s => s.convId === convId)
    if (index !== -1) {
      sessions.value.splice(index, 1)
      if (currentSessionId.value === convId) {
        currentSessionId.value = sessions.value[0]?.convId || null
      }
      await electronStorageAdapter.delete(convId)
    }
  }

  // 更新当前对话的消息
  async function updateCurrentMessages(messages: Message[]) {
    const session = getCurrentSession()
    if (session) {
      session.messages = messages
      session.updatedAt = Date.now()
      if (session.title === '新对话' && messages.length > 0) {
        const firstUserMsg = messages.find(m => m.role === 'user')
        if (firstUserMsg) {
          session.title = firstUserMsg.content.slice(0, 20) + (firstUserMsg.content.length > 20 ? '...' : '')
        }
      }
      await electronStorageAdapter.update(session.convId, {
        messages: session.messages,
        title: session.title,
        updatedAt: session.updatedAt
      })
    }
  }

  // 更新 session 标题
  async function updateSessionTitle(convId: string, title: string) {
    const session = sessions.value.find(s => s.convId === convId)
    if (session) {
      session.title = title
      await electronStorageAdapter.update(convId, { title })
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
    init,
    createSession,
    getCurrentSession,
    switchSession,
    deleteSession,
    updateCurrentMessages,
    updateSessionTitle,
    getCurrentMessages
  }
}
