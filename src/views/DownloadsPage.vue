<template>
  <div class="header">
    <div class="header-left">
      <h1>下载</h1>
      <p>正在下载和已下载的文件</p>
    </div>
    <div class="header-actions">
      <button class="clear-btn" :disabled="tasks.length === 0" @click="onClearAll">清空全部</button>
    </div>
  </div>

  <div class="downloads-scroll">
    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="tasks.length === 0" class="empty">
      <FileX :size="48" />
      <p>暂无下载任务</p>
    </div>
    <div v-else class="downloads-list">
      <template v-for="group in groupedTasks" :key="group.date">
        <div class="date-header">{{ group.label }}</div>
        <div
          v-for="task in group.tasks"
          :key="task.id"
          class="download-item"
          :class="`status-${task.status}`"
        >
          <!-- 文件图标 -->
          <div class="file-icon" :style="{ background: fileIconColor(task).bg }">
            <component :is="fileIconComponent(task)" :size="22" :color="fileIconColor(task).fg" />
          </div>

          <!-- 主体信息 -->
          <div class="download-main">
            <div class="filename-row">
              <span class="download-filename" :title="task.filename">{{ task.filename }}</span>
            </div>

            <div class="download-meta">
              <span class="status-dot" :class="`dot-${task.status}`"></span>
              <span class="status-label" :class="`status-text-${task.status}`">{{ statusLabel(task.status) }}</span>
              <span class="meta-sep">·</span>
              <span class="time-text">{{ formatTime(task.createdAt) }}</span>
              <template v-if="task.error">
                <span class="meta-sep">·</span>
                <span class="error-text" :title="task.error">{{ task.error }}</span>
              </template>
            </div>

            <!-- 进度条（下载中/暂停中） -->
            <div v-if="task.status === 'downloading' || task.status === 'paused'" class="download-progress">
              <div class="bar">
                <div class="fill" :style="{ width: progressPercent(task) + '%' }"></div>
              </div>
              <div class="progress-text">
                <span>{{ formatBytes(progressReceived(task)) }} / {{ formatBytes(task.totalBytes) }}</span>
                <span v-if="task.status === 'downloading'" class="speed">
                  · {{ formatBytes(progressSpeed(task)) }}/s
                </span>
              </div>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="download-actions">
            <!-- 下载中 -->
            <template v-if="task.status === 'downloading'">
              <button class="action-btn" title="暂停" @click="onPause(task.id)">
                <Pause :size="16" />
              </button>
              <button class="action-btn danger" title="取消" @click="onCancel(task.id)">
                <X :size="16" />
              </button>
            </template>

            <!-- 已暂停 -->
            <template v-else-if="task.status === 'paused'">
              <button class="action-btn" title="继续下载" @click="onResume(task.id)">
                <Play :size="16" />
              </button>
              <button class="action-btn danger" title="取消" @click="onCancel(task.id)">
                <X :size="16" />
              </button>
            </template>

            <!-- 排队中 -->
            <template v-else-if="task.status === 'queued'">
              <button class="action-btn danger" title="取消" @click="onCancel(task.id)">
                <X :size="16" />
              </button>
            </template>

            <!-- 已完成 -->
            <template v-else-if="task.status === 'completed'">
              <button class="action-btn primary" title="直接打开文件" @click="onOpenFile(task.id)">
                <FileCheck :size="16" />
              </button>
              <button class="action-btn" title="在文件夹中显示" @click="onReveal(task.id)">
                <FolderOpen :size="16" />
              </button>
            </template>

            <!-- 失败/取消 -->
            <template v-else-if="task.status === 'failed' || task.status === 'canceled'">
              <button class="action-btn" title="重新下载" @click="onReAdd(task)">
                <RotateCcw :size="16" />
              </button>
            </template>

            <!-- 删除（所有状态） -->
            <button class="action-btn danger" title="删除任务和文件" @click="onRemove(task.id)">
              <Trash2 :size="16" />
            </button>
            <!-- 复制链接（所有状态） -->
            <button class="action-btn" title="复制下载链接" @click="onCopyUrl(task.url)">
              <Copy :size="16" />
            </button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  Pause, Play, X, RotateCcw, Trash2, FileCheck, FolderOpen, FileX, Copy,
  FileText, FileImage, FileVideo, FileAudio, FileArchive, FileCode,
  File, FileSpreadsheet, Presentation, type LucideIcon
} from 'lucide-vue-next'
import { computed } from 'vue'
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
  openFile,
  clearAll,
} = useDownloads()

// 按天分组
const groupedTasks = computed(() => {
  const groups: { date: string; label: string; tasks: DownloadTask[] }[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today.getTime() - 86400000)

  for (const task of tasks.value) {
    const d = new Date(task.createdAt)
    d.setHours(0, 0, 0, 0)
    const key = d.getTime()

    let group = groups.find(g => g.date === key.toString())
    if (!group) {
      let label: string
      if (d.getTime() === today.getTime()) label = '今天'
      else if (d.getTime() === yesterday.getTime()) label = '昨天'
      else label = d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })

      group = { date: key.toString(), label, tasks: [] }
      groups.push(group)
    }
    group.tasks.push(task)
  }
  return groups
})

async function onPause(id: string) { await pause(id) }
async function onResume(id: string) { await resume(id) }
async function onCancel(id: string) { await cancel(id) }
async function onRemove(id: string) {
  if (!confirm('确定删除此下载任务和文件?')) return
  await remove(id)
}

async function onCopyUrl(url: string) {
  try {
    await navigator.clipboard.writeText(url)
  } catch {
    // fallback
  }
}
async function onReveal(id: string) { await reveal(id) }
async function onOpenFile(id: string) { await openFile(id) }
async function onClearAll() {
  if (!confirm(`确定清空全部 ${tasks.value.length} 个下载任务和文件?`)) return
  await clearAll()
}

async function onReAdd(task: DownloadTask) {
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

function progressReceived(task: DownloadTask): number {
  const live = progressMap.value.get(task.id)
  return live?.receivedBytes ?? task.receivedBytes
}

function progressPercent(task: DownloadTask): number {
  const total = task.totalBytes
  if (!total || total <= 0) return 0
  return Math.min(100, Math.round((progressReceived(task) / total) * 100))
}

function progressSpeed(task: DownloadTask): number {
  return progressMap.value.get(task.id)?.speed ?? 0
}

function formatBytes(n: number | null | undefined): string {
  if (n == null) return '—'
  if (n === 0) return '0 B'
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return Math.floor(diff / 60000) + ' 分钟前'
  if (diff < 86400000) return Math.floor(diff / 3600000) + ' 小时前'
  if (diff < 604800000) return Math.floor(diff / 86400000) + ' 天前'
  return date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function statusLabel(s: DownloadStatus): string {
  switch (s) {
    case 'queued': return '排队中'
    case 'downloading': return '下载中'
    case 'paused': return '已暂停'
    case 'completed': return '已完成'
    case 'failed': return '下载失败'
    case 'canceled': return '已取消'
    default: return `未知(${String(s)})`
  }
}

// 文件扩展名 -> 图标组件
function fileIconComponent(task: DownloadTask): LucideIcon {
  const ext = (/\.([a-z0-9]+)$/i.exec(task.filename)?.[1] || '').toLowerCase()
  const img  = ['jpg','jpeg','png','gif','webp','svg','bmp','ico','tiff']
  const vid  = ['mp4','mkv','avi','mov','wmv','flv','webm']
  const aud  = ['mp3','wav','flac','aac','ogg','wma','m4a']
  const doc  = ['pdf']
  const arc  = ['zip','rar','7z','tar','gz','bz2','xz']
  const code = ['js','ts','py','java','cpp','c','h','css','html','json','xml','yaml','yml','md','sh','bat']
  const sheet= ['xls','xlsx','csv','ods']
  const slide= ['ppt','pptx','odp']
  const txt  = ['txt','log','ini','cfg','conf']

  if (img.includes(ext))  return FileImage
  if (vid.includes(ext))  return FileVideo
  if (aud.includes(ext))  return FileAudio
  if (doc.includes(ext))  return FileText
  if (arc.includes(ext)) return FileArchive
  if (code.includes(ext)) return FileCode
  if (sheet.includes(ext)) return FileSpreadsheet
  if (slide.includes(ext)) return Presentation
  if (txt.includes(ext))  return FileText
  return File
}

// 文件扩展名 -> 图标颜色
function fileIconColor(task: DownloadTask): { bg: string; fg: string } {
  const ext = (/\.([a-z0-9]+)$/i.exec(task.filename)?.[1] || '').toLowerCase()
  const img  = ['jpg','jpeg','png','gif','webp','svg','bmp','ico','tiff']
  const vid  = ['mp4','mkv','avi','mov','wmv','flv','webm']
  const aud  = ['mp3','wav','flac','aac','ogg','wma','m4a']
  const doc  = ['pdf']
  const arc  = ['zip','rar','7z','tar','gz','bz2','xz']
  const code = ['js','ts','py','java','cpp','c','h','css','html','json','xml','yaml','yml','md','sh','bat']
  const sheet= ['xls','xlsx','csv','ods']
  const slide= ['ppt','pptx','odp']

  if (img.includes(ext))  return { bg: 'rgba(16, 185, 129, 0.12)',  fg: '#10b981' }
  if (vid.includes(ext))  return { bg: 'rgba(139, 92, 246, 0.12)', fg: '#8b5cf6' }
  if (aud.includes(ext))  return { bg: 'rgba(245, 158, 11, 0.12)',  fg: '#f59e0b' }
  if (doc.includes(ext))  return { bg: 'rgba(239, 68, 68, 0.12)',   fg: '#ef4444' }
  if (arc.includes(ext)) return { bg: 'rgba(245, 158, 11, 0.12)',  fg: '#f59e0b' }
  if (code.includes(ext)) return { bg: 'rgba(99, 102, 241, 0.12)',  fg: '#6366f1' }
  if (sheet.includes(ext)) return { bg: 'rgba(16, 185, 129, 0.12)',  fg: '#10b981' }
  if (slide.includes(ext)) return { bg: 'rgba(249, 115, 22, 0.12)',  fg: '#f97316' }
  return { bg: 'rgba(148, 163, 184, 0.12)', fg: '#94a3b8' }
}
</script>

<style scoped>
.header {
  max-width: 800px;
  margin: 0 auto;
  padding: 32px 24px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left h1 {
  font-size: 24px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 4px 0;
}

.header-left p {
  color: var(--color-text-tertiary);
  font-size: 14px;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.clear-btn {
  padding: 6px 14px;
  border-radius: 6px;
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.clear-btn:hover:not(:disabled) {
  color: var(--color-status-error);
  border-color: var(--color-status-error);
}

.clear-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.downloads-scroll {
  max-width: 800px;
  margin: 0 auto;
  max-height: calc(100vh - 140px);
  overflow-y: auto;
  padding: 8px 24px 32px;
}

.downloads-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.date-header {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-tertiary);
  padding: 16px 4px 8px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.date-header:first-child {
  padding-top: 0;
}

.download-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  margin-bottom: 8px;
  border-radius: 10px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  transition: background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
}

.download-item:last-of-type {
  margin-bottom: 0;
}

.download-item:hover {
  background: var(--card-hover-bg);
  border-color: var(--color-accent);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.download-item:active {
  background: var(--color-bg-tertiary);
}

.file-icon {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.download-main {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.filename-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-width: 0;
  overflow: hidden;
  line-height: 1;
}

.download-filename {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1;
}

.download-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--color-text-tertiary);
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}
.dot-downloading { background: var(--color-accent); }
.dot-paused      { background: var(--color-status-warning); }
.dot-queued      { background: var(--color-text-tertiary); }
.dot-completed  { background: var(--color-status-success); }
.dot-failed     { background: var(--color-status-error); }
.dot-canceled   { background: var(--color-text-tertiary); }

.status-label { font-weight: 500; }
.status-text-downloading { color: var(--color-accent); }
.status-text-paused       { color: var(--color-status-warning); }
.status-text-completed    { color: var(--color-status-success); }
.status-text-failed       { color: var(--color-status-error); }
.status-text-canceled     { color: var(--color-text-tertiary); }
.status-text-queued       { color: var(--color-text-tertiary); }

.meta-sep { color: var(--color-text-tertiary); }

.time-text { color: var(--color-text-tertiary); }

.error-text {
  color: var(--color-status-error);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 180px;
}

.download-progress {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.bar {
  width: 100%;
  height: 4px;
  background: var(--input-border);
  border-radius: 2px;
  overflow: hidden;
}

.fill {
  height: 100%;
  background: var(--color-accent);
  transition: width 0.3s ease;
  border-radius: 2px;
}

.status-completed .fill { background: var(--color-status-success); }
.status-failed .fill    { background: var(--color-status-error); }
.status-paused .fill    { background: var(--color-status-warning); }
.status-canceled .fill  { background: var(--color-text-tertiary); }

.progress-text {
  display: flex;
  gap: 6px;
  font-size: 11px;
  color: var(--color-text-tertiary);
}

.speed {
  color: var(--color-accent);
  font-weight: 500;
}

.download-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
  align-items: center;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--color-text-tertiary);
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease;
}

.action-btn:hover {
  background: var(--card-hover-bg);
  color: var(--color-text-primary);
}

.action-btn.primary {
  /* color: var(--color-accent); */
}

.action-btn.primary:hover {
  background: var(--color-accent-muted);
}

.action-btn.danger { color: var(--color-text-tertiary); }

.action-btn.danger:hover {
  color: var(--color-status-error);
  background: var(--color-status-error-muted);
}

.empty, .loading {
  text-align: center;
  padding: 64px 20px;
  color: var(--color-text-tertiary);
  font-size: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}
</style>
