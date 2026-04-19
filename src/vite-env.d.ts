/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

interface ElectronAPIModule {
  list(): Promise<any[]>
  create(title: string): Promise<any>
  updateTitle(convId: string, title: string): Promise<void>
  updateMessages(convId: string, messages: any[]): Promise<void>
  delete(convId: string): Promise<void>
}

interface Window {
  electronApis: {
    ai?: ElectronAPIModule
    [key: string]: any
  }
}