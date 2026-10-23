/**
 * 辅助面板 —— 端到端流程用例。
 *
 * 把面板容器、辅助会话区、笔记区、搜索区装配在一起，串起需求文档
 * docs/ASSISTANT_PANEL.md 的主要流程：
 * FLOW-1（加载工作区）、FLOW-3（摘录为笔记）、FLOW-4（编辑并保存）、
 * FLOW-6（切换主会话）、FLOW-8（删除辅助会话）、FLOW-7（搜索）。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick, ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
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
  ensureConversation: vi.fn(async () => true),
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

/**
 * 每个用例结束都卸载组件：下拉浮层是 Teleport 到 body 的，
 * 不卸载的话旧浮层会留在 body 里，下一个用例的 document.body 查询会命中上一个的残留。
 */
const mountedWrappers: ReturnType<typeof mount>[] = []

afterEach(() => {
  for (const w of mountedWrappers.splice(0)) w.unmount()
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
  mountedWrappers.push(wrapper)

  await workspace.whenLoaded()
  await nextTick()
  await nextTick()
  return { wrapper, workspace, scopeId, panel }
}

/**
 * 展开下拉浮层并返回其中的条目。
 *
 * 展开按钮是 toggle：已经在展开状态时再点会关掉。所以先看 body 里有没有浮层，
 * 没有才点一次 —— 单击就能确定地展开，不依赖「点几次」。
 */
async function openDropdown(
  wrapper: ReturnType<typeof mount>,
  trigger: string,
  dropdownClass: string,
  itemClass: string
): Promise<HTMLElement[]> {
  if (!document.body.querySelector(`.${dropdownClass}`)) {
    await wrapper.find(trigger).trigger('click')
    await nextTick()
  }
  const dropdown = document.body.querySelector<HTMLElement>(`.${dropdownClass}`)
  expect(dropdown).not.toBeNull()
  return Array.from(dropdown!.querySelectorAll<HTMLElement>(`.${itemClass}`))
}

/** 展开辅助会话下拉，返回会话条目 */
async function openConvDropdown(wrapper: ReturnType<typeof mount>): Promise<HTMLElement[]> {
  return openDropdown(wrapper, '.conv-entry-btn', 'conv-dropdown', 'conv-item')
}

/** 展开笔记下拉，返回笔记条目 */
async function openNotesDropdown(wrapper: ReturnType<typeof mount>): Promise<HTMLElement[]> {
  return openDropdown(wrapper, '.notes-title', 'notes-dropdown', 'note-item')
}

describe('FLOW-1 打开辅助面板并加载工作区', () => {
  it('同时显示该工作区的辅助会话与笔记列表', async () => {
    const { wrapper } = await mountPanel()

    const convs = await openConvDropdown(wrapper)
    expect(convs.map(el => el.querySelector('.conv-item-title')?.textContent)).toEqual([
      '会话A',
      '会话B',
    ])

    const notes = await openNotesDropdown(wrapper)
    expect(notes.map(el => el.querySelector('.note-item-title')?.textContent)).toEqual([
      '索引优化结论',
    ])
  })

  it('激活项取自工作区状态', async () => {
    const { wrapper } = await mountPanel()

    const convs = await openConvDropdown(wrapper)
    expect(convs[1].classList.contains('active')).toBe(true)

    const notes = await openNotesDropdown(wrapper)
    expect(notes[0].classList.contains('active')).toBe(true)
  })
})

describe('FR-3.1 从下拉浮层切换辅助会话', () => {
  it('浮层列出全部辅助会话，点击后切换激活会话', async () => {
    const { wrapper } = await mountPanel()

    const convs = await openConvDropdown(wrapper)
    expect(convs.map(el => el.querySelector('.conv-item-title')?.textContent)).toEqual([
      '会话A',
      '会话B',
    ])

    // 初始激活的是工作区状态里记录的会话B
    expect(wrapper.find('.conv-entry-title').text()).toBe('会话B')

    convs[0].dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushPromises()
    await nextTick()

    expect(workspaceMock.setActive).toHaveBeenCalledWith('scope-1', { convId: 'a' })
    expect(wrapper.find('.conv-entry-title').text()).toBe('会话A')
  })
})

describe('FR-3.5 重命名当前辅助会话', () => {
  it('标题右侧的重命名按钮弹出改名框，确认后同步到主进程', async () => {
    const { wrapper } = await mountPanel()

    expect(wrapper.find('.conv-rename-btn').exists()).toBe(true)
    await wrapper.find('.conv-rename-btn').trigger('click')
    await nextTick()

    // 改名框 Teleport 到 body，只能从 body 上取
    const input = document.body.querySelector<HTMLInputElement>('.modal-input')
    expect(input).not.toBeNull()
    expect(input!.value).toBe('会话B')

    input!.value = '新的会话名'
    input!.dispatchEvent(new Event('input'))
    await nextTick()

    document.body.querySelector<HTMLButtonElement>('.modal-btn.confirm')!.click()
    await flushPromises()

    expect(assistantMock.rename).toHaveBeenCalledWith('b', '新的会话名')
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

    const notes = await openNotesDropdown(wrapper)
    expect(notes).toHaveLength(2)
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
    const notes = await openNotesDropdown(wrapper)
    expect(notes.map(el => el.querySelector('.note-item-title')?.textContent)).toEqual([
      '另一个工作区的笔记',
    ])
  })
})

describe('FLOW-8 删除辅助会话', () => {
  it('删除后该会话从列表消失，该工作区的笔记保留', async () => {
    const { wrapper } = await mountPanel()

    const convs = await openConvDropdown(wrapper)
    const del = convs[0].querySelector<HTMLElement>('.conv-item-del')
    del?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushPromises()

    expect(assistantMock.deleteSession).toHaveBeenCalledWith('a')

    // 点浮层内部会收起下拉，重新展开看列表
    const after = await openConvDropdown(wrapper)
    expect(after.map(el => el.querySelector('.conv-item-title')?.textContent)).toEqual(['会话B'])

    const notes = await openNotesDropdown(wrapper)
    expect(notes).toHaveLength(1)
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

    expect(wrapper.find('.group-title').text()).toBe('笔记 (1)')

    await wrapper.find('.result-item').trigger('click')

    expect(wrapper.findComponent(AssistantSearch).emitted('navigate')).toEqual([
      [{ type: 'note', scopeId: 'scope-1', noteId: 'n1' }],
    ])
  })
})
