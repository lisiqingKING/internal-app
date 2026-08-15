<template>
  <div class="logs-page">
    <div class="header">
      <h1>日志查看</h1>
      <p>浏览系统错误日志</p>
    </div>

    <div class="toolbar">
      <div class="filter-group">
        <label>类型</label>
        <select v-model="selectedModule" @change="loadFiles" class="module-select">
          <option v-for="m in LOG_MODULES" :key="m" :value="m">{{ m }}</option>
        </select>
      </div>

      <button class="refresh-btn" @click="loadFiles">刷新</button>
    </div>

    <div class="content">
      <div class="file-list" v-if="files.length > 0">
        <div class="file-list-header">文件 ({{ files.length }})</div>
        <div class="file-list-body">
          <div
            v-for="f in files"
            :key="`${f.module}/${f.filename}`"
            class="file-item"
            :class="{ active: selectedFile?.module === f.module && selectedFile?.filename === f.filename }"
            @click="selectFile(f)"
          >
            <span class="file-module">{{ f.module }}</span>
            <span class="file-name">{{ f.filename }}</span>
          </div>
        </div>
      </div>

      <div class="log-content" :class="{ 'full-width': files.length === 0 }">
        <div v-if="files.length === 0" class="empty-state">
          <div class="empty-icon">📋</div>
          <div>无日志文件</div>
        </div>
        <div v-else-if="!selectedFile" class="empty-state">
          <div class="empty-icon">📄</div>
          <div>请选择日志文件</div>
        </div>
        <div v-else-if="loading" class="empty-state">
          <div class="empty-icon">⏳</div>
          <div>加载中...</div>
        </div>
        <template v-else>
          <div class="content-header">
            <span>{{ selectedFile.module }}/{{ selectedFile.filename }}</span>
            <span class="line-count">{{ total }} 条</span>
          </div>
          <div class="log-container" ref="logContainer">
            <div v-if="lines.length === 0" class="empty-state">无日志记录</div>
            <div v-else class="log-lines">
              <div
                v-for="(line, idx) in lines"
                :key="idx"
                class="log-line"
                :class="getLineClass(line)"
              >{{ line }}</div>
            </div>
          </div>
          <div class="pagination" v-if="totalPages > 1">
            <button :disabled="currentPage <= 1" @click="goPage(1)">首页</button>
            <button :disabled="currentPage <= 1" @click="goPage(currentPage - 1)">上一页</button>
            <span>{{ currentPage }} / {{ totalPages }}</span>
            <button :disabled="currentPage >= totalPages" @click="goPage(currentPage + 1)">下一页</button>
            <button :disabled="currentPage >= totalPages" @click="goPage(totalPages)">末页</button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'

document.title = '日志查看'

const LOG_MODULES = ['main', 'render', 'network', 'ipc', 'sql']

const logs = window.bridge.getModules(['logs']).logs

const PAGE_SIZE = 100

interface LogFileEntry {
  module: string
  filename: string
  date: string
}

const files = ref<LogFileEntry[]>([])
const selectedModule = ref('main')
const selectedFile = ref<LogFileEntry | null>(null)
const allLines = ref<string[]>([])
const currentPage = ref(1)
const loading = ref(false)
const logContainer = ref<HTMLDivElement | null>(null)

const total = computed(() => allLines.value.length)
const totalPages = computed(() => Math.ceil(total.value / PAGE_SIZE))
const offset = computed(() => (currentPage.value - 1) * PAGE_SIZE)
const lines = computed(() => allLines.value.slice(offset.value, offset.value + PAGE_SIZE))

watch(currentPage, () => {
  nextTick(() => {
    if (logContainer.value) logContainer.value.scrollTop = 0
  })
})

async function loadFiles() {
  try {
    files.value = await logs.list({
      modules: [selectedModule.value],
    })
    // 自动选中并展示第一个文件
    if (files.value.length > 0) {
      selectFile(files.value[0])
    } else {
      selectedFile.value = null
      allLines.value = []
    }
  } catch (err) {
    console.error('Failed to load files:', err)
  }
}

function selectFile(f: LogFileEntry) {
  selectedFile.value = f
  currentPage.value = 1
  loadContent()
}

async function loadContent() {
  if (!selectedFile.value) return
  loading.value = true
  try {
    const content = await logs.read(selectedFile.value.module, selectedFile.value.filename, 5000)
    allLines.value = content ? content.split('\n').filter((l: string) => l.trim()) : []
  } catch (err) {
    console.error('Failed to load log:', err)
    allLines.value = []
  } finally {
    loading.value = false
  }
}

function goPage(page: number) {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
}

function getLineClass(line: string): string {
  if (line.includes('[error]') || line.includes('[ERROR]')) return 'line-error'
  if (line.includes('[warn]') || line.includes('[WARN]')) return 'line-warn'
  return 'line-info'
}

loadFiles()
</script>

<style scoped>
.logs-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: visible;
}

.header {
  flex-shrink: 0;
  padding: 40px 40px 0;
}

.header h1 {
  font-size: 2rem;
  font-weight: 600;
  color: var(--header-title);
  margin-bottom: 8px;
}

.header p {
  color: var(--header-subtitle);
  font-size: 0.9rem;
}

.toolbar {
  flex-shrink: 0;
  display: flex;
  gap: 16px;
  padding: 16px 40px;
  align-items: flex-end;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.filter-group label {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.module-select {
  background: var(--input-bg);
  border: 1px solid var(--input-border);
  border-radius: 6px;
  padding: 6px 8px;
  color: var(--input-text);
  font-size: 0.85rem;
  min-width: 120px;
  outline: none;
}

.module-select:focus {
  border-color: var(--color-accent);
}

.module-select option {
  background: var(--color-bg-secondary);
  color: var(--input-text);
}

.refresh-btn {
  background: var(--color-accent-muted);
  border: 1px solid var(--color-accent);
  color: var(--color-accent);
  padding: 6px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
}

.refresh-btn:hover {
  background: var(--color-accent);
  color: var(--color-text-inverse);
}

.content {
  flex: 1;
  display: flex;
  gap: 16px;
  padding: 0 40px 16px;
  overflow: hidden;
  min-height: 0;
}

.file-list {
  width: 280px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-code-border);
  border-radius: 8px;
  overflow: hidden;
  min-height: 0;
}

.file-list-header {
  flex-shrink: 0;
  padding: 10px 12px;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  border-bottom: 1px solid var(--color-code-border);
  background: var(--color-bg-tertiary);
}

.file-list-body {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.file-item {
  display: flex;
  flex-direction: column;
  padding: 8px 12px;
  cursor: pointer;
  border-bottom: 1px solid var(--color-code-border);
  transition: background 0.15s;
}

.file-item:hover {
  background: var(--color-bg-hover);
}

.file-item.active {
  background: var(--color-accent-muted);
}

.file-item.active .file-module {
  color: var(--color-accent);
}

.file-module {
  font-size: 0.7rem;
  color: var(--color-text-secondary);
  text-transform: uppercase;
}

.file-name {
  font-size: 0.8rem;
  color: var(--color-text-primary);
}

.log-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.log-content.full-width {
  width: 100%;
}

.content-header {
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-code-border);
  border-bottom: none;
  border-radius: 8px 8px 0 0;
}

.line-count {
  font-size: 0.75rem;
}

.log-container {
  flex: 1;
  overflow-y: auto;
  background: var(--color-code-bg);
  border: 1px solid var(--color-code-border);
  border-radius: 0 0 8px 8px;
  padding: 12px;
}

.log-lines {
  font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
  font-size: 12px;
  line-height: 1.6;
}

.log-line {
  white-space: pre-wrap;
  word-break: break-all;
  padding: 1px 4px;
  border-radius: 2px;
}

.line-error {
  color: var(--color-status-error);
  background: var(--color-status-error-muted);
}

.line-warn {
  color: var(--color-status-warning);
  background: var(--color-status-warning-muted);
}

.line-info {
  color: var(--color-code-text);
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--color-text-secondary);
  font-size: 0.9rem;
}

.empty-icon {
  font-size: 2.5rem;
  opacity: 0.5;
}

.pagination {
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  padding: 12px 0 0;
}

.pagination button {
  background: var(--input-bg);
  border: 1px solid var(--input-border);
  border-radius: 6px;
  padding: 4px 10px;
  color: var(--input-text);
  font-size: 0.8rem;
  cursor: pointer;
}

.pagination button:hover:not(:disabled) {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.pagination button:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.pagination span {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  min-width: 60px;
  text-align: center;
}
</style>
