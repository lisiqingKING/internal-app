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
  flex-shrink: 0;
  padding: 40px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left h1 {
  font-size: 2rem;
  font-weight: 600;
  color: #f1f5f9;
  margin: 0 0 8px 0;
}

.header-left p {
  color: #64748b;
  font-size: 0.9rem;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.clear-btn {
  background: transparent;
  border: 1px solid #475569;
  color: #94a3b8;
  padding: 10px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s ease;
}

.clear-btn:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.1);
  border-color: #ef4444;
  color: #fca5a5;
}

.clear-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.downloads-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 0 40px 40px;
}

.downloads-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.download-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  border-left: 3px solid #475569;
  transition: background 0.2s ease;
}

.download-item:hover {
  background: rgba(255, 255, 255, 0.06);
}

.download-item.status-downloading {
  border-left-color: #6366f1;
}

.download-item.status-completed {
  border-left-color: #10b981;
}

.download-item.status-failed {
  border-left-color: #ef4444;
}

.download-item.status-paused {
  border-left-color: #f59e0b;
}

.download-item.status-canceled {
  border-left-color: #64748b;
  opacity: 0.7;
}

.download-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.download-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
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
  background: rgba(255, 255, 255, 0.08);
  color: #94a3b8;
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
  font-size: 0.95rem;
  font-weight: 500;
  color: #f1f5f9;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.download-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.75rem;
  color: #64748b;
}

.status-label {
  color: #94a3b8;
}

.error-text {
  color: #ef4444;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 240px;
}

.download-progress {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.bar {
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 2px;
  overflow: hidden;
}

.fill {
  height: 100%;
  background: #6366f1;
  transition: width 0.2s ease;
}

.status-completed .fill {
  background: #10b981;
}

.status-failed .fill {
  background: #ef4444;
}

.status-paused .fill {
  background: #f59e0b;
}

.status-canceled .fill {
  background: #475569;
}

.progress-text {
  display: flex;
  gap: 8px;
  font-size: 0.75rem;
  color: #94a3b8;
}

.download-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.action-btn {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #cbd5e1;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #f1f5f9;
}

.action-btn.danger:hover {
  background: rgba(239, 68, 68, 0.15);
  color: #fca5a5;
  border-color: rgba(239, 68, 68, 0.3);
}

.empty,
.loading {
  text-align: center;
  padding: 60px 20px;
  color: #64748b;
  font-size: 0.9rem;
}
</style>
