/// <reference types="vite/client" />

declare const __DEV_PORT__: number

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

interface ElectronAPIModule {
  list(options?: { limit?: number; offset?: number }): Promise<any[]>
  create(title: string): Promise<any>
  updateTitle(convId: string, title: string): Promise<void>
  updateMessages(convId: string, messages: any[]): Promise<void>
  delete(convId: string): Promise<void>
  getModel(): Promise<string>
  updatePinned(convId: string, pinned: number): Promise<void>
  saveFile(content: string, filename: string): Promise<string>
}

interface Window {
  electronApis: {
    ai?: ElectronAPIModule
    [key: string]: any
  }
  bridge: {
    getModules(names: string[]): Record<string, Record<string, Function>>
    on(channel: string, listener: (event: any, ...args: any[]) => void): void
    off(channel: string, listener: (...args: any[]) => void): void
  }
}