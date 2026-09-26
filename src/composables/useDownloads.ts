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

  function onAdded(task: DownloadTask) {
    const idx = tasks.value.findIndex((t) => t.id === task.id)
    if (idx >= 0) {
      tasks.value[idx] = task
    } else {
      tasks.value = [task, ...tasks.value]
    }
  }

  function onProgress(progress: DownloadProgress) {
    const idx = tasks.value.findIndex((t) => t.id === progress.id)
    if (idx >= 0) {
      const cur = tasks.value[idx]
      const next = { ...cur, status: progress.status, receivedBytes: progress.receivedBytes, totalBytes: progress.totalBytes ?? cur.totalBytes }
      tasks.value[idx] = next
    }
    progressMap.value.set(progress.id, progress)
    progressMap.value = progressMap.value
  }

  function onRemoved(id: string) {
    const idx = tasks.value.findIndex((t) => t.id === id)
    if (idx >= 0) tasks.value.splice(idx, 1)
    progressMap.value.delete(id)
    progressMap.value = progressMap.value
  }

  const unsubAdded = window.bridge.on('downloads:added', onAdded)
  const unsubProgress = window.bridge.on('downloads:progress', onProgress)
  const unsubRemoved = window.bridge.on('downloads:removed', onRemoved)

  onScopeDispose(() => {
    unsubAdded()
    unsubProgress()
    unsubRemoved()
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
