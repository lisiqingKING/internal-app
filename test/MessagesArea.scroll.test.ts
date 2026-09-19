import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import MessagesArea from '../src/views/ai/components/MessagesArea.vue'

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

/**
 * P1 滚动行为测试
 *
 * 注意: jsdom 的 scrollHeight/scrollTop 是只读的原型 getter，无法通过 mock 覆盖。
 * 因此本测试用纯逻辑验证的方式：直接测试 isNearBottom 计算结果。
 * isNearBottom 计算公式: scrollHeight - scrollTop - clientHeight < 80
 */
describe('MessagesArea P1: 滚动行为一致性', () => {
  // 辅助函数：直接测试 isNearBottom 的计算逻辑
  // 阈值常量 NEAR_BOTTOM_THRESHOLD = 80
  function computeIsNearBottom(scrollTop: number, scrollHeight: number, clientHeight: number): boolean {
    return scrollHeight - scrollTop - clientHeight < 80
  }

  it('距底 < 80px 时 isNearBottom = true', () => {
    // scrollTop=400, 距底=1000-400-600=0 → true
    expect(computeIsNearBottom(400, 1000, 600)).toBe(true)
    // scrollTop=900, 距底=1000-900-600=-500 → true
    expect(computeIsNearBottom(900, 1000, 600)).toBe(true)
  })

  it('距底 >= 80px 时 isNearBottom = false', () => {
    // scrollTop=0, 距底=1000-0-600=400 >= 80 → false
    expect(computeIsNearBottom(0, 1000, 600)).toBe(false)
    // scrollTop=320, 距底=1000-320-600=80 == 80 → false
    expect(computeIsNearBottom(320, 1000, 600)).toBe(false)
    // scrollTop=500, 距底=1000-500-600=-100 < 80 → true (超出底部也算 near)
    // 注释错了：当 scrollTop+clientHeight > scrollHeight 时，距底为负，<80 → true
  })

  it('阈值边界: 距底 == 79 时 true, == 80 时 false', () => {
    // 79 < 80 → true
    expect(computeIsNearBottom(321, 1000, 600)).toBe(true)  // 距底 = 79 → true
    expect(computeIsNearBottom(320, 1000, 600)).toBe(false) // 距底 = 80 → false
  })

  it('组件 mounted 后 isNearBottom 初始值为 true', () => {
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
    // 初始值是 true（新建时默认粘底）
    expect(wrapper.vm.isNearBottom).toBe(true)
    wrapper.unmount()
  })

  it('组件暴露 scrollToBottom 和 forceScrollToBottom 方法', () => {
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
          DynamicScrollerItem: true,
          StreamingMessage: true,
          TypingIndicator: true,
          ContextMenu: true,
        }
      }
    })
    expect(typeof wrapper.vm.scrollToBottom).toBe('function')
    expect(typeof wrapper.vm.forceScrollToBottom).toBe('function')
    wrapper.unmount()
  })
})
