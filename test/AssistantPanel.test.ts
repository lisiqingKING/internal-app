/**
 * 辅助面板容器 —— 组件层测试。
 *
 * 对应需求文档 docs/ASSISTANT_PANEL.md 的 FR-1（形态与尺寸）、FR-2（面板内布局）
 * 与 FLOW-10（尺寸与布局）。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import AssistantPanel from '../src/views/ai/components/assistant/AssistantPanel.vue'
import {
  ASSISTANT_PANEL,
  useAssistantPanel,
  clampPanelWidth,
  maxPanelWidth,
  MIN_PANEL_WIDTH,
  DEFAULT_PANEL_WIDTH,
} from '../src/views/ai/composables/assistant/useAssistantPanel'

const settingsStore: Record<string, string> = {}
const getSetting = vi.fn(async (key: string) => settingsStore[key] ?? null)
const setSetting = vi.fn(async (key: string, value: string) => {
  settingsStore[key] = value
  return true
})

let panel: ReturnType<typeof useAssistantPanel>

beforeEach(() => {
  for (const key of Object.keys(settingsStore)) delete settingsStore[key]
  getSetting.mockClear()
  setSetting.mockClear()
  panel = useAssistantPanel()
  ;(window as unknown as { bridge: unknown }).bridge = {
    getModules: () => ({ settings: { get: getSetting, set: setSetting } }),
  }
})

function mountPanel() {
  return mount(AssistantPanel, {
    global: { provide: { [ASSISTANT_PANEL as symbol]: panel } },
  })
}

function dragWindow(type: string, clientX: number, clientY = 0) {
  window.dispatchEvent(new MouseEvent(type, { clientX, clientY }))
}

describe('FR-1 面板形态与尺寸', () => {
  it('渲染区域开关与四个面板级操作入口', () => {
    const wrapper = mountPanel()

    expect(wrapper.find('.conv-region-btn').text()).toContain('对话')
    expect(wrapper.find('.notes-region-btn').text()).toContain('笔记')
    expect(wrapper.find('.layout-btn').exists()).toBe(true)
    expect(wrapper.find('.search-btn').exists()).toBe(true)
    expect(wrapper.find('.fullscreen-btn').exists()).toBe(true)
    expect(wrapper.find('.close-btn').exists()).toBe(true)
  })

  it('非全屏时按持久化宽度显示，全屏时占满', async () => {
    panel.width.value = 600
    const wrapper = mountPanel()
    expect(wrapper.find('.assistant-panel').attributes('style')).toContain('600px')

    panel.fullscreen.value = true
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.assistant-panel').attributes('style')).toContain('100%')
  })

  it('全屏时不渲染宽度拖拽条', async () => {
    const wrapper = mountPanel()
    expect(wrapper.find('.panel-resize-handle').exists()).toBe(true)

    panel.fullscreen.value = true
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.panel-resize-handle').exists()).toBe(false)
  })

  it('拖拽左边缘调整宽度，松开后持久化', async () => {
    const wrapper = mountPanel()

    await wrapper.find('.panel-resize-handle').trigger('mousedown', { clientX: 500 })
    dragWindow('mousemove', 400)
    await wrapper.vm.$nextTick()

    expect(panel.width.value).toBe(DEFAULT_PANEL_WIDTH + 100)

    dragWindow('mouseup', 400)
    await Promise.resolve()
    expect(setSetting).toHaveBeenCalledWith('assistant.panelWidth', String(DEFAULT_PANEL_WIDTH + 100))
  })

  it('宽度钳制在 [400px, 视口 70%]', () => {
    expect(clampPanelWidth(100)).toBe(MIN_PANEL_WIDTH)
    expect(clampPanelWidth(99999)).toBe(maxPanelWidth())
    expect(maxPanelWidth()).toBe(Math.floor(window.innerWidth * 0.7))
  })

  it('视口过窄导致 70% < 400px 时取两者较大值', () => {
    const original = window.innerWidth
    Object.defineProperty(window, 'innerWidth', { value: 300, configurable: true })

    expect(maxPanelWidth()).toBe(MIN_PANEL_WIDTH)
    expect(clampPanelWidth(500)).toBe(MIN_PANEL_WIDTH)

    Object.defineProperty(window, 'innerWidth', { value: original, configurable: true })
  })

  it('关闭面板只隐藏，不触发任何数据写入', async () => {
    panel.visible.value = true
    const wrapper = mountPanel()

    await wrapper.find('.close-btn').trigger('click')

    expect(panel.visible.value).toBe(false)
    expect(setSetting).not.toHaveBeenCalled()
  })
})

describe('FR-2 面板内布局', () => {
  it('默认左右分栏，切换后为上下分栏并持久化', async () => {
    const wrapper = mountPanel()
    expect(wrapper.find('.assistant-panel').classes()).toContain('layout-horizontal')

    await wrapper.find('.layout-btn').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.assistant-panel').classes()).toContain('layout-vertical')
    expect(setSetting).toHaveBeenCalledWith('assistant.panelLayout', 'vertical')
  })

  it('两个区域同时渲染（辅助会话区 + 笔记区）', () => {
    const wrapper = mountPanel()

    expect(wrapper.find('.region-main').exists()).toBe(true)
    expect(wrapper.find('.region-side').exists()).toBe(true)
    expect(wrapper.find('.split-handle').exists()).toBe(true)
  })

  it('内部分隔条可拖拽调整两区比例', async () => {
    const wrapper = mountPanel()
    const body = wrapper.find('.panel-body').element as HTMLElement
    Object.defineProperty(body, 'clientWidth', { value: 1000, configurable: true })

    await wrapper.find('.split-handle').trigger('mousedown', { clientX: 600 })
    dragWindow('mousemove', 700)
    await wrapper.vm.$nextTick()

    // 比例 = 0.55 + 100/1000
    expect(panel.splitRatio.value).toBeCloseTo(0.65, 5)
  })

  it('搜索入口切换搜索面板的显示', async () => {
    const wrapper = mountPanel()
    expect(wrapper.find('.search-overlay').exists()).toBe(false)

    await wrapper.find('.search-btn').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.search-overlay').exists()).toBe(true)
  })

  it('搜索浮层锚在内容区，不遮挡头部按钮', async () => {
    const wrapper = mountPanel()

    await wrapper.find('.search-btn').trigger('click')
    await wrapper.vm.$nextTick()

    // 浮层挂在 .panel-body 内部：布局/全屏/关闭始终可点
    expect(wrapper.find('.panel-body .search-overlay').exists()).toBe(true)
    expect(wrapper.find('.panel-header .search-overlay').exists()).toBe(false)
    expect(wrapper.find('.panel-header .close-btn').exists()).toBe(true)
  })
})

describe('FR-2.6 / FR-2.7 子区收起与展开', () => {
  /** 面板处于打开状态（useAssistantPanel 默认关闭） */
  function mountOpenPanel() {
    panel.visible.value = true
    return mountPanel()
  }

  it('标题栏有会话区与笔记区两个收起开关', () => {
    const wrapper = mountOpenPanel()

    expect(wrapper.find('.conv-region-btn').exists()).toBe(true)
    expect(wrapper.find('.notes-region-btn').exists()).toBe(true)
  })

  it('收起会话区后该区隐藏，笔记区仍在，面板不隐藏', async () => {
    const wrapper = mountOpenPanel()

    await wrapper.find('.conv-region-btn').trigger('click')

    expect(wrapper.find('.region-main').isVisible()).toBe(false)
    expect(wrapper.find('.region-side').isVisible()).toBe(true)
    expect(panel.visible.value).toBe(true)
  })

  it('收起笔记区后该区隐藏，会话区仍在', async () => {
    const wrapper = mountOpenPanel()

    await wrapper.find('.notes-region-btn').trigger('click')

    expect(wrapper.find('.region-side').isVisible()).toBe(false)
    expect(wrapper.find('.region-main').isVisible()).toBe(true)
    expect(panel.visible.value).toBe(true)
  })

  it('只剩一个区时隐藏内部分隔条', async () => {
    const wrapper = mountOpenPanel()

    await wrapper.find('.conv-region-btn').trigger('click')

    expect(wrapper.find('.split-handle').isVisible()).toBe(false)
  })

  it('两个子区都收起时整个面板隐藏', async () => {
    const wrapper = mountOpenPanel()

    await wrapper.find('.conv-region-btn').trigger('click')
    await wrapper.find('.notes-region-btn').trigger('click')

    expect(panel.conversationsCollapsed.value).toBe(true)
    expect(panel.notesCollapsed.value).toBe(true)
    expect(panel.visible.value).toBe(false)
  })

  it('重新打开面板时两个子区都展开', async () => {
    const wrapper = mountOpenPanel()
    await wrapper.find('.conv-region-btn').trigger('click')
    await wrapper.find('.notes-region-btn').trigger('click')
    expect(panel.visible.value).toBe(false)

    panel.toggle()
    await wrapper.vm.$nextTick()

    expect(panel.visible.value).toBe(true)
    expect(panel.conversationsCollapsed.value).toBe(false)
    expect(panel.notesCollapsed.value).toBe(false)
    expect(wrapper.find('.region-main').isVisible()).toBe(true)
    expect(wrapper.find('.region-side').isVisible()).toBe(true)
  })

  it('收起状态不写入 settings', async () => {
    const wrapper = mountOpenPanel()

    await wrapper.find('.conv-region-btn').trigger('click')

    expect(setSetting).not.toHaveBeenCalled()
  })

  it('只剩一个区时，展开的那个区占满面板全部空间', async () => {
    const wrapper = mountOpenPanel()

    // 两区都在时按分隔比例分
    expect(wrapper.find('.region-main').attributes('style')).toContain('55%')

    await wrapper.find('.notes-region-btn').trigger('click')
    expect(wrapper.find('.region-main').attributes('style')).toContain('100%')

    // 重新展开笔记区 → 恢复之前的分栏比例
    await wrapper.find('.notes-region-btn').trigger('click')
    expect(wrapper.find('.region-main').attributes('style')).toContain('55%')
  })
})

describe('FLOW-10 尺寸与布局的持久化与恢复', () => {
  it('从 settings 恢复已保存的宽度、布局与全屏状态', async () => {
    settingsStore['assistant.panelWidth'] = '600'
    settingsStore['assistant.panelLayout'] = 'vertical'
    settingsStore['assistant.panelFullscreen'] = 'true'

    await panel.loadFromSettings()

    expect(panel.width.value).toBe(600)
    expect(panel.layout.value).toBe('vertical')
    expect(panel.fullscreen.value).toBe(true)
  })

  it('settings 中没有记录时使用默认值', async () => {
    await panel.loadFromSettings()

    expect(panel.width.value).toBe(DEFAULT_PANEL_WIDTH)
    expect(panel.layout.value).toBe('horizontal')
    expect(panel.fullscreen.value).toBe(false)
  })

  it('恢复的宽度同样受钳制约束', async () => {
    settingsStore['assistant.panelWidth'] = '99999'

    await panel.loadFromSettings()

    expect(panel.width.value).toBe(maxPanelWidth())
  })
})
