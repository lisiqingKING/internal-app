/**
 * 搜索面板 —— 状态层 + 组件层测试。
 *
 * 对应需求文档 docs/ASSISTANT_PANEL.md 的 FR-5（搜索）、FLOW-7（搜索并跳转）、NFR-P2。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import AssistantSearch from '../src/views/ai/components/assistant/AssistantSearch.vue'
import {
  useAssistantSearch,
  SEARCH_DEBOUNCE_MS,
} from '../src/views/ai/composables/assistant/useAssistantSearch'
import { highlightKeyword } from '../src/utils/highlight'

const searchMock = {
  query: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(window as unknown as { bridge: unknown }).bridge = {
    getModules: (names: string[]) => {
      const map: Record<string, unknown> = { search: searchMock }
      const result: Record<string, unknown> = {}
      for (const name of names) result[name] = map[name]
      return result
    },
  }
  searchMock.query.mockResolvedValue({ notes: [], messages: [] })
})

afterEach(() => {
  vi.useRealTimers()
})

const NOTE_HIT = {
  noteId: 'n1',
  title: '索引优化结论',
  scopeId: 'scope-1',
  scopeTitle: '性能讨论',
  snippet: '这次聊到了<mark>索引</mark>优化的问题',
}

const MESSAGE_HIT = {
  msgId: 'm1',
  convId: 'conv-assistant',
  convTitle: '辅助会话A',
  scopeId: 'scope-1',
  scopeTitle: '性能讨论',
  snippet: '提到了<mark>索引</mark>的选择',
}

// ===== 状态层 =====

describe('FR-5.5 输入防抖', () => {
  it('连续输入只在停顿后发起一次查询', async () => {
    vi.useFakeTimers()
    searchMock.query.mockResolvedValue({ notes: [], messages: [] })
    const search = useAssistantSearch()

    search.setKeyword('索')
    search.setKeyword('索引')
    search.setKeyword('索引优')
    expect(searchMock.query).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS)

    expect(searchMock.query).toHaveBeenCalledTimes(1)
    expect(searchMock.query).toHaveBeenCalledWith('索引优')
  })

  it('防抖时长为 200ms', () => {
    expect(SEARCH_DEBOUNCE_MS).toBe(200)
  })
})

describe('FR-5.2 搜索范围', () => {
  it('结果同时包含笔记与对话消息', async () => {
    searchMock.query.mockResolvedValue({ notes: [NOTE_HIT], messages: [MESSAGE_HIT] })
    const search = useAssistantSearch()

    await search.queryNow('索引')

    expect(search.results.value.notes).toHaveLength(1)
    expect(search.results.value.messages).toHaveLength(1)
    expect(search.results.value.notes[0].scopeTitle).toBe('性能讨论')
  })

  it('过期请求的结果被丢弃', async () => {
    let resolveFirst: (v: unknown) => void = () => {}
    searchMock.query
      .mockImplementationOnce(() => new Promise(resolve => { resolveFirst = resolve }))
      .mockResolvedValueOnce({ notes: [NOTE_HIT], messages: [] })
    const search = useAssistantSearch()

    const first = search.queryNow('索')
    const second = search.queryNow('索引')
    resolveFirst({ notes: [], messages: [] })
    await Promise.all([first, second])

    expect(search.results.value.notes).toHaveLength(1)
  })

  it('清空关键词后结果与搜索状态一起复位', async () => {
    searchMock.query.mockResolvedValue({ notes: [NOTE_HIT], messages: [] })
    const search = useAssistantSearch()

    await search.queryNow('索引')
    expect(search.searched.value).toBe(true)

    search.setKeyword('')

    expect(search.results.value.notes).toHaveLength(0)
    expect(search.searched.value).toBe(false)
  })
})

// ===== 组件层 =====

async function mountSearch() {
  const wrapper = mount(AssistantSearch)
  await nextTick()
  return wrapper
}

async function searchIn(wrapper: ReturnType<typeof mount>, keyword: string) {
  await wrapper.find('.search-input').setValue(keyword)
  await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS)
  await nextTick()
  await nextTick()
}

describe('FR-5.3 结果分组与标注', () => {
  it('按类型分组显示数量', async () => {
    vi.useFakeTimers()
    searchMock.query.mockResolvedValue({ notes: [NOTE_HIT], messages: [MESSAGE_HIT] })
    const wrapper = await mountSearch()

    await searchIn(wrapper, '索引')

    const groups = wrapper.findAll('.group-title').map(n => n.text())
    expect(groups).toEqual(['笔记 (1)', '对话 (1)'])
  })

  it('每条结果标注所属主会话标题', async () => {
    vi.useFakeTimers()
    searchMock.query.mockResolvedValue({ notes: [NOTE_HIT], messages: [MESSAGE_HIT] })
    const wrapper = await mountSearch()

    await searchIn(wrapper, '索引')

    const scopes = wrapper.findAll('.result-scope').map(n => n.text())
    expect(scopes).toEqual(['· 主会话「性能讨论」', '· 主会话「性能讨论」'])
  })

  it('匹配片段中的关键词被高亮', async () => {
    vi.useFakeTimers()
    searchMock.query.mockResolvedValue({ notes: [NOTE_HIT], messages: [] })
    const wrapper = await mountSearch()

    await searchIn(wrapper, '索引')

    expect(wrapper.find('.result-snippet').html()).toContain('<mark>索引</mark>')
  })

  it('没有结果时显示空态文案', async () => {
    vi.useFakeTimers()
    searchMock.query.mockResolvedValue({ notes: [], messages: [] })
    const wrapper = await mountSearch()

    await searchIn(wrapper, '不存在的词')

    expect(wrapper.find('.search-state').text()).toBe('没有找到匹配内容')
  })
})

describe('FLOW-7 点击结果跳转', () => {
  it('点击笔记结果携带工作区与笔记 id', async () => {
    vi.useFakeTimers()
    searchMock.query.mockResolvedValue({ notes: [NOTE_HIT], messages: [] })
    const wrapper = await mountSearch()

    await searchIn(wrapper, '索引')
    await wrapper.find('.result-item').trigger('click')

    expect(wrapper.emitted('navigate')).toEqual([
      [{ type: 'note', scopeId: 'scope-1', noteId: 'n1' }],
    ])
  })

  it('点击对话结果携带会话与消息 id', async () => {
    vi.useFakeTimers()
    searchMock.query.mockResolvedValue({ notes: [], messages: [MESSAGE_HIT] })
    const wrapper = await mountSearch()

    await searchIn(wrapper, '索引')
    await wrapper.find('.result-item').trigger('click')

    expect(wrapper.emitted('navigate')).toEqual([
      [
        {
          type: 'message',
          scopeId: 'scope-1',
          convId: 'conv-assistant',
          msgId: 'm1',
        },
      ],
    ])
  })
})

// ===== 关键词高亮工具 =====

describe('关键词高亮', () => {
  it('把匹配文本包进 mark', () => {
    expect(highlightKeyword('索引优化的问题', '索引')).toBe('<mark>索引</mark>优化的问题')
  })

  it('片段自带 mark 时不重复标记', () => {
    expect(highlightKeyword('聊到了<mark>索引</mark>优化', '索引')).toBe(
      '聊到了<mark>索引</mark>优化'
    )
  })

  it('先消毒再高亮，脚本标签不会残留', () => {
    const html = highlightKeyword('<p>索引</p><script>alert(1)</script>', '索引')
    expect(html).not.toContain('script')
    expect(html).toContain('<mark>索引</mark>')
  })

  it('不会破坏标签属性', () => {
    const html = highlightKeyword('<a href="/a" title="索引">索引</a>', '索引')
    expect(html).toContain('href="/a"')
    expect(html).toContain('<mark>索引</mark>')
  })
})
