import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import ChatSidebarHeader from '../src/views/ai/components/sidebar/ChatSidebarHeader.vue'

describe('ChatSidebarHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('点击新对话按钮，触发 new-chat 事件', async () => {
    const wrapper = mount(ChatSidebarHeader, {
      global: {
        stubs: {
          ChatHeaderRename: true,
        },
      },
    })

    await wrapper.find('.new-chat-btn').trigger('click')
    expect(wrapper.emitted('new-chat')).toBeTruthy()
  })

  it('点击菜单按钮，展开下拉菜单', async () => {
    const wrapper = mount(ChatSidebarHeader, {
      global: {
        stubs: {
          ChatHeaderRename: true,
        },
      },
    })

    await wrapper.find('.menu-btn').trigger('click')
    await nextTick()

    expect(wrapper.find('.dropdown-menu').isVisible()).toBe(true)
  })

  it('点击菜单外区域，关闭下拉菜单', async () => {
    const wrapper = mount(ChatSidebarHeader, {
      global: {
        stubs: {
          ChatHeaderRename: true,
        },
      },
    })

    await wrapper.find('.menu-btn').trigger('click')
    await nextTick()
    expect(wrapper.find('.dropdown-menu').isVisible()).toBe(true)

    await wrapper.find('.menu-overlay').trigger('click')
    await nextTick()
    expect(wrapper.find('.dropdown-menu').exists()).toBe(false)
  })

  it('点击菜单中"新建分组"，弹出新建分组对话框', async () => {
    const wrapper = mount(ChatSidebarHeader, {
      global: {
        stubs: {
          ChatHeaderRename: true,
        },
      },
    })

    await wrapper.find('.menu-btn').trigger('click')
    await nextTick()

    await wrapper.findAll('.dropdown-item')[0].trigger('click')
    await nextTick()

    // ChatHeaderRename 组件应该显示
    const renameDialog = wrapper.findComponent({ name: 'ChatHeaderRename' })
    expect(renameDialog.exists()).toBe(true)
  })

  it('点击菜单中"搜索会话"，触发 open-search 事件', async () => {
    const wrapper = mount(ChatSidebarHeader, {
      global: {
        stubs: {
          ChatHeaderRename: true,
        },
      },
    })

    await wrapper.find('.menu-btn').trigger('click')
    await nextTick()

    await wrapper.findAll('.dropdown-item')[1].trigger('click')

    expect(wrapper.emitted('open-search')).toBeTruthy()
  })
})
