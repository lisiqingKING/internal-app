<template>
  <div class="ai-saves-page">
    <header class="page-header">
      <h1>AI 保存记录</h1>
      <p class="subtitle">查看和管理已保存的 AI 消息记录文件</p>
    </header>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <span>加载中...</span>
    </div>

    <div v-else-if="files.length === 0" class="empty-state">
      <div class="empty-icon"> </div>
      <h2>暂无保存记录</h2>
      <p>在 AI 对话中右键消息，选择「保存为文件」即可在此查看</p>
    </div>

    <div v-else class="files-container">
      <div class="files-list">
        <div
          v-for="file in files"
          :key="file.filename"
          class="file-item"
          :class="{ active: selectedFile?.filename === file.filename }"
          @click="selectFile(file)"
        >
          <div class="file-icon">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
          </div>
          <div class="file-info">
            <div class="file-name">{{ file.filename }}</div>
            <div class="file-meta">
              <span>{{ formatDate(file.createdAt) }}</span>
              <span>{{ formatSize(file.size) }}</span>
            </div>
          </div>
          <button class="delete-btn" @click.stop="deleteFile(file)" title="删除">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18"/>
              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            </svg>
          </button>
        </div>
      </div>

      <div class="preview-panel">
        <div v-if="!selectedFile" class="preview-empty">
          <span>选择左侧文件查看内容</span>
        </div>
        <div v-else-if="previewLoading" class="preview-loading">
          <div class="spinner"></div>
          <span>加载中...</span>
        </div>
        <div v-else class="preview-content">
          <div class="preview-header">
            <h3>{{ selectedFile.filename }}</h3>
            <button class="open-folder-btn" @click="openSaveDir">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              </svg>
              打开文件夹
            </button>
          </div>
          <div class="preview-body markdown-body" v-html="renderMarkdown(previewContent)"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessageBox } from 'element-plus'
import { useMarkdown } from './ai/composables/useMarkdown'

const { renderMarkdown } = useMarkdown()

interface SaveFile {
  filename: string
  createdAt: number
  size: number
}

const loading = ref(true)
const files = ref<SaveFile[]>([])
const selectedFile = ref<SaveFile | null>(null)
const previewContent = ref('')
const previewLoading = ref(false)

onMounted(async () => {
  await loadFiles()
})

async function loadFiles() {
  loading.value = true
  files.value = await window.electronApis?.ai?.listSaveFiles() || []
  loading.value = false
}

async function selectFile(file: SaveFile) {
  selectedFile.value = file
  previewLoading.value = true
  previewContent.value = await window.electronApis?.ai?.readSaveFile(file.filename) || ''
  previewLoading.value = false
}

async function deleteFile(file: SaveFile) {
  try {
    await ElMessageBox.confirm(`确定要删除 ${file.filename} 吗？`, '确认删除', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }
  const success = await window.electronApis?.ai?.deleteSaveFile(file.filename)
  if (success) {
    files.value = files.value.filter(f => f.filename !== file.filename)
    if (selectedFile?.value?.filename === file.filename) {
      selectedFile.value = null
      previewContent.value = ''
    }
  }
}

function openSaveDir() {
  window.electronApis?.ai?.openSaveDir()
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
</script>

<style scoped>
.ai-saves-page {
  min-height: 100vh;
  background: transparent;
  color: var(--color-text-primary);
}

.page-header {
  padding: 20px 24px;
  border-bottom: 1px solid var(--color-divider);
  flex-shrink: 0;
}

.page-header h1 {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 6px;
}

.subtitle {
  color: var(--color-text-secondary);
  margin: 0;
  font-size: 13px;
}

.loading-state,
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--color-divider);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-icon {
  font-size: 48px;
}

.empty-state h2 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.empty-state p {
  color: var(--color-text-secondary);
  margin: 0;
  font-size: 14px;
}

.files-container {
  display: flex;
}

.files-list {
  width: 300px;
  flex-shrink: 0;
  border-right: 1px solid var(--color-divider);
  overflow-y: auto;
  height: calc(100vh - 100px);
}

.file-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  cursor: pointer;
  transition: background 0.15s;
  border-bottom: 1px solid var(--color-divider);
}

.file-item:last-child {
  border-bottom: none;
}

.file-item:hover {
  background: var(--color-surface);
}

.file-item.active {
  background: var(--color-accent);
}

.file-item.active .file-icon {
  color: var(--color-text-inverse);
}

.file-item.active .file-info {
  color: var(--color-text-inverse);
}

.file-icon {
  flex-shrink: 0;
  color: var(--color-text-secondary);
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-size: 13px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-meta {
  font-size: 11px;
  color: var(--color-text-secondary);
  display: flex;
  gap: 10px;
  margin-top: 3px;
}

.file-item.active .file-meta {
  color: rgba(255, 255, 255, 0.8);
}

.delete-btn {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.15s, background 0.15s, color 0.15s;
}

.file-item:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

.preview-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.preview-empty,
.preview-loading {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--color-text-secondary);
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-divider);
  flex-shrink: 0;
}

.preview-header h3 {
  font-size: 14px;
  font-weight: 600;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.open-folder-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  flex-shrink: 0;
}

.open-folder-btn:hover {
  background: var(--color-surface);
  color: var(--color-text-primary);
}

.preview-body {
  overflow-y: auto;
  padding: 20px;
  height: calc(100vh - 160px);
}

/* Markdown 样式 */
.markdown-body {
  line-height: 1.6;
  font-size: 14px;
  word-wrap: break-word;
}

.markdown-body :deep(p) {
  margin: 0 0 10px;
}

.markdown-body :deep(p:last-child) {
  margin-bottom: 0;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  margin: 8px 0;
  padding-left: 24px;
}

.markdown-body :deep(li) {
  margin: 4px 0;
}

.markdown-body :deep(code) {
  background: var(--color-code-bg);
  padding: 2px 5px;
  border-radius: 3px;
  font-size: 0.9em;
}

.markdown-body :deep(pre) {
  background: var(--color-code-bg);
  border: 1px solid var(--color-code-border);
  border-radius: 6px;
  padding: 14px;
  overflow-x: auto;
  margin: 10px 0;
}

.markdown-body :deep(pre code) {
  background: transparent;
  padding: 0;
  color: var(--color-code-text);
  font-size: 0.85em;
}

.markdown-body :deep(strong) {
  font-weight: 600;
}

.markdown-body :deep(a) {
  color: var(--color-accent);
  text-decoration: none;
}

.markdown-body :deep(a:hover) {
  text-decoration: underline;
}

.markdown-body :deep(table) {
  border-collapse: collapse;
  margin: 10px 0;
  width: 100%;
}

.markdown-body :deep(th),
.markdown-body :deep(td) {
  border: 1px solid var(--color-divider);
  padding: 6px 10px;
  text-align: left;
}

.markdown-body :deep(th) {
  background: var(--color-surface);
  font-weight: 600;
}

.markdown-body :deep(blockquote) {
  margin: 10px 0;
  padding: 10px 16px;
  border-left: 3px solid var(--color-accent);
  background: var(--color-surface);
}

.markdown-body :deep(blockquote p) {
  margin: 0;
}
</style>
