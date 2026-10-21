/**
 * 辅助面板 —— 端到端流程用例。
 *
 * 把面板容器、辅助会话区、笔记区、搜索区装配在一起，串起需求文档
 * docs/ASSISTANT_PANEL.md 的主要流程：
 * FLOW-1（加载工作区）、FLOW-3（摘录为笔记）、FLOW-4（编辑并保存）、
 * FLOW-6（切换主会话）、FLOW-8（删除辅助会话）、FLOW-7（搜索）。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import AssistantPanel from '../src/views/ai/components/assistant/AssistantPanel.vue'
import AssistantConversations from '../src/views/ai/components/assistant/AssistantConversations.vue'
import AssistantNotes from '../src/views/ai/components/assistant/AssistantNotes.vue'
import AssistantSearch from '../src/views/ai/components/assistant/AssistantSearch.vue'
import { ASSISTANT_PANEL, useAssistantPanel } from '../src/views/ai/composables/assistant/useAssistantPanel'
import {
  ASSISTANT_WORKSPACE,
  useAssistantWorkspace,
} from '../src/views/ai/composables/assistant/useAssistantWorkspace'
import type { NoteRow } from '../src/views/ai/composables/assistant/useAssistantNotes'

// ===== 主进程模块 mock =====

const assistantMock = {
  create: vi.fn(),
  list: vi.fn(),
  rename: vi.fn(),
  deleteSession: vi.fn(),
  reorder: vi.fn(),
}

const notesMock = {
  create: vi.fn(),
  list: vi.fn(),
  get: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  reorder: vi.fn(),
}

const workspaceMock = {
  getState: vi.fn(),
  setActive: vi.fn(),
}

const searchMock = { query: vi.fn() }

const settingsMock = { get: vi.fn(), set: vi.fn() }

const aiMock = {
  getActiveProfile: vi.fn(async () => null),
  getSystemPromptsByIds: vi.fn(async () => []),
  getMessages: vi.fn(async () => []),
  chat: vi.fn(async () => ({ messageId: 'msg-1' })),
  abort: vi.fn(),
  onStart: vi.fn(() => () => {}),
  onChunk: vi.fn(() => () => {}),
  onComplete: vi.fn(() => () => {}),
  onHalted: vi.fn(() => () => {}),
  onError: vi.fn(() => () => {}),
}

vi.mock('element-plus', () => ({
  ElMessageBox: { confirm: vi.fn(async () => true) },
}))

function note(partial: Partial<NoteRow> & { id: string }): NoteRow {
  return {
    scopeId: 'scope-1',
    title: '新笔记',
    content: '',
    ord: 0,
    sourceType: null,
    sourceConvId: null,
    sourceMsgId: null,
    sourceConvTitle: null,
    sourceMsgContent: null,
    createdAt: 1,
    updatedAt: 1,
    ...partial,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(window as unknown as { bridge: unknown }).bridge = {
    getModules: (names: string[]) => {
      const map: Record<string, unknown> = {
        assistant: assistantMock,
        notes: notesMock,
        workspace: workspaceMock,
        search: searchMock,
        settings: settingsMock,
        ai: aiMock,
      }
      const result: Record<string, unknown> = {}
      for (const name of names) result[name] = map[name]
      return result
    },
  }

  assistantMock.list.mockResolvedValue([
    { convId: 'a', title: '会话A', createdAt: 1, updatedAt: 1, pinned: 0, scopeId: 'scope-1', ord: 0 },
    { convId: 'b', title: '会话B', createdAt: 1, updatedAt: 1, pinned: 0, scopeId: 'scope-1', ord: 1 },
  ])
  assistantMock.create.mockResolvedValue({ convId: 'conv-new' })
  assistantMock.deleteSession.mockResolvedValue(true)
  assistantMock.rename.mockResolvedValue(true)
  assistantMock.reorder.mockResolvedValue(true)

  notesMock.list.mockResolvedValue([note({ id: 'n1', title: '索引优化结论' })])
  notesMock.create.mockImplementation(async (input: any) => ({
    id: 'note-new',
    scopeId: input.scopeId,
    title: input.title ?? '新笔记',
    content: input.content ?? '',
    ord: 0,
    sourceType: input.sourceType ?? null,
    sourceConvId: input.sourceConvId ?? null,
    sourceMsgId: input.sourceMsgId ?? null,
    sourceConvTitle: input.sourceConvTitle ?? null,
    sourceMsgContent: input.sourceMsgContent ?? null,
    createdAt: 1,
    updatedAt: 1,
  }))
  notesMock.update.mockImplementation(async (id: string, patch: any) =>
    note({ id, title: patch.title ?? '新笔记', content: patch.content ?? '' })
  )
  notesMock.delete.mockResolvedValue(true)

  workspaceMock.getState.mockResolvedValue({
    scopeId: 'scope-1',
    activeConvId: 'b',
    activeNoteId: 'n1',
  })
  workspaceMock.setActive.mockResolvedValue(true)

  searchMock.query.mockResolvedValue({ notes: [], messages: [] })
  settingsMock.get.mockResolvedValue(null)
  settingsMock.set.mockResolvedValue(true)
  aiMock.getMessages.mockResolvedValue([
    { msgId: 'm1', role: 'assistant', content: '这次聊到了索引优化的问题', created_at: 1 },
  ])
})

/** 装配完整面板（会话区 + 笔记区 + 搜索区） */
async function mountPanel() {
  const scopeId = ref<string | null>('scope-1')
  const enabled = ref(true)
  const workspace = useAssistantWorkspace(scopeId, enabled)
  const panel = useAssistantPanel()
  // 与 AiChat.vue 一致：关闭面板前检查笔记未保存修改
  panel.setCloseGuard(() => workspace.notes.requestSwitch(() => panel.close()))
  panel.visible.value = true

  const wrapper = mount(AssistantPanel, {
    slots: {
      conversations: AssistantConversations,
      notes: AssistantNotes,
      search: AssistantSearch,
    },
    global: {
      provide: {
        [ASSISTANT_PANEL as symbol]: panel,
        [ASSISTANT_WORKSPACE as symbol]: workspace,
      },
    },
  })

  await workspace.whenLoaded()
  await nextTick()
  await nextTick()
  return { wrapper, workspace, scopeId, panel }
}

describe('FLOW-1 打开辅助面板并加载工作区', () => {
  it('同时显示该工作区的辅助会话 Tab 与笔记列表', async () => {
    const { wrapper } = await mountPanel()

    expect(wrapper.findAll('.tab-title').map(n => n.text())).toEqual(['会话A', '会话B'])
    expect(wrapper.findAll('.note-item-title').map(n => n.text())).toEqual(['索引优化结论'])
  })

  it('激活项取自工作区状态', async () => {
    const { wrapper } = await mountPanel()

    expect(wrapper.findAll('.tab')[1].classes()).toContain('active')
    expect(wrapper.findAll('.note-item')[0].classes()).toContain('active')
  })
})

describe('FLOW-3 从 AI 回复摘录为笔记', () => {
  it('摘录后笔记进入笔记列表，来源快照写入主进程', async () => {
    const { wrapper } = await mountPanel()

    await wrapper.find('.excerpt-btn').trigger('click')
    await nextTick()

    expect(notesMock.create).toHaveBeenCalledTimes(1)
    const input = notesMock.create.mock.calls[0][0]
    expect(input.scopeId).toBe('scope-1')
    expect(input.sourceType).toBe('ai_message')
    expect(input.sourceConvId).toBe('b')
    expect(input.sourceMsgId).toBe('m1')
    expect(input.sourceConvTitle).toBe('会话B')
    expect(input.sourceMsgContent).toBe('这次聊到了索引优化的问题')

    expect(wrapper.findAll('.note-item')).toHaveLength(2)
  })
})

describe('FLOW-4 编辑并保存笔记', () => {
  it('保存后写入数据库', async () => {
    const { wrapper } = await mountPanel()

    const el = wrapper.find('.editor-content').element as HTMLElement
    el.innerHTML = '<p>改过的内容</p>'
    await wrapper.find('.editor-content').trigger('input')
    await wrapper.find('.editor-save').trigger('click')
    await nextTick()

    expect(notesMock.update).toHaveBeenCalledWith('n1', {
      title: '索引优化结论',
      content: '<p>改过的内容</p>',
    })
  })
})

describe('FLOW-6 切换主会话', () => {
  it('scope 变化后重新加载该工作区的会话与笔记', async () => {
    const { wrapper, workspace, scopeId } = await mountPanel()

    notesMock.list.mockResolvedValue([note({ id: 'n9', title: '另一个工作区的笔记' })])
    scopeId.value = 'scope-2'
    await nextTick()
    await workspace.whenLoaded()
    await nextTick()

    expect(assistantMock.list).toHaveBeenCalledWith('scope-2')
    expect(notesMock.list).toHaveBeenCalledWith('scope-2')
    expect(wrapper.findAll('.note-item-title').map(n => n.text())).toEqual(['另一个工作区的笔记'])
  })
})

describe('FLOW-8 删除辅助会话', () => {
  it('删除后 Tab 消失，该工作区的笔记保留', async () => {
    const { wrapper } = await mountPanel()

    await wrapper.findAll('.tab-close')[0].trigger('click')
    await nextTick()

    expect(assistantMock.deleteSession).toHaveBeenCalledWith('a')
    expect(wrapper.findAll('.tab-title').map(n => n.text())).toEqual(['会话B'])
    expect(wrapper.findAll('.note-item')).toHaveLength(1)
  })
})

describe('FLOW-5 关闭面板时的未保存处理', () => {
  it('有未保存修改时关闭被拦截，行内确认条出现', async () => {
    const { wrapper, panel } = await mountPanel()

    const el = wrapper.find('.editor-content').element as HTMLElement
    el.innerHTML = '<p>改过的内容</p>'
    await wrapper.find('.editor-content').trigger('input')
    await wrapper.find('.close-btn').trigger('click')
    await nextTick()

    expect(panel.visible.value).toBe(true)
    expect(wrapper.find('.unsaved-bar').exists()).toBe(true)
  })

  it('确认保存后关闭面板', async () => {
    const { wrapper, panel } = await mountPanel()

    const el = wrapper.find('.editor-content').element as HTMLElement
    el.innerHTML = '<p>改过的内容</p>'
    await wrapper.find('.editor-content').trigger('input')
    await wrapper.find('.close-btn').trigger('click')
    await wrapper.find('.unsaved-save').trigger('click')
    await nextTick()

    expect(notesMock.update).toHaveBeenCalled()
    expect(panel.visible.value).toBe(false)
  })
})

describe('FR-1.7 关闭面板不清数据', () => {
  it('关闭面板后工作区的笔记仍在内存中', async () => {
    const { wrapper, panel, workspace } = await mountPanel()

    await wrapper.find('.close-btn').trigger('click')
    await nextTick()

    expect(panel.visible.value).toBe(false)
    expect(workspace.notes.notes.value).toHaveLength(1)
  })
})

describe('FLOW-7 搜索并跳转', () => {
  it('搜索结果按类型分组，点击结果带出定位信息', async () => {
    const { wrapper } = await mountPanel()
    await wrapper.find('.search-btn').trigger('click')
    await nextTick()

    searchMock.query.mockResolvedValue({
      notes: [
        {
          noteId: 'n1',
          title: '索引优化结论',
          scopeId: 'scope-1',
          scopeTitle: '性能讨论',
          snippet: '聊到了<mark>索引</mark>优化',
        },
      ],
      messages: [],
    })

    const input = wrapper.find('.search-input')
    await input.setValue('索引')
    await new Promise(r => setTimeout(r, 250))
    await nextTick()

    expect(wrapper.find('.group-title').text()).toBe('📝 笔记 (1)')

    await wrapper.find('.result-item').trigger('click')

    expect(wrapper.findComponent(AssistantSearch).emitted('navigate')).toEqual([
      [{ type: 'note', scopeId: 'scope-1', noteId: 'n1' }],
    ])
  })
})
