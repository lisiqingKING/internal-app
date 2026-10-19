import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import InspirationPanel from '../src/views/ai/components/inspiration/InspirationPanel.vue'

describe('InspirationPanel', () => {
  it('渲染灵感模板列表', () => {
    const wrapper = mount(InspirationPanel, {})

    expect(wrapper.findAll('.template-card').length).toBeGreaterThan(0)
  })

  it('点击模板卡片，触发 use-prompt 事件', async () => {
    const wrapper = mount(InspirationPanel, {})

    await wrapper.findAll('.template-card')[0].trigger('click')

    expect(wrapper.emitted('use-prompt')).toBeTruthy()
    const prompt = wrapper.emitted('use-prompt')?.[0]?.[0]
    expect(typeof prompt).toBe('string')
    expect(prompt.length).toBeGreaterThan(0)
  })

  it('切换到提示词库 tab', async () => {
    const wrapper = mount(InspirationPanel, {})

    // 默认是 templates tab
    expect(wrapper.find('.template-grid').isVisible()).toBe(true)

    // 点击提示词库 tab
    const tabs = wrapper.findAll('.tab-btn')
    await tabs[1].trigger('click')

    expect(wrapper.find('.prompt-list').isVisible()).toBe(true)
  })

  it('点击关闭按钮，触发 close 事件', async () => {
    const wrapper = mount(InspirationPanel, {})

    await wrapper.find('.close-btn').trigger('click')

    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('提示词库中有预设内容', async () => {
    const wrapper = mount(InspirationPanel, {})

    // 切换到提示词库 tab
    const tabs = wrapper.findAll('.tab-btn')
    await tabs[1].trigger('click')

    expect(wrapper.findAll('.prompt-item').length).toBeGreaterThan(0)
  })
})
