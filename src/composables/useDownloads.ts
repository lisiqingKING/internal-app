import { onScopeDispose, ref, shallowRef } from 'vue'

export type DownloadStatus =
  | 'queued' | 'downloading' | 'paused'
  | 'completed' | 'failed' | 'canceled'

export interface DownloadTask {
  id: string
  url: string
  method: string
  postBody: string | null
  headers: Record<string, string>
  filename: string
  saveDir: string
  totalBytes: number | null
  receivedBytes: number
  status: DownloadStatus
  error: string | null
  referrer: string | null
  mimeType: string | null
  createdAt: number
  updatedAt: number
}

export interface DownloadProgress {
  id: string
  status: DownloadStatus
  receivedBytes: number
  totalBytes: number | null
  speed: number
  error?: string
}

export type DownloadEvent =
  | { type: 'added'; task: DownloadTask }
  | { type: 'progress'; progress: DownloadProgress }
  | { type: 'removed'; id: string }

interface DownloadsAPI {
  list(): Promise<DownloadTask[]>
  add(input: {
    url: string
    filename?: string
    method?: 'GET' | 'POST'
    postBody?: string | null
    headers?: Record<string, string>
  }): Promise<DownloadTask>
  pause(id: string): Promise<boolean>
  resume(id: string): Promise<boolean>
  cancel(id: string): Promise<boolean>
  remove(id: string): Promise<boolean>
  reveal(id: string): Promise<void>
  openFile(id: string): Promise<void>
  clear(): Promise<number>
}

const EVENT_CHANNEL = 'downloads:event'
const LIST_CHANGED_CHANNEL = 'downloads:list-changed'

export function useDownloads() {
  const downloads = window.bridge.getModules(['downloads']).downloads as unknown as DownloadsAPI
  const tasks = ref<DownloadTask[]>([])
  const progressMap = shallowRef<Map<string, DownloadProgress>>(new Map())
  const loading = ref(true)

  async function refresh() {
    try {
      const list = await downloads.list()
      tasks.value = list || []
    } catch (err) {
      console.error('[useDownloads] refresh failed:', err)
    } finally {
      loading.value = false
    }
  }

  function onEvent(_event: any, payload: DownloadEvent) {
    if (!payload) return
    if (payload.type === 'added') {
      const idx = tasks.value.findIndex((t) => t.id === payload.task.id)
      if (idx >= 0) {
        tasks.value[idx] = payload.task
      } else {
        tasks.value = [payload.task, ...tasks.value]
      }
    } else if (payload.type === 'progress') {
      // 同步 status / receivedBytes / totalBytes 到 tasks 数组 (event 流驱动, 不依赖 list() 全量拉)
      const idx = tasks.value.findIndex((t) => t.id === payload.progress.id)
      if (idx >= 0) {
        const cur = tasks.value[idx]
        const next = { ...cur, status: payload.progress.status, receivedBytes: payload.progress.receivedBytes, totalBytes: payload.progress.totalBytes ?? cur.totalBytes }
        tasks.value = [...tasks.value.slice(0, idx), next, ...tasks.value.slice(idx + 1)]
      }
      const next = new Map(progressMap.value)
      next.set(payload.progress.id, payload.progress)
      progressMap.value = next
    } else if (payload.type === 'removed') {
      tasks.value = tasks.value.filter((t) => t.id !== payload.id)
      const next = new Map(progressMap.value)
      next.delete(payload.id)
      progressMap.value = next
    }
  }

  // list-changed 不再调 refresh() (refresh 会拉全量, 暴露 DB 残留). UI 走 event 流增量更新.
  function onListChanged() {
    // no-op: added/progress/removed 三个 event 事件已经覆盖了所有 UI 变更
  }

  window.bridge.on(EVENT_CHANNEL, onEvent)
  window.bridge.on(LIST_CHANGED_CHANNEL, onListChanged)

  onScopeDispose(() => {
    window.bridge.off(EVENT_CHANNEL, onEvent)
    window.bridge.off(LIST_CHANGED_CHANNEL, onListChanged)
  })

  refresh()

  async function addTask(input: Parameters<DownloadsAPI['add']>[0]) {
    return await downloads.add(input)
  }

  async function pause(id: string) {
    return await downloads.pause(id)
  }

  async function resume(id: string) {
    return await downloads.resume(id)
  }

  async function cancel(id: string) {
    return await downloads.cancel(id)
  }

  async function remove(id: string) {
    return await downloads.remove(id)
  }

  async function reveal(id: string) {
    return await downloads.reveal(id)
  }

  async function openFile(id: string) {
    return await downloads.openFile(id)
  }

  async function clearAll() {
    return await downloads.clear()
  }

  return {
    tasks,
    progressMap,
    loading,
    refresh,
    addTask,
    pause,
    resume,
    cancel,
    remove,
    reveal,
    openFile,
    clearAll,
  }
}
