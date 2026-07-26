<template>
  <div class="header">
    <div class="header-left">
      <h1>下载</h1>
      <p>正在下载和已下载的文件</p>
    </div>
    <div class="header-actions">
      <button class="clear-btn" :disabled="tasks.length === 0" @click="onClearAll">清空所有</button>
    </div>
  </div>

  <div class="downloads-scroll">
    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="tasks.length === 0" class="empty">暂无下载任务</div>
    <div v-else class="downloads-list">
      <div
        v-for="task in tasks"
        :key="task.id"
        class="download-item"
        :class="`status-${task.status}`"
      >
        <div class="download-main">
          <div class="download-info">
            <div class="filename-row">
              <span
                v-if="fileExt(task)"
                class="type-chip"
                :title="task.mimeType || fileExt(task)"
              >{{ fileExt(task) }}</span>
              <div class="download-filename" :title="task.filename">{{ task.filename }}</div>
            </div>
            <div class="download-meta">
              <span class="status-label">{{ statusLabel(task.status) }}</span>
              <span v-if="task.error" class="error-text" :title="task.error">· {{ task.error }}</span>
            </div>
          </div>

          <div class="download-progress">
            <div class="bar">
              <div class="fill" :style="{ width: progressPercent(task) + '%' }"></div>
            </div>
            <div class="progress-text">
              <span>{{ formatBytes(progressReceived(task)) }} / {{ formatBytes(task.totalBytes) }}</span>
              <span v-if="task.status === 'downloading' && progressSpeed(task) > 0">
                · {{ formatBytes(progressSpeed(task)) }}/s
              </span>
            </div>
          </div>
        </div>

        <div class="download-actions">
          <button
            v-if="task.status === 'downloading'"
            class="action-btn"
            title="暂停"
            @click="onPause(task.id)"
          >暂停</button>
          <button
            v-if="task.status === 'paused'"
            class="action-btn"
            title="继续"
            @click="onResume(task.id)"
          >继续</button>
          <button
            v-if="task.status === 'failed' || task.status === 'canceled'"
            class="action-btn"
            :title="task.status === 'failed' ? '重试' : '重新下载'"
            @click="onReAdd(task)"
          >重新下载</button>
          <button
            v-if="task.status === 'queued' || task.status === 'downloading' || task.status === 'paused'"
            class="action-btn danger"
            title="取消"
            @click="onCancel(task.id)"
          >取消</button>
          <button
            v-if="task.status === 'completed'"
            class="action-btn"
            title="在文件夹中显示"
            @click="onReveal(task.id)"
          >打开</button>
          <button
            class="action-btn danger"
            title="删除任务和文件"
            @click="onRemove(task.id)"
          >删除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useDownloads, type DownloadTask, type DownloadStatus } from '../composables/useDownloads'

document.title = '下载管理'

const {
  tasks,
  progressMap,
  loading,
  addTask,
  pause,
  resume,
  cancel,
  remove,
  reveal,
  clearAll,
} = useDownloads()

async function onPause(id: string) {
  await pause(id)
}

async function onResume(id: string) {
  await resume(id)
}

async function onReAdd(task: DownloadTask) {
  // 重新下载: 先删老 task + 老文件, 再用同 URL 创建新 task
  // (canceled 状态没有 in-flight I/O, remove 不会中断任何东西)
  try {
    await remove(task.id)
    await addTask({
      url: task.url,
      method: (task.method === 'POST' ? 'POST' : 'GET') as 'GET' | 'POST',
      postBody: task.method === 'POST' ? task.postBody : null,
    })
  } catch (err) {
    alert('重新下载失败: ' + (err as Error).message)
  }
}

async function onCancel(id: string) {
  await cancel(id)
}

async function onRemove(id: string) {
  if (!confirm('确定删除此下载任务和文件?')) return
  await remove(id)
}

async function onReveal(id: string) {
  await reveal(id)
}

async function onClearAll() {
  if (!confirm(`确定清空全部 ${tasks.length} 个下载任务和文件?`)) return
  try {
    await clearAll()
  } catch (err) {
    alert('清空失败: ' + (err as Error).message)
  }
}

function progressReceived(task: DownloadTask): number {
  const live = progressMap.value.get(task.id)
  return live?.receivedBytes ?? task.receivedBytes
}

function progressTotal(task: DownloadTask): number | null {
  const live = progressMap.value.get(task.id)
  if (live?.totalBytes != null) return live.totalBytes
  return task.totalBytes
}

function progressPercent(task: DownloadTask): number {
  const total = progressTotal(task)
  if (!total || total <= 0) return 0
  const received = progressReceived(task)
  return Math.min(100, Math.round((received / total) * 100))
}

function progressSpeed(task: DownloadTask): number {
  const live = progressMap.value.get(task.id)
  return live?.speed ?? 0
}

function formatBytes(n: number | null | undefined): string {
  if (n == null) return '—'
  if (n === 0) return '0 B'
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`
}

function statusLabel(s: DownloadStatus): string {
  switch (s) {
    case 'queued': return '排队中'
    case 'downloading': return '下载中'
    case 'paused': return '已暂停'
    case 'completed': return '已完成'
    case 'failed': return '失败'
    case 'canceled': return '已取消'
    default: return `未知(${String(s)})`
  }
}

// 从文件名末尾抽扩展名 (e.g. "report.pdf" -> "PDF"). 没扩展名返回空串, UI 隐藏 chip.
function fileExt(task: DownloadTask): string {
  const m = /\.([a-z0-9]+)$/i.exec(task.filename)
  return m ? m[1].toUpperCase() : ''
}
</script>

<style scoped>
.header {
  max-width: 720px;
  margin: 0 auto;
  padding: 32px 24px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left h1 {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 4px 0;
}

.header-left p {
  color: var(--color-text-tertiary);
  font-size: 0.85rem;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.clear-btn {
  padding: 6px 12px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.clear-btn:hover:not(:disabled) {
  color: var(--color-status-error);
}

.clear-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.downloads-scroll {
  max-width: 720px;
  margin: 0 auto;
  max-height: calc(100vh - 140px);
  overflow-y: auto;
  padding: 0 24px 24px;
}

.downloads-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.download-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 6px;
  transition: background 0.15s ease;
}

.download-item:hover {
  background: var(--card-hover-bg);
}

.download-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.download-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.filename-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.type-chip {
  flex-shrink: 0;
  background: var(--input-border);
  color: var(--color-text-secondary);
  font-size: 0.7rem;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
  font-family: ui-monospace, SFMono-Regular, monospace;
  letter-spacing: 0.3px;
}

.download-filename {
  flex: 1;
  min-width: 0;
  font-size: 0.9rem;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.download-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
}

.status-label {
  color: var(--color-text-tertiary);
}

.error-text {
  color: var(--color-status-error);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}

.download-progress {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.bar {
  width: 100%;
  height: 3px;
  background: var(--input-border);
  border-radius: 2px;
  overflow: hidden;
}

.fill {
  height: 100%;
  background: var(--color-accent);
  transition: width 0.2s ease;
}

.status-completed .fill {
  background: var(--color-status-success);
}

.status-failed .fill {
  background: var(--color-status-error);
}

.status-paused .fill {
  background: var(--color-status-warning);
}

.status-canceled .fill {
  background: var(--color-text-tertiary);
}

.progress-text {
  display: flex;
  gap: 6px;
  font-size: 0.7rem;
  color: var(--color-text-tertiary);
}

.download-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.download-item:hover .download-actions {
  opacity: 1;
}

.action-btn {
  padding: 4px 10px;
  border-radius: 4px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.action-btn:hover {
  background: var(--card-hover-bg);
  color: var(--color-text-primary);
}

.action-btn.danger:hover {
  color: var(--color-status-error);
}

.empty,
.loading {
  text-align: center;
  padding: 48px 20px;
  color: var(--color-text-tertiary);
  font-size: 0.9rem;
}
</style>
