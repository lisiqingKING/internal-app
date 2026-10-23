/**
 * 笔记区 —— 状态层 + 组件层测试。
 *
 * 对应需求文档 docs/ASSISTANT_PANEL.md 的 FR-4（笔记）、
 * FLOW-4（编辑并保存）、FLOW-5（未保存修改的处理）、NFR-S2 / NFR-S3 / NFR-R5。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import AssistantNotes from '../src/views/ai/components/assistant/AssistantNotes.vue'
import { useAssistantNotes, type NoteRow } from '../src/views/ai/composables/assistant/useAssistantNotes'
import {
  ASSISTANT_WORKSPACE,
  type AssistantWorkspace,
} from '../src/views/ai/composables/assistant/useAssistantWorkspace'

// ===== 主进程模块 mock =====

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

vi.mock('element-plus', () => ({
  ElMessage: { error: vi.fn() },
  ElMessageBox: { confirm: vi.fn(async () => true) },
}))

const { ElMessageBox } = await import('element-plus')

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
      const map: Record<string, unknown> = { notes: notesMock, workspace: workspaceMock }
      const result: Record<string, unknown> = {}
      for (const name of names) result[name] = map[name]
      return result
    },
  }
  notesMock.list.mockResolvedValue([])
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
    activeConvId: null,
    activeNoteId: null,
  })
  workspaceMock.setActive.mockResolvedValue(true)
})

// ===== 状态层 =====

describe('FR-4.8 手动新建笔记', () => {
  it('新建笔记 sourceType 为 manual，默认标题「新笔记」', async () => {
    const notes = useAssistantNotes()
    await notes.load('scope-1')
    await notes.newNote()

    const input = notesMock.create.mock.calls[0][0]
    expect(input.scopeId).toBe('scope-1')
    expect(input.sourceType).toBe('manual')
    expect(notes.notes.value[0].title).toBe('新笔记')
  })

  it('新建后该笔记成为编辑目标', async () => {
    const notes = useAssistantNotes()
    await notes.load('scope-1')
    await notes.newNote()

    expect(notes.activeNoteId.value).toBe('note-new')
  })
})

describe('FLOW-4 编辑并保存笔记', () => {
  it('编辑过程不落库，只有点击保存才调用 update', async () => {
    notesMock.list.mockResolvedValue([note({ id: 'n1', title: '原标题', content: '<p>原文</p>' })])
    const notes = useAssistantNotes()
    await notes.load('scope-1')

    notes.setDraftTitle('新标题')
    notes.setDraftContent('<p>改过的内容</p>')

    expect(notesMock.update).not.toHaveBeenCalled()
    expect(notes.dirty.value).toBe(true)
  })

  it('保存时把标题与正文写回数据库，并同步草稿', async () => {
    notesMock.list.mockResolvedValue([note({ id: 'n1', title: '原标题', content: '<p>原文</p>' })])
    const notes = useAssistantNotes()
    await notes.load('scope-1')

    notes.setDraftTitle('新标题')
    notes.setDraftContent('<p>改过的内容</p>')
    const ok = await notes.save()

    expect(ok).toBe(true)
    expect(notesMock.update).toHaveBeenCalledWith('n1', {
      title: '新标题',
      content: '<p>改过的内容</p>',
    })
    expect(notes.dirty.value).toBe(false)
  })

  it('NFR-S2 保存前过滤 script 标签与事件属性', async () => {
    notesMock.list.mockResolvedValue([note({ id: 'n1' })])
    const notes = useAssistantNotes()
    await notes.load('scope-1')

    notes.setDraftContent('<p onclick="alert(1)">正文</p><script>alert(2)</script>')
    await notes.save()

    const saved = notesMock.update.mock.calls[0][1].content
    expect(saved).not.toContain('script')
    expect(saved).not.toContain('onclick')
    expect(saved).toContain('正文')
  })
})

describe('FR-4.9 笔记内容长度上限', () => {
  it('超过 1MB 时拒绝写入并保留草稿', async () => {
    notesMock.list.mockResolvedValue([note({ id: 'n1' })])
    const notes = useAssistantNotes()
    await notes.load('scope-1')

    notes.setDraftContent('x'.repeat(1024 * 1024 + 1))

    await expect(notes.save()).rejects.toThrow('1MB')
    expect(notesMock.update).not.toHaveBeenCalled()
    expect(notes.draftContent.value.length).toBe(1024 * 1024 + 1)
  })
})

describe('FLOW-5 未保存修改的处理', () => {
  it('无未保存修改时切换动作立即执行', async () => {
    notesMock.list.mockResolvedValue([note({ id: 'n1' }), note({ id: 'n2' })])
    const notes = useAssistantNotes()
    await notes.load('scope-1')

    let switched = false
    const executed = notes.requestSwitch(() => {
      switched = true
    })

    expect(executed).toBe(true)
    expect(switched).toBe(true)
    expect(notes.pendingAction.value).toBe(null)
  })

  it('有未保存修改时切换被挂起，等待用户确认', async () => {
    notesMock.list.mockResolvedValue([note({ id: 'n1' }), note({ id: 'n2' })])
    const notes = useAssistantNotes()
    await notes.load('scope-1')
    notes.setDraftContent('改过的内容')

    let switched = false
    const executed = notes.requestSwitch(() => {
      switched = true
    })

    expect(executed).toBe(false)
    expect(switched).toBe(false)
    expect(notes.pendingAction.value).not.toBe(null)
  })

  it('确认后执行挂起的动作', async () => {
    notesMock.list.mockResolvedValue([note({ id: 'n1' }), note({ id: 'n2' })])
    const notes = useAssistantNotes()
    await notes.load('scope-1')
    notes.setDraftContent('改过的内容')

    let switched = false
    notes.requestSwitch(() => {
      switched = true
    })
    notes.runPendingAction()

    expect(switched).toBe(true)
    expect(notes.pendingAction.value).toBe(null)
  })

  it('取消切换后挂起的动作不再执行', async () => {
    notesMock.list.mockResolvedValue([note({ id: 'n1' }), note({ id: 'n2' })])
    const notes = useAssistantNotes()
    await notes.load('scope-1')
    notes.setDraftContent('改过的内容')

    let switched = false
    notes.requestSwitch(() => {
      switched = true
    })
    notes.cancelPendingAction()
    notes.runPendingAction()

    expect(switched).toBe(false)
    expect(notes.pendingAction.value).toBe(null)
  })

  it('多个挂起动作排队而不是互相覆盖，确认后依次执行', async () => {
    notesMock.list.mockResolvedValue([note({ id: 'n1' }), note({ id: 'n2' }), note({ id: 'n3' })])
    const notes = useAssistantNotes()
    await notes.load('scope-1')
    notes.setDraftContent('改过的内容')

    const executed: string[] = []
    notes.requestSwitch(() => executed.push('切到 n2'))
    notes.requestSwitch(() => executed.push('切到 n3'))

    // 两个动作都挂起了，没有一个被覆盖掉
    expect(executed).toEqual([])
    expect(notes.pendingAction.value).not.toBe(null)

    notes.runPendingAction()
    expect(executed).toEqual(['切到 n2', '切到 n3'])
    expect(notes.pendingAction.value).toBe(null)
  })
})

describe('FR-4.10 删除笔记', () => {
  it('删除后从列表移除并激活剩余笔记', async () => {
    notesMock.list.mockResolvedValue([note({ id: 'n1' }), note({ id: 'n2' })])
    const notes = useAssistantNotes()
    await notes.load('scope-1')

    await notes.remove('n1')

    expect(notesMock.delete).toHaveBeenCalledWith('n1')
    expect(notes.notes.value.map(n => n.id)).toEqual(['n2'])
    expect(notes.activeNoteId.value).toBe('n2')
  })
})

describe('FLOW-1 加载工作区的笔记', () => {
  it('激活工作区状态里记录的那条笔记', async () => {
    notesMock.list.mockResolvedValue([note({ id: 'n1' }), note({ id: 'n2' })])
    workspaceMock.getState.mockResolvedValue({
      scopeId: 'scope-1',
      activeConvId: null,
      activeNoteId: 'n2',
    })

    const notes = useAssistantNotes()
    await notes.load('scope-1')

    expect(notes.activeNoteId.value).toBe('n2')
  })

  it('没有状态记录时激活列表首项', async () => {
    notesMock.list.mockResolvedValue([note({ id: 'n1' }), note({ id: 'n2' })])

    const notes = useAssistantNotes()
    await notes.load('scope-1')

    expect(notes.activeNoteId.value).toBe('n1')
  })

  it('乱序加载时旧工作区的响应被丢弃', async () => {
    // scope-1 的 list 慢，scope-2 的 list 快：后发先至
    let resolveScope1!: (rows: NoteRow[]) => void
    notesMock.list.mockImplementation((scopeId: string) => {
      if (scopeId === 'scope-1') {
        return new Promise<NoteRow[]>(res => {
          resolveScope1 = res
        })
      }
      return Promise.resolve([note({ id: 'n2', scopeId: 'scope-2' })])
    })
    workspaceMock.getState.mockResolvedValue({
      scopeId: 'scope-2',
      activeConvId: null,
      activeNoteId: null,
    })

    const notes = useAssistantNotes()
    const first = notes.load('scope-1')
    await notes.load('scope-2')
    resolveScope1([note({ id: 'n1', scopeId: 'scope-1' })])
    await first

    expect(notes.notes.value.map(n => n.id)).toEqual(['n2'])
    expect(notes.activeNoteId.value).toBe('n2')
  })
})

// ===== 组件层 =====

/**
 * 每个用例结束都卸载组件：下拉浮层是 Teleport 到 body 的，
 * 不卸载的话旧浮层会留在 body 里，下一个用例的 document.body 查询会命中上一个的残留。
 */
const mountedWrappers: ReturnType<typeof mount>[] = []

afterEach(() => {
  for (const w of mountedWrappers.splice(0)) w.unmount()
})

async function mountNotes(notes = useAssistantNotes()) {
  await notes.load('scope-1')
  const workspace = {
    scopeId: ref<string | null>('scope-1'),
    notes,
    conversations: null,
    highlight: ref(null),
    setHighlight: () => {},
    ready: ref(true),
    whenLoaded: () => Promise.resolve(),
  } as unknown as AssistantWorkspace

  const wrapper = mount(AssistantNotes, {
    global: { provide: { [ASSISTANT_WORKSPACE as symbol]: workspace } },
  })
  mountedWrappers.push(wrapper)
  await nextTick()
  return { wrapper, notes }
}

/** 模拟在 contenteditable 里输入内容 */
async function typeContent(wrapper: ReturnType<typeof mount>, html: string) {
  const el = wrapper.find('.editor-content').element as HTMLElement
  el.innerHTML = html
  await wrapper.find('.editor-content').trigger('input')
}

/**
 * 笔记列表收在下拉浮层里（Teleport 到 body），断言前先展开。
 *
 * 展开按钮是 toggle：已经在展开状态时再点会关掉。所以先看 body 里有没有浮层，
 * 没有才点一次 —— 单击就能确定地展开，不依赖「点几次」。
 */
async function openNotesDropdown(wrapper: ReturnType<typeof mount>): Promise<HTMLElement[]> {
  if (!document.body.querySelector('.notes-dropdown')) {
    await wrapper.find('.notes-title').trigger('click')
    await nextTick()
  }
  const dropdown = document.body.querySelector<HTMLElement>('.notes-dropdown')
  expect(dropdown).not.toBeNull()
  return Array.from(dropdown!.querySelectorAll<HTMLElement>('.note-item'))
}

/** 浮层里各条笔记的标题 */
function itemTitles(items: HTMLElement[]): (string | null)[] {
  return items.map(el => el.querySelector('.note-item-title')?.textContent)
}

/** 点击浮层里的某条笔记 */
async function clickNote(items: HTMLElement[], index: number) {
  items[index].dispatchEvent(new MouseEvent('click', { bubbles: true }))
  await nextTick()
}

describe('FR-4.1 笔记区结构', () => {
  it('渲染笔记数量与每条笔记的标题', async () => {
    notesMock.list.mockResolvedValue([
      note({ id: 'n1', title: '索引优化结论' }),
      note({ id: 'n2', title: '性能测试' }),
    ])

    const { wrapper } = await mountNotes()

    expect(wrapper.find('.notes-title').text()).toContain('2')
    const items = await openNotesDropdown(wrapper)
    expect(itemTitles(items)).toEqual(['索引优化结论', '性能测试'])
  })

  it('当前编辑的笔记高亮', async () => {
    notesMock.list.mockResolvedValue([note({ id: 'n1' }), note({ id: 'n2' })])

    const { wrapper } = await mountNotes()

    const items = await openNotesDropdown(wrapper)
    expect(items[0].classList.contains('active')).toBe(true)
  })

  it('没有笔记时显示空状态', async () => {
    const { wrapper } = await mountNotes()

    await openNotesDropdown(wrapper)
    expect(document.body.querySelector('.notes-dropdown .notes-empty')).not.toBeNull()
    expect(wrapper.find('.editor-empty').exists()).toBe(true)
  })
})

describe('FR-4.3 笔记标题可编辑', () => {
  it('标题输入框显示当前笔记标题', async () => {
    notesMock.list.mockResolvedValue([note({ id: 'n1', title: '原标题' })])

    const { wrapper } = await mountNotes()

    expect((wrapper.find('.editor-title').element as HTMLInputElement).value).toBe('原标题')
  })

  it('修改标题后进入未保存状态', async () => {
    notesMock.list.mockResolvedValue([note({ id: 'n1', title: '原标题' })])

    const { wrapper, notes } = await mountNotes()
    await wrapper.find('.editor-title').setValue('新标题')

    expect(notes.draftTitle.value).toBe('新标题')
    expect(notes.dirty.value).toBe(true)
  })
})

describe('FR-4.5 手动保存', () => {
  it('没有修改时保存按钮禁用', async () => {
    notesMock.list.mockResolvedValue([note({ id: 'n1' })])

    const { wrapper } = await mountNotes()

    expect(wrapper.find('.editor-save').attributes('disabled')).toBeDefined()
  })

  it('点击保存才写入数据库', async () => {
    notesMock.list.mockResolvedValue([note({ id: 'n1', content: '<p>原文</p>' })])
    const { wrapper } = await mountNotes()

    await typeContent(wrapper, '<p>改过的内容</p>')
    await wrapper.find('.editor-save').trigger('click')
    await nextTick()

    expect(notesMock.update).toHaveBeenCalledTimes(1)
    expect(notesMock.update.mock.calls[0][1].content).toBe('<p>改过的内容</p>')
  })
})

describe('FR-4.6 / FLOW-5 未保存确认条', () => {
  it('有未保存修改时切换笔记出现行内确认条，而不是弹窗', async () => {
    notesMock.list.mockResolvedValue([note({ id: 'n1' }), note({ id: 'n2' })])
    const { wrapper, notes } = await mountNotes()

    await typeContent(wrapper, '<p>改过的内容</p>')
    const items = await openNotesDropdown(wrapper)
    await clickNote(items, 1)

    expect(wrapper.find('.unsaved-bar').exists()).toBe(true)
    expect(ElMessageBox.confirm).not.toHaveBeenCalled()
    expect(notes.activeNoteId.value).toBe('n1')
  })

  it('点击「保存」后落库并继续切换', async () => {
    notesMock.list.mockResolvedValue([note({ id: 'n1' }), note({ id: 'n2' })])
    const { wrapper, notes } = await mountNotes()

    await typeContent(wrapper, '<p>改过的内容</p>')
    const items = await openNotesDropdown(wrapper)
    await clickNote(items, 1)
    await wrapper.find('.unsaved-save').trigger('click')
    await nextTick()
    await nextTick()

    expect(notesMock.update).toHaveBeenCalledTimes(1)
    expect(notes.activeNoteId.value).toBe('n2')
  })

  it('点击「放弃」丢弃草稿并继续切换', async () => {
    notesMock.list.mockResolvedValue([note({ id: 'n1' }), note({ id: 'n2' })])
    const { wrapper, notes } = await mountNotes()

    await typeContent(wrapper, '<p>改过的内容</p>')
    const items = await openNotesDropdown(wrapper)
    await clickNote(items, 1)
    await wrapper.find('.unsaved-discard').trigger('click')
    await nextTick()

    expect(notesMock.update).not.toHaveBeenCalled()
    expect(notes.activeNoteId.value).toBe('n2')
  })

  it('点击「取消切换」停留在原笔记', async () => {
    notesMock.list.mockResolvedValue([note({ id: 'n1' }), note({ id: 'n2' })])
    const { wrapper, notes } = await mountNotes()

    await typeContent(wrapper, '<p>改过的内容</p>')
    const items = await openNotesDropdown(wrapper)
    await clickNote(items, 1)
    await wrapper.find('.unsaved-cancel').trigger('click')
    await nextTick()

    expect(wrapper.find('.unsaved-bar').exists()).toBe(false)
    expect(notes.activeNoteId.value).toBe('n1')
  })
})

describe('FR-4.10 删除笔记需要二次确认', () => {
  it('确认后调用删除接口并从列表移除', async () => {
    notesMock.list.mockResolvedValue([note({ id: 'n1' }), note({ id: 'n2' })])
    const { wrapper } = await mountNotes()

    const items = await openNotesDropdown(wrapper)
    const del = items[0].querySelector<HTMLElement>('.note-item-delete')
    del?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await nextTick()

    expect(ElMessageBox.confirm).toHaveBeenCalled()
    expect(notesMock.delete).toHaveBeenCalledWith('n1')
  })
})
