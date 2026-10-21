import { ref, type InjectionKey, type Ref } from 'vue'

export type AssistantLayout = 'horizontal' | 'vertical'

export const MIN_PANEL_WIDTH = 400
export const MAX_PANEL_RATIO = 0.7
export const DEFAULT_PANEL_WIDTH = 520
export const MIN_SPLIT_RATIO = 0.2
export const MAX_SPLIT_RATIO = 0.8

const KEY_WIDTH = 'assistant.panelWidth'
const KEY_LAYOUT = 'assistant.panelLayout'
const KEY_FULLSCREEN = 'assistant.panelFullscreen'

export interface AssistantPanelState {
  visible: Ref<boolean>
  fullscreen: Ref<boolean>
  layout: Ref<AssistantLayout>
  width: Ref<number>
  splitRatio: Ref<number>
  searchOpen: Ref<boolean>
  /** 关闭前的守卫：返回 false 表示阻止关闭（例如笔记有未保存修改） */
  closeGuard: Ref<(() => boolean) | null>
  loadFromSettings: () => Promise<void>
  saveWidth: () => Promise<void>
  setCloseGuard: (guard: (() => boolean) | null) => void
  toggle: () => void
  close: () => void
  requestClose: () => void
  toggleLayout: () => void
  toggleFullscreen: () => void
  toggleSearch: () => void
}

export const ASSISTANT_PANEL: InjectionKey<AssistantPanelState> = Symbol('assistantPanel')

function settingsApi() {
  return window.bridge.getModules(['settings']).settings as unknown as {
    get(key: string): Promise<string | null>
    set(key: string, value: string): Promise<unknown>
  }
}

/** 面板宽度上限：视口的 70%；视口过窄（70% < 400px）时取 400px */
export function maxPanelWidth(): number {
  return Math.max(MIN_PANEL_WIDTH, Math.floor(window.innerWidth * MAX_PANEL_RATIO))
}

/** 把宽度钳制到 [400px, 上限] */
export function clampPanelWidth(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_PANEL_WIDTH
  return Math.min(maxPanelWidth(), Math.max(MIN_PANEL_WIDTH, Math.round(value)))
}

/** 把内部分栏比例钳制，避免任一区域被压到不可用 */
export function clampSplitRatio(value: number): number {
  if (!Number.isFinite(value)) return 0.6
  return Math.min(MAX_SPLIT_RATIO, Math.max(MIN_SPLIT_RATIO, value))
}

export function useAssistantPanel(): AssistantPanelState {
  const visible = ref(false)
  const fullscreen = ref(false)
  const layout = ref<AssistantLayout>('horizontal')
  const width = ref(DEFAULT_PANEL_WIDTH)
  const splitRatio = ref(0.6)
  const searchOpen = ref(false)
  const closeGuard = ref<(() => boolean) | null>(null)

  async function loadFromSettings() {
    const settings = settingsApi()
    const [savedWidth, savedLayout, savedFullscreen] = await Promise.all([
      settings.get(KEY_WIDTH),
      settings.get(KEY_LAYOUT),
      settings.get(KEY_FULLSCREEN),
    ])
    if (savedWidth) width.value = clampPanelWidth(Number(savedWidth))
    if (savedLayout === 'horizontal' || savedLayout === 'vertical') layout.value = savedLayout
    fullscreen.value = savedFullscreen === 'true'
  }

  async function saveWidth() {
    await settingsApi().set(KEY_WIDTH, String(width.value))
  }

  async function saveLayout() {
    await settingsApi().set(KEY_LAYOUT, layout.value)
  }

  async function saveFullscreen() {
    await settingsApi().set(KEY_FULLSCREEN, String(fullscreen.value))
  }

  function toggle() {
    visible.value = !visible.value
    if (!visible.value) searchOpen.value = false
  }

  function close() {
    visible.value = false
    searchOpen.value = false
  }

  function setCloseGuard(guard: (() => boolean) | null) {
    closeGuard.value = guard
  }

  /** 关闭面板前先过守卫；守卫返回 false 表示被拦截 */
  function requestClose() {
    if (closeGuard.value?.() === false) return
    close()
  }

  function toggleLayout() {
    layout.value = layout.value === 'horizontal' ? 'vertical' : 'horizontal'
    void saveLayout()
  }

  function toggleFullscreen() {
    fullscreen.value = !fullscreen.value
    void saveFullscreen()
  }

  function toggleSearch() {
    searchOpen.value = !searchOpen.value
  }

  return {
    visible,
    fullscreen,
    layout,
    width,
    splitRatio,
    searchOpen,
    closeGuard,
    loadFromSettings,
    saveWidth,
    setCloseGuard,
    toggle,
    close,
    requestClose,
    toggleLayout,
    toggleFullscreen,
    toggleSearch,
  }
}
