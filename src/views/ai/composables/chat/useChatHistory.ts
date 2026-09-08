import { ref } from 'vue'
import type { Message, ChatSession } from '@/views/ai/types'
import { electronStorageAdapter, initElectronStorage, loadNextPage, PAGE_SIZE } from '../storage/storageElectron'

export { initElectronStorage }

export function useChatHistory() {
  const sessions = ref<ChatSession[]>([])
  const currentSessionId = ref<string | null>(null)
  const loadingMore = ref(false)
  const hasMore = ref(true)

  // 初始化加载数据
  async function init() {
    await initElectronStorage()
    const data = await electronStorageAdapter.readAll()
    sessions.value = data
    currentSessionId.value = null
    hasMore.value = data.length >= PAGE_SIZE
  }

  // 加载更多会话
  async function loadMore() {
    if (loadingMore.value || !hasMore.value) return
    loadingMore.value = true
    const moreSessions = await loadNextPage()
    sessions.value.push(...moreSessions)
    hasMore.value = moreSessions.length >= PAGE_SIZE
    loadingMore.value = false
  }

  // 创建新对话
  async function createSession(): Promise<ChatSession> {
    const title = '新对话'
    const session = await electronStorageAdapter.add(title)
    sessions.value.unshift(session)
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

  // 置顶/取消置顶
  async function togglePin(convId: string) {
    const session = sessions.value.find(s => s.convId === convId)
    if (session) {
      const newPinned = session.pinned ? 0 : 1
      session.pinned = newPinned
      await electronStorageAdapter.updatePinned(convId, newPinned)
      // 重新排序：置顶优先
      sessions.value.sort((a, b) => {
        if (a.pinned !== b.pinned) return (b.pinned || 0) - (a.pinned || 0)
        return b.updatedAt - a.updatedAt
      })
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
    loadingMore,
    hasMore,
    init,
    loadMore,
    createSession,
    getCurrentSession,
    switchSession,
    deleteSession,
    updateCurrentMessages,
    updateSessionTitle,
    togglePin,
    getCurrentMessages
  }
}
