import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { Message, ChatSession, Category } from '@/views/ai/types'
import { PINNED_CATEGORY_ID } from '@/views/ai/types'
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
  reorderCategories,
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
      if (session.categoryId === PINNED_CATEGORY_ID) {
        // 取消置顶，迁回原分组
        const prevCat = session.previousCategoryId
        const targetCat = prevCat && categories.value.some(c => c.id === prevCat) ? prevCat : null
        await moveSessionToCategory(convId, targetCat)
      } else {
        // 置顶
        await moveSessionToCategory(convId, PINNED_CATEGORY_ID, session.categoryId)
      }
    }
  }

  // 获取当前对话的消息
  function getCurrentMessages(): Message[] {
    const session = getCurrentSession()
    return session ? session.messages : []
  }

  // ============ 目录操作 ============
  const pendingCategoryNames = new Set<string>()

  // 创建目录
  async function addCategory(name: string): Promise<Category> {
    if (pendingCategoryNames.has(name)) {
      while (pendingCategoryNames.has(name)) {
        await new Promise(resolve => setTimeout(resolve, 10))
      }
      return categories.value.find(c => c.name === name)!
    }
    const existing = categories.value.find(c => c.name === name)
    if (existing) return existing
    pendingCategoryNames.add(name)
    try {
      const cat = await createCategory(name)
      categories.value.push(cat)
      return cat
    } finally {
      pendingCategoryNames.delete(name)
    }
  }

  // 重命名目录
  async function renameCategoryFn(id: string, name: string): Promise<void> {
    await renameCategory(id, name)
    const idx = categories.value.findIndex(c => c.id === id)
    if (idx !== -1) {
      categories.value[idx] = { ...categories.value[idx], name }
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

  // 将会话移动到目录（乐观更新）
  async function moveSessionToCategory(convId: string, categoryId: string | null, previousCategoryId?: string | null): Promise<void> {
    const index = sessions.value.findIndex(s => s.convId === convId)
    if (index === -1) return

    // 先乐观更新本地
    const oldSession = sessions.value[index]
    const updated = { ...oldSession, categoryId, previousCategoryId }
    sessions.value = [
      ...sessions.value.slice(0, index),
      updated,
      ...sessions.value.slice(index + 1),
    ]

    try {
      await moveSession(convId, categoryId)
    } catch (e) {
      // 回滚
      sessions.value = [
        ...sessions.value.slice(0, index),
        oldSession,
        ...sessions.value.slice(index + 1),
      ]
      ElMessage.error('操作失败，请重试')
    }
  }

  async function reorderCategoriesFn(orderedIds: string[]): Promise<void> {
    // 先乐观更新本地
    const oldCategories = [...categories.value]
    const newCategories = orderedIds
      .map(id => categories.value.find(c => c.id === id))
      .filter(Boolean) as Category[]
    categories.value = newCategories.map((cat, i) => ({ ...cat, ord: i }))

    try {
      await reorderCategories(orderedIds)
    } catch (e) {
      // 回滚
      categories.value = oldCategories
      ElMessage.error('分组排序失败，请重试')
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
    reorderCategories: reorderCategoriesFn,
    moveSessionToCategory,
  }
}
