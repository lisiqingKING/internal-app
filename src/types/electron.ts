export interface ElectronAPIModule {
  list(options?: { limit?: number; offset?: number }): Promise<any[]>
  create(title: string): Promise<any>
  updateTitle(convId: string, title: string): Promise<void>
  updateMessages(convId: string, messages: any[]): Promise<void>
  delete(convId: string): Promise<void>
  getModel(): Promise<string>
  updatePinned(convId: string, pinned: number): Promise<void>
  saveFile(content: string, filename: string): Promise<string>
  openSaveDir(): Promise<boolean>
  listSaveFiles(): Promise<{ filename: string; createdAt: number; size: number }[]>
  readSaveFile(filename: string): Promise<string | null>
  deleteSaveFile(filename: string): Promise<boolean>
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
  getModules(names?: string[]): Record<string, Record<string, Function>>
  getModuleNames(): string[]
  getUtils(): {
    getInternalIconFromUrl: (url: string) => string | null
  }
  on(channel: string, listener: (event: any, ...args: any[]) => void): void
  off(channel: string, listener: (...args: any[]) => void): void
}
