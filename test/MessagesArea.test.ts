import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, shallowMount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import MessagesArea from '../src/views/ai/components/MessagesArea.vue'
import DynamicScroller from 'vue-virtual-scroller/dist/components/DynamicScroller.vue'
import DynamicScrollerItem from 'vue-virtual-scroller/dist/components/DynamicScrollerItem.vue'

// Mock global
window.electronApis = {
  ai: {
    saveFile: vi.fn().mockResolvedValue('/fake/path/file.md'),
  }
}

function makeMessage(role: 'user' | 'assistant', content: string, index: number) {
  return {
    msgId: `msg-${index}`,
    role,
    content,
    createdAt: Date.now() + index,
  }
}

describe('MessagesArea P0', () => {
  describe('虚拟滚动基本行为', () => {
    it('传入空消息列表时渲染空状态提示', () => {
      const wrapper = mount(MessagesArea, {
        props: {
          messages: [],
          loading: false,
          currentText: '',
          currentReasoning: '',
        },
        global: {
          stubs: {
            DynamicScroller: true,
            StreamingMessage: true,
            TypingIndicator: true,
            ContextMenu: true,
          }
        }
      })
      expect(wrapper.find('.empty-hint').exists()).toBe(true)
    })

    it('有消息时不渲染空状态', () => {
      const messages = [makeMessage('user', 'hello', 0)]
      const wrapper = mount(MessagesArea, {
        props: { messages, loading: false, currentText: '', currentReasoning: '' },
        global: {
          stubs: {
            DynamicScroller: true,
            StreamingMessage: true,
            TypingIndicator: true,
            ContextMenu: true,
          }
        }
      })
      expect(wrapper.find('.empty-hint').exists()).toBe(false)
    })
  })

  describe('流式消息独立渲染', () => {
    it('loading=true 且有 currentText 时，StreamingMessage 被渲染', () => {
      const wrapper = mount(MessagesArea, {
        props: {
          messages: [],
          loading: true,
          currentText: 'thinking...',
          currentReasoning: '',
        },
        global: {
          stubs: {
            DynamicScroller: true,
            DynamicScrollerItem: true,
            TypingIndicator: true,
            ContextMenu: true,
            MessageBubble: true,
          }
        }
      })
      const streaming = wrapper.findComponent({ name: 'StreamingMessage' })
      expect(streaming.exists()).toBe(true)
    })

    it('loading=true 但无 currentText 时，TypingIndicator 被渲染', () => {
      const wrapper = mount(MessagesArea, {
        props: {
          messages: [],
          loading: true,
          currentText: '',
          currentReasoning: '',
        },
        global: {
          stubs: {
            DynamicScroller: true,
            DynamicScrollerItem: true,
            StreamingMessage: true,
            ContextMenu: true,
            MessageBubble: true,
          }
        }
      })
      const typing = wrapper.findComponent({ name: 'TypingIndicator' })
      expect(typing.exists()).toBe(true)
    })

    it('loading=false 时不渲染流式消息组件', () => {
      const wrapper = mount(MessagesArea, {
        props: {
          messages: [makeMessage('user', 'hello', 0)],
          loading: false,
          currentText: '',
          currentReasoning: '',
        },
        global: {
          stubs: {
            DynamicScroller: true,
            DynamicScrollerItem: true,
            StreamingMessage: true,
            TypingIndicator: true,
            ContextMenu: true,
            MessageBubble: true,
          }
        }
      })
      expect(wrapper.findComponent({ name: 'StreamingMessage' }).exists()).toBe(false)
      expect(wrapper.findComponent({ name: 'TypingIndicator' }).exists()).toBe(false)
    })
  })

  describe('右键菜单 index 映射', () => {
    it('右键菜单打开时传入正确的消息索引', async () => {
      const messages = [
        makeMessage('user', 'msg 0', 0),
        makeMessage('assistant', 'msg 1', 1),
        makeMessage('user', 'msg 2', 2),
      ]
      const wrapper = mount(MessagesArea, {
        props: { messages, loading: false, currentText: '', currentReasoning: '' },
        global: {
          stubs: {
            DynamicScroller: true,
            DynamicScrollerItem: true,
            StreamingMessage: true,
            TypingIndicator: true,
            MessageBubble: true,
          }
        }
      })

      // 模拟右键事件
      const fakeEvent = new MouseEvent('contextmenu', {
        clientX: 100,
        clientY: 200,
        bubbles: true,
      })

      // 触发中间那条消息的右键菜单
      wrapper.vm.showContextMenu(1, fakeEvent)
      await nextTick()

      const contextMenu = wrapper.findComponent({ name: 'ContextMenu' })
      expect(contextMenu.props('index')).toBe(1)
    })
  })

  describe('暴露的方法', () => {
    it('forceScrollToBottom 和 scrollToBottom 被 expose', () => {
      const wrapper = shallowMount(MessagesArea, {
        props: {
          messages: [],
          loading: false,
          currentText: '',
          currentReasoning: '',
        },
        global: {
          stubs: {
            DynamicScroller: true,
            DynamicScrollerItem: true,
            StreamingMessage: true,
            TypingIndicator: true,
            ContextMenu: true,
          }
        }
      })
      expect(typeof wrapper.vm.forceScrollToBottom).toBe('function')
      expect(typeof wrapper.vm.scrollToBottom).toBe('function')
    })
  })
})
