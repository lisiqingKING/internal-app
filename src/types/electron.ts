/** 会话目录（分组） */
export interface ElectronCategory {
  id: string
  name: string
  ord: number
}

export interface ElectronAPIModule {
  list(options?: { limit?: number; offset?: number }): Promise<any[]>
  create(title: string, categoryId?: string | null): Promise<any>
  updateTitle(convId: string, title: string): Promise<void>
  updateMessages(convId: string, messages: any[]): Promise<void>
  delete(convId: string): Promise<void>
  getModel(): Promise<string>
  updatePinned(convId: string, pinned: number): Promise<void>
  /** 会话落库（幂等），返回是否新建 */
  ensureConversation(convId: string): Promise<boolean>
  saveFile(content: string, filename: string): Promise<string>
  openSaveDir(): Promise<boolean>
  listSaveFiles(): Promise<{ filename: string; createdAt: number; size: number }[]>
  readSaveFile(filename: string): Promise<string | null>
  deleteSaveFile(filename: string): Promise<boolean>
  // 目录（分组）CRUD
  listCategories(): Promise<ElectronCategory[]>
  createCategory(name: string): Promise<ElectronCategory>
  renameCategory(id: string, name: string): Promise<boolean>
  deleteCategory(id: string): Promise<boolean>
  deleteCategoryWithSessions(id: string): Promise<boolean>
  reorderCategories(orderedIds: string[]): Promise<boolean>
  moveSession(convId: string, categoryId: string | null): Promise<boolean>
}

export interface ElectronTabsModule {
  create(options: { title: string; url: string; isHome?: boolean }, afterTabId?: string): Promise<string>
  createDefault(afterTabId?: string): Promise<string>
  createHome(): Promise<string>
  createHistory(afterTabId?: string): Promise<string>
  createDownloads(afterTabId?: string): Promise<string>
  createSettings(afterTabId?: string): Promise<string>
  createAI(afterTabId?: string): Promise<string>
  createLogs(afterTabId?: string): Promise<string>
  createAiSaves(afterTabId?: string): Promise<string>
  list(): Promise<any[]>
  switch(tabId: string): Promise<boolean>
  close(tabId: string): Promise<string | null>
  refresh(): void
  updateUrl(url: string): void
  openDevTools(): void
}

export interface BridgeModule {
  windowId: number | null
  getModules(names?: string[]): Record<string, Record<string, Function>>
  getModuleNames(): string[]
  getUtils(): {
    getInternalIconFromUrl: (url: string) => string | null
  }
  /** channel 常量表：bridge.channels.<模块>.<事件名> */
  channels: Record<string, Record<string, string>>
  /** 订阅事件，返回取消订阅的函数 */
  on(channel: string, listener: (event: any, ...args: any[]) => void): () => void
  off(channel: string, listener: (...args: any[]) => void): void
}
