import { ref } from 'vue'
import type { Message, ChatSession, Category } from '@/views/ai/types'
import {
  electronStorageAdapter,
  initElectronStorage,
  loadNextPage,
  PAGE_SIZE,
  getCachedCategories,
  createCategory,
  renameCategory,
  deleteCategory,
  deleteCategoryWithSessions,
  moveSession,
  addInCategory,
} from '../storage/storageElectron'

export { initElectronStorage }

export function useChatHistory() {
  const sessions = ref<ChatSession[]>([])
  const categories = ref<Category[]>([])
  const currentSessionId = ref<string | null>(null)
  const loadingMore = ref(false)
  const hasMore = ref(true)

  // 初始化加载数据
  async function init() {
    await initElectronStorage()
    const data = await electronStorageAdapter.readAll()
    sessions.value = data
    categories.value = getCachedCategories()
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

  // 创建新对话（不立即持久化，等发送第一条消息后再持久化）
  async function createSession(): Promise<ChatSession> {
    const now = Date.now()
    const session: ChatSession = {
      convId: `local-${now}-${Math.random().toString(36).slice(2, 8)}`,
      title: '新对话',
      messages: [],
      createdAt: now,
      updatedAt: now,
      pinned: 0,
      categoryId: null,
      persisted: false,
    }
    sessions.value.unshift(session)
    return session
  }

  // 在指定目录内创建新对话（立即持久化）
  async function createSessionInCategory(categoryId: string): Promise<ChatSession> {
    const now = Date.now()
    const session: ChatSession = {
      convId: `local-${now}-${Math.random().toString(36).slice(2, 8)}`,
      title: '新对话',
      messages: [],
      createdAt: now,
      updatedAt: now,
      pinned: 0,
      categoryId,
      persisted: false,
    }
    sessions.value.unshift(session)
    // 立即持久化到后端
    const persisted = await addInCategory('新对话', categoryId)
    const index = sessions.value.findIndex(s => s.convId === session.convId)
    if (index !== -1) {
      sessions.value[index] = { ...sessions.value[index], ...persisted, persisted: true }
    }
    return sessions.value[index]
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
      const session = sessions.value[index]
      sessions.value.splice(index, 1)
      if (currentSessionId.value === convId) {
        currentSessionId.value = sessions.value[0]?.convId || null
      }
      // 仅已持久化的会话才需要调用后端删除
      if (session.persisted) {
        await electronStorageAdapter.delete(convId)
      }
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

  // ============ 目录操作 ============

  // 创建目录
  async function addCategory(name: string): Promise<Category> {
    const category = await createCategory(name)
    categories.value.push(category)
    return category
  }

  // 重命名目录
  async function renameCategoryFn(id: string, name: string): Promise<void> {
    await renameCategory(id, name)
    const cat = categories.value.find(c => c.id === id)
    if (cat) {
      cat.name = name
    }
  }

  // 删除目录（仅删除目录）
  async function removeCategory(id: string): Promise<void> {
    await deleteCategory(id)
    categories.value = categories.value.filter(c => c.id !== id)
    // 更新会话的 categoryId
    sessions.value.forEach(s => {
      if (s.categoryId === id) {
        s.categoryId = null
      }
    })
  }

  // 删除目录及会话
  async function removeCategoryWithSessions(id: string): Promise<void> {
    await deleteCategoryWithSessions(id)
    categories.value = categories.value.filter(c => c.id !== id)
    sessions.value = sessions.value.filter(s => s.categoryId !== id)
  }

  // 将会话移动到目录
  async function moveSessionToCategory(convId: string, categoryId: string | null): Promise<void> {
    await moveSession(convId, categoryId)
    const session = sessions.value.find(s => s.convId === convId)
    if (session) {
      session.categoryId = categoryId
    }
  }

  return {
    sessions,
    categories,
    currentSessionId,
    loadingMore,
    hasMore,
    init,
    loadMore,
    createSession,
    createSessionInCategory,
    getCurrentSession,
    switchSession,
    deleteSession,
    updateCurrentMessages,
    updateSessionTitle,
    togglePin,
    getCurrentMessages,
    addCategory,
    renameCategory: renameCategoryFn,
    removeCategory,
    removeCategoryWithSessions,
    moveSessionToCategory,
  }
}
