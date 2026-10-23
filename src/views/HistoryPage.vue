<template>
  <div class="header">
    <h1>历史记录</h1>
    <button class="clear-btn" @click="onClearAll" :disabled="historyList.length === 0">
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
            @contextmenu.prevent="showContextMenu($event, item)"
          >
            <div class="history-item-icon">
              <img
                v-if="item.favicon && !failedFavicons.has(item.favicon)"
                :src="item.favicon"
                class="favicon-img"
                @error="onFaviconError(item.favicon)"
                @load="onFaviconLoad(item.favicon)"
              />
              <Languages v-else :size="16" />
            </div>
            <div class="history-item-content">
              <div class="history-item-title">{{ item.title || item.url }}</div>
              <div class="history-item-url">{{ item.url }}</div>
            </div>
            <div class="history-item-time">{{ formatTime(item.visitedAt) }}</div>
            <button class="delete-btn" @click.stop="deleteHistory(item.id)">
              <X :size="14" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, h } from 'vue'
import { ElMessageBox } from 'element-plus'
import { Languages, X } from 'lucide-vue-next'
import ContextMenu from '@imengyu/vue3-context-menu'
import { useFaviconState } from '../composables/useFaviconState'
import { formatTime } from '../utils/time'
import { groupByTime, searchHistory, filterByTime, type HistoryItem, type HistoryGroup } from '../composables/historyUtils'

document.title = '历史记录'

// 获取 history 模块
const history = window.bridge.getModules(['history']).history

const historyList = ref<HistoryItem[]>([])
const loading = ref(true)
const searchKeyword = ref('')
const timeFilter = ref('all')
const { failedFavicons, onFaviconError, onFaviconLoad } = useFaviconState()

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

async function onClearAll() {
  try {
    await ElMessageBox.confirm('确定要清空所有历史记录吗？此操作无法撤销。', '确认清空', {
      confirmButtonText: '清空',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }
  try {
    await history.clear()
    await loadHistory()
  } catch (err) {
    console.error('Failed to clear history:', err)
    ElMessageBox.alert((err as Error).message || '清空失败', '操作失败', { type: 'error' })
  }
}

function openHistory(item: HistoryItem) {
  window.bridge.getModules(['tabs']).tabs.create({ title: '加载中...', url: item.url })
}

function showContextMenu(e: MouseEvent, item: HistoryItem) {
  const iconStyle = 'width:16px;height:16px;display:inline-flex;align-items:center;justify-content:center'
  ContextMenu.showContextMenu({
    x: e.clientX,
    y: e.clientY,
    theme: 'flat',
    customClass: 'history-context-menu',
    items: [
      {
        label: '打开',
        icon: h('svg', { style: iconStyle, viewBox: '0 0 24 24', fill: 'currentColor' }, [
          h('path', { d: 'M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z' })
        ]),
        onClick: () => openHistory(item)
      },
      {
        label: '复制链接',
        icon: h('svg', { style: iconStyle, viewBox: '0 0 24 24', fill: 'currentColor' }, [
          h('path', { d: 'M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z' })
        ]),
        onClick: () => { navigator.clipboard.writeText(item.url) }
      },
      {
        label: '移除',
        icon: h('svg', { style: iconStyle, viewBox: '0 0 24 24', fill: 'currentColor' }, [
          h('path', { d: 'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z' })
        ]),
        onClick: () => { deleteHistory(item.id) }
      }
    ]
  })
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

</style>
