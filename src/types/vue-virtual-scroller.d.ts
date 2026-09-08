declare module 'vue-virtual-scroller' {
  import { DefineComponent } from 'vue'
  export const DynamicScroller: DefineComponent<{
    items: unknown[]
    keyField: string
    minItemSize?: number
    buffer?: number
    prerender?: number
    emitResize?: boolean
  }>
  export const DynamicScrollerItem: DefineComponent<{
    item: unknown
    active?: boolean
    dataIndex?: number
    sizeDependencies?: unknown[]
    emitResize?: boolean
  }>
}
