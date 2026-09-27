import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import AiChat from '../src/views/ai/components/AiChat.vue'

const mockGetLinksForSource = vi.fn()
const mockCreateSession = vi.fn()
const mockCreate = vi.fn()

window.bridge = {
  getModules: () => ({
    ai: { getActiveProfile: vi.fn().mockResolvedValue({ apiKey: 'test', apiUrl: 'test' }) },
    assistant: {
      getLinksForSource: mockGetLinksForSource,
      createSession: mockCreateSession,
      create: mockCreate,
    },
  }),
} as any

describe('handleAssistant', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('有历史 link 时，直接打开已有关联 convId，不新建会话', async () => {
    mockGetLinksForSource.mockImplementation((sourceType: string, sourceId: string) => {
      expect(sourceType).toBe('conversation')
      expect(sourceId).toBeTruthy()
      return Promise.resolve({ assistantConvId: 'existing-conv-1' })
    })

    const wrapper = mount(AiChat, {
      global: {
        stubs: {
          ChatSidebar: true,
          MessagesArea: true,
          InputArea: true,
          ChatEmptyState: true,
        },
      },
    })

    wrapper.vm.$emit('assistant', 100, 200)
    await nextTick()

    expect(mockCreate).toHaveBeenCalledWith({ x: 100, y: 200, convId: 'existing-conv-1' })
    expect(mockCreateSession).not.toHaveBeenCalled()
  })

  it('无历史 link 时，新建会话再打开，sourceType 为 conversation', async () => {
    mockGetLinksForSource.mockImplementation((sourceType: string, sourceId: string) => {
      expect(sourceType).toBe('conversation')
      expect(sourceId).toBeTruthy()
      return Promise.resolve(null)
    })
    mockCreateSession.mockResolvedValue({ convId: 'new-conv-1' })

    const wrapper = mount(AiChat, {
      global: {
        stubs: {
          ChatSidebar: true,
          MessagesArea: true,
          InputArea: true,
          ChatEmptyState: true,
        },
      },
    })

    wrapper.vm.$emit('assistant', 100, 200)
    await nextTick()

    expect(mockCreateSession).toHaveBeenCalledWith({
      title: 'AI 辅助',
      sourceType: 'conversation',
      sourceId: expect.any(String),
    })
    expect(mockCreate).toHaveBeenCalledWith({ x: 100, y: 200, convId: 'new-conv-1' })
  })
})
