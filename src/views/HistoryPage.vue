<template>
  <div class="header">
    <h1>历史记录</h1>
    <button class="clear-btn" @click="showClearModal = true" :disabled="historyList.length === 0">
      清空
    </button>
  </div>

  <div class="search-bar">
    <input
      v-model="searchKeyword"
      type="text"
      placeholder="搜索..."
      class="search-input"
    />
    <select v-model="timeFilter" class="time-select">
      <option value="all">全部</option>
      <option value="today">今天</option>
      <option value="yesterday">昨天</option>
      <option value="week">本周</option>
      <option value="older">更早</option>
    </select>
  </div>

  <div class="history-scroll">
    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="historyList.length === 0" class="empty">暂无历史记录</div>
    <div v-else-if="filteredGroups.length === 0" class="empty">无匹配结果</div>
    <div v-else class="history-groups">
      <div v-for="group in filteredGroups" :key="group.label" class="history-group">
        <div class="group-label">{{ group.label }}</div>
        <div class="history-list">
          <div
            v-for="item in group.items"
            :key="item.id"
            class="history-item"
            @click="openHistory(item)"
          >
            <div class="history-item-icon">
              <img
                v-if="item.favicon && !failedFavicons.has(item.favicon)"
                :src="item.favicon"
                class="favicon-img"
                @error="onFaviconError(item.favicon)"
                @load="onFaviconLoad(item.favicon)"
              />
              <svg v-else viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
              </svg>
            </div>
            <div class="history-item-content">
              <div class="history-item-title">{{ item.title || item.url }}</div>
              <div class="history-item-url">{{ item.url }}</div>
            </div>
            <div class="history-item-time">{{ formatTime(item.visitedAt) }}</div>
            <button class="delete-btn" @click.stop="deleteHistory(item.id)">×</button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 确认弹窗 -->
  <div v-if="showClearModal" class="modal-overlay" @click.self="showClearModal = false">
    <div class="modal">
      <div class="modal-title">确认清空</div>
      <div class="modal-message">确定要清空所有历史记录吗？此操作无法撤销。</div>
      <div class="modal-buttons">
        <button class="modal-btn modal-btn-cancel" @click="showClearModal = false">取消</button>
        <button class="modal-btn modal-btn-confirm" @click="confirmClear">确认清空</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { groupByTime, searchHistory, filterByTime, type HistoryItem, type HistoryGroup } from '../composables/historyUtils'

document.title = '历史记录'

// 获取 history 模块
const history = window.bridge.getModules(['history']).history

const historyList = ref<HistoryItem[]>([])
const loading = ref(true)
const showClearModal = ref(false)
const searchKeyword = ref('')
const timeFilter = ref('all')
const failedFavicons = ref<Set<string>>(new Set())

const filteredGroups = computed<HistoryGroup[]>(() => {
  let items = searchKeyword.value
    ? searchHistory(historyList.value, searchKeyword.value)
    : historyList.value

  if (timeFilter.value !== 'all') {
    items = filterByTime(items, timeFilter.value)
  }

  return groupByTime(items)
})

async function loadHistory() {
  try {
    const list = await history.get()
    historyList.value = list || []
  } catch (err) {
    console.error('Failed to load history:', err)
  } finally {
    loading.value = false
  }
}

async function deleteHistory(id: number) {
  try {
    await history.delete(id)
    await loadHistory()
  } catch (err) {
    console.error('Failed to delete history:', err)
  }
}

async function confirmClear() {
  try {
    await history.clear()
    showClearModal.value = false
    await loadHistory()
  } catch (err) {
    console.error('Failed to clear history:', err)
    alert('清空失败: ' + (err as Error).message)
  }
}

function openHistory(item: HistoryItem) {
  window.bridge.getModules(['tabs']).tabs.create({ title: '加载中...', url: item.url })
}

function onFaviconError(url: string) {
  failedFavicons.value.add(url)
}

function onFaviconLoad(url: string) {
  failedFavicons.value.delete(url)
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前'
  if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前'
  if (diff < 604800000) return Math.floor(diff / 86400000) + '天前'

  return date.toLocaleDateString('zh-CN')
}

function handleVisibilityChange() {
  if (document.visibilityState === 'visible') {
    loadHistory()
  }
}

onMounted(() => {
  loadHistory()
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})
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

.header h1 {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-text-primary);
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

.search-bar {
  max-width: 720px;
  margin: 0 auto;
  padding: 0 24px 16px;
  display: flex;
  gap: 8px;
}

.search-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--input-border);
  border-radius: 6px;
  background: var(--input-bg);
  color: var(--color-text-primary);
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.15s ease;
}

.search-input:focus {
  border-color: var(--color-accent);
}

.search-input::placeholder {
  color: var(--color-text-tertiary);
}

.time-select {
  padding: 8px 12px;
  border: 1px solid var(--input-border);
  border-radius: 6px;
  background: var(--input-bg);
  color: var(--color-text-primary);
  font-size: 0.9rem;
  outline: none;
  cursor: pointer;
}

.time-select:focus {
  border-color: var(--color-accent);
}

.history-scroll {
  max-width: 720px;
  margin: 0 auto;
  max-height: calc(100vh - 140px);
  overflow-y: auto;
  padding: 0 24px 24px;
}

.history-groups {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.group-label {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--color-text-tertiary);
  margin-bottom: 4px;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.history-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s ease;
  gap: 10px;
}

.history-item:hover {
  background: var(--card-hover-bg);
}

.history-item:hover .delete-btn {
  opacity: 1;
}

.history-item-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.favicon-img {
  width: 16px;
  height: 16px;
  object-fit: contain;
}

.history-item-content {
  flex: 1;
  min-width: 0;
}

.history-item-title {
  font-size: 0.9rem;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.history-item-url {
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.history-item-time {
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
  white-space: nowrap;
}

.delete-btn {
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--color-text-tertiary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.15s ease;
  flex-shrink: 0;
  font-size: 1.1rem;
}

.delete-btn:hover {
  color: var(--color-status-error);
}

.empty, .loading {
  text-align: center;
  padding: 48px 20px;
  color: var(--color-text-tertiary);
  font-size: 0.9rem;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: var(--modal-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--modal-bg);
  border-radius: 12px;
  padding: 20px;
  width: 320px;
}

.modal-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 8px;
}

.modal-message {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  margin-bottom: 20px;
  line-height: 1.5;
}

.modal-buttons {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.modal-btn {
  padding: 6px 16px;
  border-radius: 6px;
  font-size: 0.85rem;
  cursor: pointer;
  border: none;
}

.modal-btn-cancel {
  background: transparent;
  color: var(--color-text-secondary);
}

.modal-btn-cancel:hover {
  background: var(--card-hover-bg);
}

.modal-btn-confirm {
  background: var(--color-status-error);
  color: white;
}

.modal-btn-confirm:hover {
  opacity: 0.9;
}
</style>