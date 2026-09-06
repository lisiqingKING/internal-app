/// <reference types="vite/client" />

declare module 'vue-virtual-scroller/dist/vue-virtual-scroller.esm' {
  import { DefineComponent } from 'vue'
  export const RecycleScroller: DefineComponent<any, any, any>
  export const DynamicScroller: DefineComponent<any, any, any>
  export const DynamicScrollerItem: DefineComponent<any, any, any>
}

declare global {
  const __DEV_PORT__: number
  interface Window {
    electronApis?: {
      ai?: import('./types/electron').ElectronAPIModule
      [key: string]: any
    }
    bridge: import('./types/electron').BridgeModule
    ipcRenderer: {
      invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
    }
  }
}

export {}
