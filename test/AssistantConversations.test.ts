/**
 * 辅助会话区 —— 状态层测试。
 *
 * 对应需求文档 docs/ASSISTANT_PANEL.md 的 FR-3（辅助会话）、
 * FLOW-1（加载工作区）、FLOW-2（对话）、FLOW-3（摘录为笔记）、FLOW-8（删除）、FLOW-11（首次进入）。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import {
  useAssistantConversations,
  type AssistantSessionRow,
} from '../src/views/ai/composables/assistant/useAssistantConversations'
import { useAssistantNotes } from '../src/views/ai/composables/assistant/useAssistantNotes'

// ===== 主进程模块 mock =====

const assistantMock = {
  create: vi.fn(),
  list: vi.fn(),
  rename: vi.fn(),
  deleteSession: vi.fn(),
  reorder: vi.fn(),
}

const workspaceMock = {
  getState: vi.fn(),
  setActive: vi.fn(),
}

const notesMock = {
  create: vi.fn(),
  list: vi.fn(),
  get: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  reorder: vi.fn(),
}

const stream = {
  chunk: null as ((id: string, content: string, reasoning?: string) => void) | null,
  complete: null as ((id: string) => void) | null,
}

const aiMock = {
  getActiveProfile: vi.fn(async () => null),
  getSystemPromptsByIds: vi.fn(async () => []),
  getMessages: vi.fn(async () => []),
  chat: vi.fn(async () => ({ messageId: 'msg-1' })),
  abort: vi.fn(),
  onStart: vi.fn(() => () => {}),
  onChunk: vi.fn((fn: (id: string, content: string) => void) => {
    stream.chunk = fn
    return () => {
      stream.chunk = null
    }
  }),
  onComplete: vi.fn((fn: (id: string) => void) => {
    stream.complete = fn
    return () => {
      stream.complete = null
    }
  }),
  onHalted: vi.fn(() => () => {}),
  onError: vi.fn(() => () => {}),
}

beforeEach(() => {
  vi.clearAllMocks()
  stream.chunk = null
  stream.complete = null
  ;(window as unknown as { bridge: unknown }).bridge = {
    getModules: (names: string[]) => {
      const map: Record<string, unknown> = {
        assistant: assistantMock,
        workspace: workspaceMock,
        notes: notesMock,
        ai: aiMock,
      }
      const result: Record<string, unknown> = {}
      for (const name of names) result[name] = map[name]
      return result
    },
  }
  assistantMock.create.mockResolvedValue({ convId: 'conv-new' })
  assistantMock.list.mockResolvedValue([])
  assistantMock.rename.mockResolvedValue(true)
  assistantMock.deleteSession.mockResolvedValue(true)
  assistantMock.reorder.mockResolvedValue(true)
  workspaceMock.getState.mockResolvedValue({
    scopeId: 'scope-1',
    activeConvId: null,
    activeNoteId: null,
  })
  workspaceMock.setActive.mockResolvedValue(true)
  notesMock.list.mockResolvedValue([])
  notesMock.create.mockImplementation(async (input: any) => ({
    id: 'note-1',
    ...input,
    ord: 0,
    sourceType: input.sourceType ?? null,
    sourceConvId: input.sourceConvId ?? null,
    sourceMsgId: input.sourceMsgId ?? null,
    sourceConvTitle: input.sourceConvTitle ?? null,
    sourceMsgContent: input.sourceMsgContent ?? null,
    createdAt: 1,
    updatedAt: 1,
  }))
})

function row(partial: Partial<AssistantSessionRow> & { convId: string }): AssistantSessionRow {
  return {
    title: '新会话',
    createdAt: 1,
    updatedAt: 1,
    pinned: 0,
    categoryId: null,
    scopeId: 'scope-1',
    ord: 0,
    ...partial,
  }
}

describe('FLOW-1 加载工作区', () => {
  it('按 scopeId 列出辅助会话并激活工作区记录的那一个', async () => {
    assistantMock.list.mockResolvedValue([row({ convId: 'a' }), row({ convId: 'b' })])
    workspaceMock.getState.mockResolvedValue({
      scopeId: 'scope-1',
      activeConvId: 'b',
      activeNoteId: null,
    })

    const { load, activeConvId, sessions } = useAssistantConversations()
    await load('scope-1')

    expect(assistantMock.list).toHaveBeenCalledWith('scope-1')
    expect(sessions.value.map(s => s.convId)).toEqual(['a', 'b'])
    expect(activeConvId.value).toBe('b')
  })

  it('工作区没有激活项时激活列表首项', async () => {
    assistantMock.list.mockResolvedValue([row({ convId: 'a' }), row({ convId: 'b' })])

    const { load, activeConvId } = useAssistantConversations()
    await load('scope-1')

    expect(activeConvId.value).toBe('a')
  })

  it('乱序加载时旧工作区的响应被丢弃，不写进新工作区的激活项', async () => {
    // scope-1 的 list 慢，scope-2 的 list 快：后发先至
    let resolveScope1!: (rows: AssistantSessionRow[]) => void
    assistantMock.list.mockImplementation((scopeId: string) => {
      if (scopeId === 'scope-1') {
        return new Promise<AssistantSessionRow[]>(res => {
          resolveScope1 = res
        })
      }
      return Promise.resolve([row({ convId: 'b', scopeId: 'scope-2' })])
    })
    workspaceMock.getState.mockResolvedValue({
      scopeId: 'scope-2',
      activeConvId: null,
      activeNoteId: null,
    })

    const { load, activeConvId, sessions } = useAssistantConversations()
    const first = load('scope-1')
    await load('scope-2')
    resolveScope1([row({ convId: 'a', scopeId: 'scope-1' })])
    await first

    expect(sessions.value.map(s => s.convId)).toEqual(['b'])
    expect(activeConvId.value).toBe('b')
    // 旧工作区的 convId 不能被写进新工作区
    expect(workspaceMock.setActive).not.toHaveBeenCalledWith('scope-2', { convId: 'a' })
  })
})

describe('FLOW-11 首次进入工作区', () => {
  it('工作区没有辅助会话时自动创建一条并激活', async () => {
    assistantMock.list.mockResolvedValue([])

    const { load, activeConvId, sessions } = useAssistantConversations()
    await load('scope-1')

    expect(assistantMock.create).toHaveBeenCalledWith('scope-1')
    expect(sessions.value).toHaveLength(1)
    expect(activeConvId.value).toBe('conv-new')
  })
})

describe('FR-3 辅助会话操作', () => {
  it('切换会话时同步工作区激活项', async () => {
    assistantMock.list.mockResolvedValue([row({ convId: 'a' }), row({ convId: 'b' })])

    const { load, activate } = useAssistantConversations()
    await load('scope-1')
    await activate('b')

    expect(workspaceMock.setActive).toHaveBeenCalledWith('scope-1', { convId: 'b' })
  })

  it('重命名会话同步到主进程', async () => {
    assistantMock.list.mockResolvedValue([row({ convId: 'a' })])

    const { load, rename, sessions } = useAssistantConversations()
    await load('scope-1')
    await rename('a', '新的名字')

    expect(assistantMock.rename).toHaveBeenCalledWith('a', '新的名字')
    expect(sessions.value[0].title).toBe('新的名字')
  })

  it('拖拽排序后按新顺序持久化', async () => {
    assistantMock.list.mockResolvedValue([
      row({ convId: 'a' }),
      row({ convId: 'b' }),
      row({ convId: 'c' }),
    ])

    const { load, reorder, sessions } = useAssistantConversations()
    await load('scope-1')
    await reorder(['c', 'a', 'b'])

    expect(sessions.value.map(s => s.convId)).toEqual(['c', 'a', 'b'])
    expect(assistantMock.reorder).toHaveBeenCalledWith('scope-1', ['c', 'a', 'b'])
  })

  it('删除会话后从列表移除，并激活剩余会话', async () => {
    assistantMock.list.mockResolvedValue([row({ convId: 'a' }), row({ convId: 'b' })])

    const { load, remove, sessions, activeConvId } = useAssistantConversations()
    await load('scope-1')
    await remove('a')

    expect(assistantMock.deleteSession).toHaveBeenCalledWith('a')
    expect(sessions.value.map(s => s.convId)).toEqual(['b'])
    expect(activeConvId.value).toBe('b')
  })

  it('删除最后一条会话后自动补建一条', async () => {
    assistantMock.list.mockResolvedValue([row({ convId: 'a' })])

    const { load, remove, sessions } = useAssistantConversations()
    await load('scope-1')
    await remove('a')

    expect(assistantMock.create).toHaveBeenCalledWith('scope-1')
    expect(sessions.value).toHaveLength(1)
    expect(sessions.value[0].convId).toBe('conv-new')
  })
})

describe('FLOW-2 辅助会话对话', () => {
  it('发送消息走既有 ai:chat 通道，conversationId 为辅助会话', async () => {
    assistantMock.list.mockResolvedValue([row({ convId: 'a' })])

    const { load, send } = useAssistantConversations()
    await load('scope-1')
    await send('你好')

    expect(aiMock.chat).toHaveBeenCalledTimes(1)
    const options = aiMock.chat.mock.calls[0][0]
    expect(options.conversationId).toBe('a')
    expect(options.messages.some((m: any) => m.role === 'user' && m.content === '你好')).toBe(true)
  })

  it('流式回复完成后追加到消息列表', async () => {
    assistantMock.list.mockResolvedValue([row({ convId: 'a' })])

    const { load, send, messages } = useAssistantConversations()
    await load('scope-1')
    await send('你好')

    const messageId = aiMock.chat.mock.calls[0][0].messageId
    stream.chunk?.(messageId, '你好呀')
    stream.complete?.(messageId)
    await nextTick()

    expect(messages.value.map(m => m.content)).toEqual(['你好', '你好呀'])
  })

  it('自动生成的标题同步回主进程', async () => {
    assistantMock.list.mockResolvedValue([row({ convId: 'a', title: '新会话' })])

    const { load, send, sessions } = useAssistantConversations()
    await load('scope-1')
    await send('帮我看看这个索引问题')

    const messageId = aiMock.chat.mock.calls[0][0].messageId
    stream.complete?.(messageId)
    await nextTick()
    await Promise.resolve()

    expect(sessions.value[0].title).toBe('帮我看看这个索引问题')
    expect(assistantMock.rename).toHaveBeenCalledWith('a', '帮我看看这个索引问题')
  })
})

describe('FLOW-3 摘录为笔记', () => {
  it('写入来源快照，且 scopeId 为工作区而非辅助会话', async () => {
    const notes = useAssistantNotes()
    await notes.excerpt({
      scopeId: 'scope-1',
      convId: 'conv-assistant',
      convTitle: '性能优化',
      msgId: 'msg-1',
      content: '摘录的部分',
      fullContent: '完整的消息正文',
    })

    expect(notesMock.create).toHaveBeenCalledTimes(1)
    const input = notesMock.create.mock.calls[0][0]
    expect(input.scopeId).toBe('scope-1')
    expect(input.content).toBe('摘录的部分')
    expect(input.sourceType).toBe('ai_message')
    expect(input.sourceConvId).toBe('conv-assistant')
    expect(input.sourceMsgId).toBe('msg-1')
    expect(input.sourceConvTitle).toBe('性能优化')
    expect(input.sourceMsgContent).toBe('完整的消息正文')
  })

  it('摘录后笔记进入当前工作区的笔记列表', async () => {
    const notes = useAssistantNotes()
    await notes.excerpt({
      scopeId: 'scope-1',
      convId: 'conv-assistant',
      convTitle: '性能优化',
      msgId: 'msg-1',
      content: '摘录的部分',
      fullContent: '完整的消息正文',
    })

    expect(notes.notes.value).toHaveLength(1)
    expect(notes.notes.value[0].id).toBe('note-1')
  })
})
