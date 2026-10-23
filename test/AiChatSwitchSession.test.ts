/**
 * 左侧切换主会话 → 辅助面板关闭。
 *
 * 主会话切换后不再并排展示辅助面板；面板重新打开时加载新工作区。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import AiChat from '../src/views/ai/components/AiChat.vue'
import type { NoteRow } from '../src/views/ai/composables/assistant/useAssistantNotes'

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('element-plus', () => ({
  ElMessage: { warning: vi.fn(), error: vi.fn(), success: vi.fn() },
  ElMessageBox: { confirm: vi.fn(async () => true) },
}))

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

const workspaceMock = { getState: vi.fn(), setActive: vi.fn() }
const searchMock = { query: vi.fn() }
const settingsMock = { get: vi.fn(), set: vi.fn() }

const aiMock = {
  getActiveProfile: vi.fn(async () => ({
    apiUrl: 'https://example.com',
    apiKey: 'key',
    providerType: 'openai',
    model: 'model',
    systemPrompt: '',
  })),
  getSystemPromptsByIds: vi.fn(async () => []),
  getMessages: vi.fn(async () => []),
  chat: vi.fn(async () => ({ messageId: 'msg-1' })),
  abort: vi.fn(),
  ensureConversation: vi.fn(async () => true),
  onStart: vi.fn(() => () => {}),
  onChunk: vi.fn(() => () => {}),
  onComplete: vi.fn(() => () => {}),
  onHalted: vi.fn(() => () => {}),
  onError: vi.fn(() => () => {}),
}

function mainSession(convId: string, title: string) {
  return {
    convId,
    title,
    messages: [],
    createdAt: 1,
    updatedAt: 1,
    pinned: 0,
    categoryId: null,
    persisted: true,
  }
}

const electronAiMock = {
  list: vi.fn(async () => [mainSession('conv-1', '会话一'), mainSession('conv-2', '会话二')]),
  listCategories: vi.fn(async () => []),
  create: vi.fn(async (title: string) => mainSession('conv-new', title)),
  updateTitle: vi.fn(async () => {}),
  delete: vi.fn(async () => {}),
  updatePinned: vi.fn(async () => {}),
  createCategory: vi.fn(async (name: string) => ({ id: 'cat-1', name, ord: 0 })),
  renameCategory: vi.fn(async () => {}),
  deleteCategory: vi.fn(async () => {}),
  deleteCategoryWithSessions: vi.fn(async () => {}),
  reorderCategories: vi.fn(async () => {}),
  moveSession: vi.fn(async () => {}),
}

function note(partial: Partial<NoteRow> & { id: string }): NoteRow {
  return {
    scopeId: 'conv-1',
    title: '索引优化结论',
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
  ;(window as unknown as { electronApis: unknown }).electronApis = { ai: electronAiMock }

  assistantMock.list.mockResolvedValue([])
  assistantMock.create.mockResolvedValue({ convId: 'a1' })
  assistantMock.rename.mockResolvedValue(true)
  assistantMock.deleteSession.mockResolvedValue(true)
  assistantMock.reorder.mockResolvedValue(true)

  notesMock.list.mockResolvedValue([note({ id: 'n1' })])
  notesMock.update.mockImplementation(async (id: string, patch: any) =>
    note({ id, title: patch.title ?? '', content: patch.content ?? '' })
  )
  notesMock.delete.mockResolvedValue(true)
  notesMock.reorder.mockResolvedValue(true)

  workspaceMock.getState.mockResolvedValue({
    scopeId: 'conv-1',
    activeConvId: 'a1',
    activeNoteId: 'n1',
  })
  workspaceMock.setActive.mockResolvedValue(true)

  searchMock.query.mockResolvedValue({ notes: [], messages: [] })
  settingsMock.get.mockResolvedValue(null)
  settingsMock.set.mockResolvedValue(true)
})

// ===== 桩组件 =====

const ChatSidebarStub = {
  props: {
    sessions: { type: Array, default: () => [] },
    categories: { type: Array, default: () => [] },
    currentSessionId: { type: String, default: null },
  },
  emits: ['switch-session'],
  template: `<button class="switch-session" @click="$emit('switch-session', 'conv-2')"></button>`,
}

const MessagesAreaStub = {
  methods: { forceScrollToBottom: () => {} },
  template: `<div class="messages-area"></div>`,
}

const ChatTopToolbarStub = {
  props: {
    sessionTitle: { type: String, default: '' },
    assistantActive: { type: Boolean, default: false },
  },
  emits: ['toggle-assistant'],
  template: `<button class="open-assistant" @click="$emit('toggle-assistant')"></button>`,
}

async function mountChat() {
  const wrapper = mount(AiChat, {
    global: {
      stubs: {
        ChatSidebar: ChatSidebarStub,
        ChatTopToolbar: ChatTopToolbarStub,
        MessagesArea: MessagesAreaStub,
        InputArea: true,
        InspirationPanel: true,
        ChatEmptyState: true,
      },
    },
  })
  await flushPromises()
  await nextTick()
  return wrapper
}

/** 打开辅助面板并等工作区加载完成 */
async function openPanel(wrapper: Awaited<ReturnType<typeof mountChat>>) {
  await wrapper.find('.open-assistant').trigger('click')
  await flushPromises()
  await nextTick()
}

describe('左侧切换主会话时关闭辅助面板', () => {
  it('切换会话后面板关闭，主会话已切换', async () => {
    const wrapper = await mountChat()
    await openPanel(wrapper)

    expect(wrapper.find('.assistant-panel').exists()).toBe(true)

    await wrapper.find('.switch-session').trigger('click')
    await flushPromises()
    await nextTick()

    expect(wrapper.find('.assistant-panel').exists()).toBe(false)
    expect(wrapper.findComponent(ChatSidebarStub).props('currentSessionId')).toBe('conv-2')
  })

  it('切换会话时不再加载新工作区的数据（面板关闭，不触发加载）', async () => {
    const wrapper = await mountChat()
    await openPanel(wrapper)

    notesMock.list.mockClear()
    await wrapper.find('.switch-session').trigger('click')
    await flushPromises()
    await nextTick()

    expect(notesMock.list).not.toHaveBeenCalled()
  })

  it('笔记有未保存修改时先确认，保存后关闭面板并完成切换', async () => {
    const wrapper = await mountChat()
    await openPanel(wrapper)

    const el = wrapper.find('.editor-content').element as HTMLElement
    el.innerHTML = '<p>改过的内容</p>'
    await wrapper.find('.editor-content').trigger('input')
    await nextTick()

    await wrapper.find('.switch-session').trigger('click')
    await flushPromises()
    await nextTick()

    // 面板保持打开，出现行内确认条
    expect(wrapper.find('.assistant-panel').exists()).toBe(true)
    expect(wrapper.find('.unsaved-bar').exists()).toBe(true)

    await wrapper.find('.unsaved-save').trigger('click')
    await flushPromises()
    await nextTick()

    expect(notesMock.update).toHaveBeenCalled()
    expect(wrapper.find('.assistant-panel').exists()).toBe(false)
    expect(wrapper.findComponent(ChatSidebarStub).props('currentSessionId')).toBe('conv-2')
  })

  it('取消切换时面板保持打开，主会话不变', async () => {
    const wrapper = await mountChat()
    await openPanel(wrapper)

    const el = wrapper.find('.editor-content').element as HTMLElement
    el.innerHTML = '<p>改过的内容</p>'
    await wrapper.find('.editor-content').trigger('input')
    await nextTick()

    await wrapper.find('.switch-session').trigger('click')
    await flushPromises()
    await nextTick()

    await wrapper.find('.unsaved-cancel').trigger('click')
    await flushPromises()
    await nextTick()

    expect(wrapper.find('.assistant-panel').exists()).toBe(true)
    expect(wrapper.findComponent(ChatSidebarStub).props('currentSessionId')).toBe('conv-1')
  })
})
