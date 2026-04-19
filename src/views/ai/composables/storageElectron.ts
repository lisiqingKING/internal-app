import type { ChatSession } from '../types'

// 存储适配器接口 - CRUD 风格（异步）
export interface StorageAdapter {
  readAll(): Promise<ChatSession[]>
  add(title: string): Promise<ChatSession>
  update(convId: string, updates: Partial<ChatSession>): Promise<void>
  delete(convId: string): Promise<void>
}

// Electron 适配器实现
let cachedSessions: ChatSession[] = []

export const electronStorageAdapter: StorageAdapter = {
  readAll: async () => {
    return [...cachedSessions]
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
  }
}

// 初始化 Electron 存储适配器
export async function initElectronStorage(): Promise<void> {
  if (window.electronApis?.ai) {
    cachedSessions = await window.electronApis.ai.list()
  }
}

// 获取缓存数据
export function getCachedSessions(): ChatSession[] {
  return cachedSessions
}
