import type { ChatSession, Category } from '@/views/ai/types'

export const PAGE_SIZE = 10

// 存储适配器接口 - CRUD 风格（异步）
export interface StorageAdapter {
  readAll(): Promise<ChatSession[]>
  loadPage(limit: number, offset: number): Promise<ChatSession[]>
  add(title: string): Promise<ChatSession>
  update(convId: string, updates: Partial<ChatSession>): Promise<void>
  delete(convId: string): Promise<void>
  updatePinned(convId: string, pinned: number): Promise<void>
}

// Electron 适配器实现
let cachedSessions: ChatSession[] = []
let cachedCategories: Category[] = []

export const electronStorageAdapter: StorageAdapter = {
  readAll: async () => {
    return [...cachedSessions]
  },

  loadPage: async (limit, offset) => {
    if (window.electronApis?.ai) {
      const page = await window.electronApis.ai.list({ limit, offset })
      cachedSessions.push(...page)
      return page
    }
    return []
  },

  add: async (title): Promise<ChatSession> => {
    const newSession = await window.electronApis?.ai?.create(title)
    cachedSessions.unshift(newSession)
    return newSession
  },

  update: async (convId, updates) => {
    const index = cachedSessions.findIndex(s => s.convId === convId)
    if (index !== -1) {
      cachedSessions[index] = { ...cachedSessions[index], ...updates }
    }
    const serializedUpdates = JSON.parse(JSON.stringify(updates))
    if (serializedUpdates.title !== undefined) {
      await window.electronApis?.ai?.updateTitle(convId, serializedUpdates.title)
    }
  },

  delete: async (convId) => {
    cachedSessions = cachedSessions.filter(s => s.convId !== convId)
    await window.electronApis?.ai?.delete(convId)
  },

  updatePinned: async (convId, pinned) => {
    const index = cachedSessions.findIndex(s => s.convId === convId)
    if (index !== -1) {
      cachedSessions[index].pinned = pinned
    }
    await window.electronApis?.ai?.updatePinned(convId, pinned)
  }
}

// 初始化 Electron 存储适配器（加载第一页 + 目录列表）
export async function initElectronStorage(): Promise<void> {
  if (window.electronApis?.ai) {
    cachedSessions = await window.electronApis.ai.list({ limit: PAGE_SIZE, offset: 0 })
    cachedCategories = await window.electronApis.ai.listCategories()
  }
}

// 加载下一页
export async function loadNextPage(): Promise<ChatSession[]> {
  return electronStorageAdapter.loadPage(PAGE_SIZE, cachedSessions.length)
}

// 检查是否还有更多数据（不修改缓存）
export async function hasMoreSessions(): Promise<boolean> {
  if (!window.electronApis?.ai) return false
  const page = await window.electronApis.ai.list({ limit: 1, offset: cachedSessions.length })
  return page.length > 0
}

// 获取缓存数据
export function getCachedSessions(): ChatSession[] {
  return cachedSessions
}

// ============ Category（目录）操作 ============

export function getCachedCategories(): Category[] {
  return cachedCategories
}

export async function createCategory(name: string): Promise<Category> {
  const category = await window.electronApis?.ai?.createCategory(name)
  cachedCategories.push(category)
  return category
}

export async function renameCategory(id: string, name: string): Promise<void> {
  await window.electronApis?.ai?.renameCategory(id, name)
  const cat = cachedCategories.find(c => c.id === id)
  if (cat) {
    cat.name = name
  }
}

export async function deleteCategory(id: string): Promise<void> {
  await window.electronApis?.ai?.deleteCategory(id)
  cachedCategories = cachedCategories.filter(c => c.id !== id)
  // 将会话迁移到默认分组
  cachedSessions.forEach(s => {
    if (s.categoryId === id) {
      s.categoryId = null
    }
  })
}

export async function deleteCategoryWithSessions(id: string): Promise<void> {
  await window.electronApis?.ai?.deleteCategoryWithSessions(id)
  cachedCategories = cachedCategories.filter(c => c.id !== id)
  cachedSessions = cachedSessions.filter(s => s.categoryId !== id)
}

export async function moveSession(convId: string, categoryId: string | null): Promise<void> {
  await window.electronApis?.ai?.moveSession(convId, categoryId)
  const session = cachedSessions.find(s => s.convId === convId)
  if (session) {
    session.categoryId = categoryId
  }
}

export async function addInCategory(title: string, categoryId: string): Promise<ChatSession> {
  const newSession = await window.electronApis?.ai?.create(title, categoryId)
  if (!newSession) throw new Error('Failed to create session in category')
  cachedSessions.unshift(newSession)
  return newSession
}
