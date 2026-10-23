/**
 * 右侧两个面板互斥：辅助面板与灵感大全同时只展开一个。
 *
 * 灵感大全是聊天页的常驻入口，辅助面板是嵌套侧栏，两者都占右侧空间，
 * 所以打开一个必须先收起另一个。
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
  list: vi.fn(async () => [mainSession('conv-1', '会话一')]),
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

const ChatTopToolbarStub = {
  props: {
    sessionTitle: { type: String, default: '' },
    assistantActive: { type: Boolean, default: false },
    inspirationActive: { type: Boolean, default: false },
  },
  emits: ['toggle-assistant', 'toggle-inspiration'],
  template: `
    <div>
      <button class="open-assistant" @click="$emit('toggle-assistant')"></button>
      <button class="open-inspiration" @click="$emit('toggle-inspiration')"></button>
      <span class="assistant-state">{{ assistantActive }}</span>
      <span class="inspiration-state">{{ inspirationActive }}</span>
    </div>
  `,
}

async function mountChat() {
  const wrapper = mount(AiChat, {
    global: {
      stubs: {
        ChatSidebar: true,
        ChatTopToolbar: ChatTopToolbarStub,
        MessagesArea: { methods: { forceScrollToBottom: () => {} }, template: '<div></div>' },
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

/** 灵感面板是否展开（收起时宽度归零） */
function inspirationExpanded(wrapper: Awaited<ReturnType<typeof mountChat>>): boolean {
  return !wrapper.find('.inspiration-panel').classes().includes('collapsed')
}

async function clickAssistant(wrapper: Awaited<ReturnType<typeof mountChat>>) {
  await wrapper.find('.open-assistant').trigger('click')
  await flushPromises()
  await nextTick()
}

async function clickInspiration(wrapper: Awaited<ReturnType<typeof mountChat>>) {
  await wrapper.find('.open-inspiration').trigger('click')
  await flushPromises()
  await nextTick()
}

describe('辅助面板与灵感大全互斥', () => {
  it('打开辅助面板时灵感大全收起', async () => {
    const wrapper = await mountChat()

    expect(inspirationExpanded(wrapper)).toBe(false)

    await clickAssistant(wrapper)

    expect(wrapper.find('.assistant-panel').exists()).toBe(true)
    expect(inspirationExpanded(wrapper)).toBe(false)
    expect(wrapper.find('.inspiration-state').text()).toBe('false')
  })

  it('辅助面板打开时点灵感大全：关闭辅助面板、展开灵感大全', async () => {
    const wrapper = await mountChat()
    await clickAssistant(wrapper)

    await clickInspiration(wrapper)

    expect(wrapper.find('.assistant-panel').exists()).toBe(false)
    expect(inspirationExpanded(wrapper)).toBe(true)
    expect(wrapper.find('.inspiration-state').text()).toBe('true')
  })

  it('灵感大全打开时点辅助面板：收起灵感大全、展开辅助面板', async () => {
    const wrapper = await mountChat()
    await clickInspiration(wrapper)
    expect(inspirationExpanded(wrapper)).toBe(true)

    await clickAssistant(wrapper)

    expect(wrapper.find('.assistant-panel').exists()).toBe(true)
    expect(inspirationExpanded(wrapper)).toBe(false)
  })

  it('灵感大全收起后可以再次展开（不依赖辅助面板）', async () => {
    const wrapper = await mountChat()

    await clickInspiration(wrapper)
    expect(inspirationExpanded(wrapper)).toBe(true)

    await clickInspiration(wrapper)
    expect(inspirationExpanded(wrapper)).toBe(false)

    await clickInspiration(wrapper)
    expect(inspirationExpanded(wrapper)).toBe(true)
  })

  it('笔记有未保存修改时点灵感大全：辅助面板保持打开，灵感不展开', async () => {
    const wrapper = await mountChat()
    await clickAssistant(wrapper)

    const el = wrapper.find('.editor-content').element as HTMLElement
    el.innerHTML = '<p>改过的内容</p>'
    await wrapper.find('.editor-content').trigger('input')
    await nextTick()

    await clickInspiration(wrapper)

    expect(wrapper.find('.assistant-panel').exists()).toBe(true)
    expect(inspirationExpanded(wrapper)).toBe(false)
    expect(wrapper.find('.unsaved-bar').exists()).toBe(true)
  })
})
