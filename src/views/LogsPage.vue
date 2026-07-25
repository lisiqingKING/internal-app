<template>
  <div class="header">
    <div class="header-left">
      <h1>日志查看</h1>
      <p>浏览系统日志文件</p>
    </div>
  </div>

  <div class="toolbar">
    <select v-model="selectedFile" class="file-select" @change="loadLog">
      <option value="">选择日志文件</option>
      <option v-for="f in files" :key="f" :value="f">{{ f }}</option>
    </select>

    <select v-model="levelFilter" class="level-select">
      <option value="all">全部级别</option>
      <option value="error">ERROR</option>
      <option value="warn">WARN</option>
      <option value="info">INFO</option>
    </select>

    <input
      v-model="searchText"
      class="search-input"
      placeholder="搜索内容..."
    />

    <button class="refresh-btn" @click="loadLog" :disabled="!selectedFile">
      刷新
    </button>

    <span class="line-count" v-if="selectedFile">
      {{ filteredLines.length }} / {{ lines.length }} 行
    </span>
  </div>

  <div class="log-container" ref="logContainer">
    <div v-if="!selectedFile" class="empty">请先选择一个日志文件</div>
    <div v-else-if="loading" class="empty">加载中...</div>
    <div v-else-if="filteredLines.length === 0" class="empty">无匹配的日志</div>
    <div v-else class="log-content">
      <div
        v-for="(line, idx) in filteredLines"
        :key="idx"
        class="log-line"
        :class="getLineClass(line)"
      >
        {{ line }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'

document.title = '日志查看'

const logs = window.bridge.getModules(['logs']).logs

const files = ref<string[]>([])
const selectedFile = ref('')
const levelFilter = ref('all')
const searchText = ref('')
const lines = ref<string[]>([])
const loading = ref(false)
const logContainer = ref<HTMLDivElement | null>(null)

const filteredLines = computed(() => {
  let result = lines.value

  if (levelFilter.value !== 'all') {
    const level = levelFilter.value.toUpperCase()
    result = result.filter(l => l.includes(`[${level}]`))
  }

  if (searchText.value) {
    const keyword = searchText.value.toLowerCase()
    result = result.filter(l => l.toLowerCase().includes(keyword))
  }

  return result
})

watch(filteredLines, () => {
  nextTick(() => {
    if (logContainer.value) {
      logContainer.value.scrollTop = logContainer.value.scrollHeight
    }
  })
})

async function loadFiles() {
  try {
    files.value = await logs.list()
  } catch (err) {
    console.error('Failed to load log files:', err)
  }
}

async function loadLog() {
  if (!selectedFile.value) return
  loading.value = true
  try {
    const content = await logs.read(selectedFile.value, 500)
    lines.value = content ? content.split('\n') : []
  } catch (err) {
    console.error('Failed to load log:', err)
    lines.value = []
  } finally {
    loading.value = false
  }
}

function getLineClass(line: string): string {
  if (line.includes('[error]') || line.includes('[ERROR]')) return 'line-error'
  if (line.includes('[warn]') || line.includes('[WARN]')) return 'line-warn'
  return 'line-info'
}

loadFiles()
</script>

<style scoped>
.header {
  flex-shrink: 0;
  padding: 40px 40px 0;
}

.header h1 {
  font-size: 2rem;
  font-weight: 600;
  color: #f1f5f9;
  margin-bottom: 8px;
}

.header p {
  color: #64748b;
  font-size: 0.9rem;
}

.toolbar {
  flex-shrink: 0;
  padding: 16px 40px;
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.file-select,
.level-select,
.search-input {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid #333;
  border-radius: 8px;
  padding: 8px 12px;
  color: #e8eaed;
  font-size: 0.85rem;
  outline: none;
  transition: border-color 0.2s;
}

.file-select:focus,
.level-select:focus,
.search-input:focus {
  border-color: #6366f1;
}

.file-select {
  min-width: 200px;
}

.file-select option {
  background: #1e1e1e;
  color: #e8eaed;
}

.level-select {
  min-width: 120px;
}

.level-select option {
  background: #1e1e1e;
  color: #e8eaed;
}

.search-input {
  flex: 1;
  min-width: 150px;
}

.refresh-btn {
  background: rgba(99, 102, 241, 0.15);
  border: 1px solid rgba(99, 102, 241, 0.3);
  color: #818cf8;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
}

.refresh-btn:hover:not(:disabled) {
  background: rgba(99, 102, 241, 0.25);
}

.refresh-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.line-count {
  font-size: 0.75rem;
  color: #64748b;
  white-space: nowrap;
}

.log-container {
  flex: 1;
  overflow-y: auto;
  margin: 0 40px 40px;
  background: #0d1117;
  border: 1px solid #21262d;
  border-radius: 8px;
  padding: 12px;
}

.log-content {
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
  color: #f85149;
  background: rgba(248, 81, 73, 0.08);
}

.line-warn {
  color: #d29922;
  background: rgba(210, 153, 34, 0.08);
}

.line-info {
  color: #8b949e;
}

.empty {
  text-align: center;
  padding: 60px 20px;
  color: #64748b;
  font-size: 0.9rem;
}
</style>
