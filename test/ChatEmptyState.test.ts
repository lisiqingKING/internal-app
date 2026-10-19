import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ChatEmptyState from '../src/views/ai/components/common/ChatEmptyState.vue'

describe('ChatEmptyState', () => {
  it('渲染欢迎卡片', () => {
    const wrapper = mount(ChatEmptyState, {
      global: { stubs: { RouterLink: false } },
    })
    expect(wrapper.find('.welcome-container').exists()).toBe(true)
    expect(wrapper.find('.welcome-header').exists()).toBe(true)
  })

  it('渲染 6 个快捷 prompt 卡片', () => {
    const wrapper = mount(ChatEmptyState, {
      global: { stubs: { RouterLink: false } },
    })
    const cards = wrapper.findAll('.suggestion-card')
    expect(cards.length).toBe(6)
  })

  it('点击 prompt 卡片，触发 use-prompt 事件', async () => {
    const wrapper = mount(ChatEmptyState, {
      global: { stubs: { RouterLink: false } },
    })
    const cards = wrapper.findAll('.suggestion-card')
    await cards[0].trigger('click')
    expect(wrapper.emitted('use-prompt')).toBeTruthy()
    expect(wrapper.emitted('use-prompt')?.[0]).toEqual(['请帮我撰写一篇关于'])
  })

  it('点击新建对话按钮，触发 new-chat 事件', async () => {
    const wrapper = mount(ChatEmptyState, {
      global: { stubs: { RouterLink: false } },
    })
    await wrapper.find('.start-btn').trigger('click')
    expect(wrapper.emitted('new-chat')).toBeTruthy()
  })
})
