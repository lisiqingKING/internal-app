import type { ChatSession } from '../types'

const STORAGE_KEY = 'ai-chat-sessions'

// 存储适配器接口 - CRUD 风格（异步）
export interface StorageAdapter {
  readAll(): Promise<ChatSession[]>
  add(title: string): Promise<ChatSession>
  update(convId: string, updates: Partial<ChatSession>): Promise<void>
  delete(convId: string): Promise<void>
}

// localStorage 适配器实现
export const localStorageAdapter: StorageAdapter = {
  readAll: async () => {
    try {
      const data = localStorage.getItem(STORAGE_KEY)
      return data ? JSON.parse(data) : []
    } catch {
      return []
    }
  },

  add: async (title): Promise<ChatSession> => {
    console.log('[Storage] add:', title)
    const session: ChatSession = {
      convId: `session-${Date.now()}`,
      title,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    const sessions = await localStorageAdapter.readAll()
    sessions.unshift(session)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
    return session
  },

  update: async (convId, updates) => {
    console.log('[Storage] update:', convId, updates)
    const sessions = await localStorageAdapter.readAll()
    const index = sessions.findIndex(s => s.convId === convId)
    if (index !== -1) {
      sessions[index] = { ...sessions[index], ...updates }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
    }
  },

  delete: async (convId) => {
    console.log('[Storage] delete:', convId)
    const sessions = await localStorageAdapter.readAll()
    const filtered = sessions.filter(s => s.convId !== convId)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
  }
}



// 当前使用的适配器
let currentAdapter: StorageAdapter = localStorageAdapter

// 注入自定义存储适配器
export function setStorageAdapter(adapter: StorageAdapter) {
  currentAdapter = adapter
}

// 获取当前适配器
export function getStorageAdapter(): StorageAdapter {
  return currentAdapter
}
