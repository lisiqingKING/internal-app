/// <reference types="vite/client" />

declare global {
  const __DEV_PORT__: number
  interface Window {
    electronApis?: {
      ai?: import('./types/electron').ElectronAPIModule
      [key: string]: any
    }
    bridge: import('./types/electron').BridgeModule
  }
}

export {}
