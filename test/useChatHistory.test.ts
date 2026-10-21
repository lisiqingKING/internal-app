import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ChatSession, Message } from '../src/views/ai/types'

// Mock the storage adapter before importing useChatHistory
const mockAdapter = {
  readAll: vi.fn(),
  add: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  updatePinned: vi.fn(),
  moveSession: vi.fn(),
}

vi.mock('../src/views/ai/composables/storage/storageElectron', () => ({
  electronStorageAdapter: mockAdapter,
  initElectronStorage: vi.fn(),
  moveSession: mockAdapter.moveSession,
  getCachedCategories: vi.fn(() => []),
}))

const { useChatHistory } = await import('../src/views/ai/composables/chat/useChatHistory')

const makeMessage = (content: string, role: 'user' | 'assistant' = 'user'): Message => ({
  msgId: `msg-${Math.random().toString(36).slice(2)}`,
  role,
  content,
  createdAt: Date.now(),
})

const makeSession = (partial: Partial<ChatSession> & { convId: string }): ChatSession => ({
  convId: '',
  title: '新对话',
  messages: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
  pinned: 0,
  persisted: true,
  ...partial,
})

describe('useChatHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAdapter.readAll.mockResolvedValue([])
  })

  describe('createSession', () => {
    it('should create a local session with persisted=false without calling backend', async () => {
      const { sessions, createSession, switchSession } = useChatHistory()
      await createSession()
      switchSession(sessions.value[0].convId)

      expect(sessions.value).toHaveLength(1)
      expect(sessions.value[0].persisted).toBe(false)
      expect(sessions.value[0].convId).toMatch(/^local-/)
      expect(mockAdapter.add).not.toHaveBeenCalled()
    })

    it('should generate unique convIds for multiple sessions', async () => {
      const { sessions, createSession, switchSession } = useChatHistory()
      await createSession()
      switchSession(sessions.value[0].convId)
      await createSession()
      switchSession(sessions.value[0].convId)

      expect(sessions.value).toHaveLength(2)
      expect(sessions.value[0].convId).not.toBe(sessions.value[1].convId)
    })
  })

  describe('updateCurrentMessages', () => {
    it('should update session messages and title locally without calling backend', async () => {
      const { sessions, createSession, switchSession, updateCurrentMessages } = useChatHistory()
      await createSession()
      switchSession(sessions.value[0].convId)

      const messages = [makeMessage('你好')]
      await updateCurrentMessages(messages)

      // Backend is NOT called - messages are persisted by streaming handler
      expect(mockAdapter.update).not.toHaveBeenCalled()
      expect(mockAdapter.add).not.toHaveBeenCalled()
      // Local state is updated
      expect(sessions.value[0].messages).toEqual(messages)
      expect(sessions.value[0].title).toBe('你好')
    })

    it('should update title from first user message', async () => {
      const { sessions, createSession, switchSession, updateCurrentMessages } = useChatHistory()
      await createSession()
      switchSession(sessions.value[0].convId)

      // Message is > 20 chars, should be truncated with ellipsis
      const longMessage = '这是一条非常非常非常非常长的第一条消息内容'
      const messages = [makeMessage(longMessage)]
      await updateCurrentMessages(messages)

      expect(sessions.value[0].title).toBe(longMessage.slice(0, 20) + '...')
    })
  })

  describe('deleteSession', () => {
    it('本地会话也要走后端删除：主进程可能已经为它建了行', async () => {
      const { sessions, createSession, switchSession, deleteSession } = useChatHistory()
      await createSession()
      switchSession(sessions.value[0].convId)

      const localId = sessions.value[0].convId
      await deleteSession(localId)

      expect(mockAdapter.delete).toHaveBeenCalledWith(localId)
      expect(sessions.value).toHaveLength(0)
    })

    it('should call backend delete for persisted session', async () => {
      const { sessions, createSession, switchSession, deleteSession } = useChatHistory()
      await createSession()
      switchSession(sessions.value[0].convId)

      const convId = sessions.value[0].convId
      sessions.value[0].persisted = true

      await deleteSession(convId)

      expect(mockAdapter.delete).toHaveBeenCalledWith(convId)
      expect(sessions.value).toHaveLength(0)
    })

    it('删掉最后一个会话时清空 currentSessionId，不残留指向已删除会话的 id', async () => {
      const { sessions, createSession, switchSession, deleteSession, currentSessionId } =
        useChatHistory()
      await createSession()
      switchSession(sessions.value[0].convId)

      const convId = sessions.value[0].convId
      await deleteSession(convId)

      expect(sessions.value).toHaveLength(0)
      expect(currentSessionId.value).toBe(null)
    })

    it('删除非当前会话时 currentSessionId 保持不变', async () => {
      const { createSession, switchSession, deleteSession, currentSessionId } = useChatHistory()
      const first = await createSession()
      const second = await createSession()
      switchSession(second.convId)

      await deleteSession(first.convId)

      expect(currentSessionId.value).toBe(second.convId)
    })
  })

  describe('updateSessionTitle', () => {
    it('should call backend for any session', async () => {
      const { sessions, createSession, switchSession, updateSessionTitle } = useChatHistory()
      await createSession()
      switchSession(sessions.value[0].convId)

      await updateSessionTitle(sessions.value[0].convId, '新标题')

      expect(mockAdapter.update).toHaveBeenCalledWith(
        sessions.value[0].convId,
        { title: '新标题' }
      )
    })
  })

  describe('togglePin', () => {
    it('should call moveSession to __pinned__ for any session', async () => {
      const { sessions, createSession, switchSession, togglePin } = useChatHistory()
      await createSession()
      switchSession(sessions.value[0].convId)

      await togglePin(sessions.value[0].convId)

      expect(mockAdapter.moveSession).toHaveBeenCalledWith(sessions.value[0].convId, '__pinned__')
    })
  })

  describe('init', () => {
    it('一次拿到全部分组及其会话（无分页、无截断）', async () => {
      const all = Array.from({ length: 30 }, (_, i) =>
        makeSession({ convId: `c${i}`, title: `会话${i}` })
      )
      mockAdapter.readAll.mockResolvedValue(all)

      const { sessions, init } = useChatHistory()
      await init()

      expect(sessions.value).toHaveLength(30)
      expect(new Set(sessions.value.map((s) => s.convId)).size).toBe(30)
    })
  })
})
