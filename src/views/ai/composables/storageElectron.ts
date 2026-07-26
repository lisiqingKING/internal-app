import type { ChatSession } from '../types'

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
    console.log('[ElectronStorage] add:', title)
    const newSession = await window.electronApis?.ai?.create(title)
    cachedSessions.unshift(newSession)
    return newSession
  },

  update: async (convId, updates) => {
    console.log('[ElectronStorage] update:', convId, updates)
    const index = cachedSessions.findIndex(s => s.convId === convId)
    if (index !== -1) {
      cachedSessions[index] = { ...cachedSessions[index], ...updates }
    }
    // 深拷贝数据，移除 Vue 响应式包装
    const serializedUpdates = JSON.parse(JSON.stringify(updates))
    if (serializedUpdates.title !== undefined) {
      await window.electronApis?.ai?.updateTitle(convId, serializedUpdates.title)
    }
    if (serializedUpdates.messages !== undefined) {
      await window.electronApis?.ai?.updateMessages(convId, serializedUpdates.messages)
    }
  },

  delete: async (convId) => {
    console.log('[ElectronStorage] delete:', convId)
    cachedSessions = cachedSessions.filter(s => s.convId !== convId)
    await window.electronApis?.ai?.delete(convId)
  },

  updatePinned: async (convId, pinned) => {
    console.log('[ElectronStorage] updatePinned:', convId, pinned)
    const index = cachedSessions.findIndex(s => s.convId === convId)
    if (index !== -1) {
      cachedSessions[index].pinned = pinned
    }
    await window.electronApis?.ai?.updatePinned(convId, pinned)
  }
}

// 初始化 Electron 存储适配器（加载第一页）
export async function initElectronStorage(): Promise<void> {
  if (window.electronApis?.ai) {
    cachedSessions = await window.electronApis.ai.list({ limit: PAGE_SIZE, offset: 0 })
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
