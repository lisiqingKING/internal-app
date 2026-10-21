/**
 * 辅助会话 Tab 栏 —— 组件层测试。
 *
 * 对应需求文档 docs/ASSISTANT_PANEL.md 的 FR-3.1 / FR-3.5 / FR-3.6 / FR-3.7 与 §7.3。
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AssistantTabs from '../src/views/ai/components/assistant/AssistantTabs.vue'
import type { ChatSession } from '../src/views/ai/types'

function session(convId: string, title: string): ChatSession {
  return {
    convId,
    title,
    messages: [],
    createdAt: 1,
    updatedAt: 1,
    pinned: 0,
    persisted: true,
  }
}

function mountTabs(sessions: ChatSession[], activeConvId: string | null = null) {
  return mount(AssistantTabs, { props: { sessions, activeConvId } })
}

describe('FR-3.1 会话 Tab 栏', () => {
  it('渲染全部辅助会话', () => {
    const wrapper = mountTabs([session('a', '会话A'), session('b', '会话B')])

    const titles = wrapper.findAll('.tab-title').map(n => n.text())
    expect(titles).toEqual(['会话A', '会话B'])
  })

  it('当前激活的 Tab 有高亮标记', () => {
    const wrapper = mountTabs([session('a', '会话A'), session('b', '会话B')], 'b')

    const tabs = wrapper.findAll('.tab')
    expect(tabs[0].classes()).not.toContain('active')
    expect(tabs[1].classes()).toContain('active')
  })

  it('点击 Tab 触发切换', async () => {
    const wrapper = mountTabs([session('a', '会话A'), session('b', '会话B')])

    await wrapper.findAll('.tab')[1].trigger('click')

    expect(wrapper.emitted('switch')).toEqual([['b']])
  })

  it('点击 + 触发新建', async () => {
    const wrapper = mountTabs([])

    await wrapper.find('.tab-add').trigger('click')

    expect(wrapper.emitted('create')).toBeTruthy()
  })
})

describe('FR-3.5 重命名', () => {
  it('双击标题进入行内编辑，回车提交新标题', async () => {
    const wrapper = mountTabs([session('a', '会话A')])

    await wrapper.find('.tab-title').trigger('dblclick')
    const input = wrapper.find('.tab-rename-input')
    expect(input.exists()).toBe(true)

    await input.setValue('改名后的会话')
    await input.trigger('keydown.enter')

    expect(wrapper.emitted('rename')).toEqual([['a', '改名后的会话']])
  })

  it('按 Esc 放弃重命名', async () => {
    const wrapper = mountTabs([session('a', '会话A')])

    await wrapper.find('.tab-title').trigger('dblclick')
    await wrapper.find('.tab-rename-input').trigger('keydown.esc')

    expect(wrapper.emitted('rename')).toBeFalsy()
    expect(wrapper.find('.tab-rename-input').exists()).toBe(false)
  })
})

describe('FR-3.6 拖拽排序', () => {
  it('拖到另一个 Tab 上时按新顺序触发 reorder', async () => {
    const wrapper = mountTabs([
      session('a', '会话A'),
      session('b', '会话B'),
      session('c', '会话C'),
    ])
    const dataTransfer = { setData: () => {} }

    await wrapper.findAll('.tab')[0].trigger('dragstart', { dataTransfer })
    await wrapper.findAll('.tab')[2].trigger('drop', { dataTransfer })

    expect(wrapper.emitted('reorder')).toEqual([[['b', 'c', 'a']]])
  })

  it('拖到自身不触发 reorder', async () => {
    const wrapper = mountTabs([session('a', '会话A'), session('b', '会话B')])
    const dataTransfer = { setData: () => {} }

    await wrapper.findAll('.tab')[0].trigger('dragstart', { dataTransfer })
    await wrapper.findAll('.tab')[0].trigger('drop', { dataTransfer })

    expect(wrapper.emitted('reorder')).toBeFalsy()
  })
})

describe('FR-3.7 删除辅助会话', () => {
  it('点击 Tab 上的关闭按钮触发删除（由调用方做二次确认）', async () => {
    const wrapper = mountTabs([session('a', '会话A')])

    await wrapper.find('.tab-close').trigger('click')

    expect(wrapper.emitted('remove')).toEqual([['a']])
  })
})
