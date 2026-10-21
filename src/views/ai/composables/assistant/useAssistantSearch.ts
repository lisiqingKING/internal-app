import { ref, type Ref } from 'vue'

export interface NoteHit {
  noteId: string
  title: string
  scopeId: string
  scopeTitle: string | null
  snippet: string
}

export interface MessageHit {
  msgId: string
  convId: string
  convTitle: string
  scopeId: string
  scopeTitle: string | null
  snippet: string
}

export interface SearchResults {
  notes: NoteHit[]
  messages: MessageHit[]
}

/** FR-5.5 输入防抖 200ms */
export const SEARCH_DEBOUNCE_MS = 200

export interface SearchNavigateTarget {
  type: 'note' | 'message'
  /** 所属工作区（主会话 convId） */
  scopeId: string
  noteId?: string
  /** 消息所在会话（主会话或辅助会话） */
  convId?: string
  msgId?: string
}

interface SearchApi {
  query(keyword: string): Promise<SearchResults>
}

export function searchApi(): SearchApi {
  return window.bridge.getModules(['search']).search as unknown as SearchApi
}

export interface AssistantSearchState {
  keyword: Ref<string>
  results: Ref<SearchResults>
  loading: Ref<boolean>
  /** 是否已经执行过至少一次搜索（区分「未搜索」与「无结果」） */
  searched: Ref<boolean>
  /** 查询失败信息：与「无结果」区分开，不能把错误伪装成空结果 */
  error: Ref<string | null>
  setKeyword: (keyword: string) => void
  queryNow: (keyword?: string) => Promise<void>
  clear: () => void
}

export function useAssistantSearch(): AssistantSearchState {
  const keyword = ref('')
  const results = ref<SearchResults>({ notes: [], messages: [] })
  const loading = ref(false)
  const searched = ref(false)
  const error = ref<string | null>(null)

  let timer: ReturnType<typeof setTimeout> | null = null
  // 请求序号：只有最后一次请求的结果会被采纳
  let ticket = 0

  async function queryNow(kw: string = keyword.value) {
    const trimmed = kw.trim()
    if (!trimmed) {
      results.value = { notes: [], messages: [] }
      searched.value = false
      error.value = null
      loading.value = false
      return
    }

    const current = ++ticket
    loading.value = true
    error.value = null
    try {
      const res = await searchApi().query(trimmed)
      if (current !== ticket) return
      results.value = { notes: res?.notes ?? [], messages: res?.messages ?? [] }
      searched.value = true
    } catch (err) {
      if (current !== ticket) return
      results.value = { notes: [], messages: [] }
      searched.value = true
      error.value = err instanceof Error ? err.message : '搜索失败'
    } finally {
      if (current === ticket) loading.value = false
    }
  }

  function setKeyword(value: string) {
    keyword.value = value
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    if (!value.trim()) {
      ticket++
      results.value = { notes: [], messages: [] }
      searched.value = false
      error.value = null
      loading.value = false
      return
    }
    timer = setTimeout(() => {
      timer = null
      void queryNow(value)
    }, SEARCH_DEBOUNCE_MS)
  }

  function clear() {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    ticket++
    keyword.value = ''
    results.value = { notes: [], messages: [] }
    searched.value = false
    error.value = null
    loading.value = false
  }

  return { keyword, results, loading, searched, error, setKeyword, queryNow, clear }
}
