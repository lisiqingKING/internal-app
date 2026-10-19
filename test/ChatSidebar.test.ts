import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import ChatSidebar from '../src/views/ai/components/sidebar/ChatSidebar.vue'
import type { ChatSession, Category } from '../src/views/ai/types'
import { PINNED_CATEGORY_ID } from '../src/views/ai/types'

// Mock IntersectionObserver
const mockIntersectionObserver = vi.fn(() => ({
  observe: vi.fn(),
  disconnect: vi.fn(),
}))
vi.stubGlobal('IntersectionObserver', mockIntersectionObserver)

const mockSessions: ChatSession[] = [
  {
    convId: 'conv-1',
    title: '会话1',
    messages: [],
    createdAt: Date.now() - 1000,
    updatedAt: Date.now() - 1000,
    categoryId: null,
  },
  {
    convId: 'conv-2',
    title: '会话2',
    messages: [],
    createdAt: Date.now() - 2000,
    updatedAt: Date.now() - 2000,
    categoryId: PINNED_CATEGORY_ID,
  },
  {
    convId: 'conv-3',
    title: '会话3（工作分组）',
    messages: [],
    createdAt: Date.now() - 500,
    updatedAt: Date.now() - 500,
    categoryId: 'cat-1',
  },
]

const mockCategories: Category[] = [
  { id: 'cat-1', name: '工作' },
]

describe('ChatSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('渲染会话列表', () => {
    const wrapper = mount(ChatSidebar, {
      props: {
        sessions: mockSessions,
        categories: mockCategories,
        currentSessionId: null,
        loadingMore: false,
        hasMore: false,
      },
      global: {
        stubs: {
          ChatSidebarHeader: true,
          ChatSidebarDropdown: true,
          ChatSidebarSearchDialog: true,
        },
      },
    })

    expect(wrapper.find('.session-list').exists()).toBe(true)
  })

  it('点击会话项，触发 switch-session 事件', async () => {
    const wrapper = mount(ChatSidebar, {
      props: {
        sessions: mockSessions,
        categories: mockCategories,
        currentSessionId: null,
        loadingMore: false,
        hasMore: false,
      },
      global: {
        stubs: {
          ChatSidebarHeader: true,
          ChatSidebarDropdown: true,
          ChatSidebarSearchDialog: true,
        },
      },
    })

    const sessionItems = wrapper.findAll('.session-item')
    // 置顶会话排在前面，所以 conv-2 实际是第一个
    await sessionItems[0].trigger('click')

    expect(wrapper.emitted('switch-session')).toBeTruthy()
    expect(wrapper.emitted('switch-session')?.[0]).toEqual(['conv-2'])
  })

  it('当前会话高亮显示', () => {
    const wrapper = mount(ChatSidebar, {
      props: {
        sessions: mockSessions,
        categories: mockCategories,
        currentSessionId: 'conv-1',
        loadingMore: false,
        hasMore: false,
      },
      global: {
        stubs: {
          ChatSidebarHeader: true,
          ChatSidebarDropdown: true,
          ChatSidebarSearchDialog: true,
        },
      },
    })

    const activeItem = wrapper.find('.session-item.active')
    expect(activeItem.exists()).toBe(true)
  })

  it('点击分组 header，切换折叠状态', async () => {
    const wrapper = mount(ChatSidebar, {
      props: {
        sessions: mockSessions,
        categories: mockCategories,
        currentSessionId: null,
        loadingMore: false,
        hasMore: false,
      },
      global: {
        stubs: {
          ChatSidebarHeader: true,
          ChatSidebarDropdown: true,
          ChatSidebarSearchDialog: true,
        },
      },
    })

    const catHeader = wrapper.find('[data-cat-id="cat-1"]')

    // 默认 cat-1 是折叠的
    expect(catHeader.classes()).not.toContain('expanded')

    // 点击展开
    await catHeader.trigger('click')
    await nextTick()
    expect(catHeader.classes()).toContain('expanded')

    // 再点击折叠
    await catHeader.trigger('click')
    await nextTick()
    expect(catHeader.classes()).not.toContain('expanded')
  })

  it('置顶会话显示置顶图标', () => {
    const wrapper = mount(ChatSidebar, {
      props: {
        sessions: mockSessions,
        categories: mockCategories,
        currentSessionId: null,
        loadingMore: false,
        hasMore: false,
      },
      global: {
        stubs: {
          ChatSidebarHeader: true,
          ChatSidebarDropdown: true,
          ChatSidebarSearchDialog: true,
        },
      },
    })

    // 置顶图标在 group-header 中，不在 session-item 中
    const pinnedGroup = wrapper.find('.group-header')
    expect(pinnedGroup.find('.pin-icon').exists()).toBe(true)
  })

  it('新消息时显示未读红点', () => {
    const sessionsWithUnread = [
      {
        ...mockSessions[0],
        hasNewMessages: true,
      },
    ]

    const wrapper = mount(ChatSidebar, {
      props: {
        sessions: sessionsWithUnread,
        categories: [],
        currentSessionId: null,
        loadingMore: false,
        hasMore: false,
      },
      global: {
        stubs: {
          ChatSidebarHeader: true,
          ChatSidebarDropdown: true,
          ChatSidebarSearchDialog: true,
        },
      },
    })

    expect(wrapper.find('.unread-dot').exists()).toBe(true)
  })
})
