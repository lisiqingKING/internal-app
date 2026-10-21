import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ChatTopToolbar from '../src/views/ai/components/toolbar/ChatTopToolbar.vue'

describe('ChatTopToolbar', () => {
  it('显示会话标题', () => {
    const wrapper = mount(ChatTopToolbar, {
      props: {
        sessionTitle: '测试会话',
      },
    })

    expect(wrapper.find('.session-title').text()).toBe('测试会话')
  })

  it('点击灵感按钮，触发 toggle-inspiration 事件', async () => {
    const wrapper = mount(ChatTopToolbar, {
      props: {
        sessionTitle: '测试会话',
      },
    })

    await wrapper.find('.inspiration-entry-btn').trigger('click')
    expect(wrapper.emitted('toggle-inspiration')).toBeTruthy()
  })

  it('点击辅助面板按钮，触发 toggle-assistant 事件', async () => {
    const wrapper = mount(ChatTopToolbar, {
      props: {
        sessionTitle: '测试会话',
      },
    })

    await wrapper.find('.assistant-entry-btn').trigger('click')
    expect(wrapper.emitted('toggle-assistant')).toBeTruthy()
  })
})
