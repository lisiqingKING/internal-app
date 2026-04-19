<template>
  <div class="header">
    <div class="header-left">
      <h1>历史记录</h1>
      <p>最近访问的网页</p>
    </div>
    <button class="clear-btn" @click="showClearModal = true" :disabled="historyList.length === 0">
      清空历史记录
    </button>
  </div>

  <div class="history-scroll">
    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="historyList.length === 0" class="empty">暂无历史记录</div>
    <div v-else class="history-list">
      <div
        v-for="item in historyList"
        :key="item.id"
        class="history-item"
        @click="openHistory(item)"
      >
        <div class="history-item-content">
          <div class="history-item-title">{{ item.title || item.url }}</div>
          <div class="history-item-url">{{ item.url }}</div>
        </div>
        <div class="history-item-time">{{ formatTime(item.visitedAt) }}</div>
        <button class="delete-btn" @click.stop="deleteHistory(item.id)">×</button>
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
import { ref, onMounted, onUnmounted } from 'vue'

interface HistoryItem {
  id: number
  title: string
  url: string
  visitedAt: number
}

declare global {
  interface Window {
    bridge: {
      getModules: (names: string[]) => Record<string, Record<string, Function>>
    }
  }
}

// 获取 history 模块
const history = window.bridge.getModules(['history']).history

const historyList = ref<HistoryItem[]>([])
const loading = ref(true)
const showClearModal = ref(false)

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
  flex-shrink: 0;
  padding: 40px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.history-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 0 40px 40px;
}

.header-left {
  text-align: left;
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

.clear-btn {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #ef4444;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s ease;
}

.clear-btn:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.2);
  border-color: rgba(239, 68, 68, 0.5);
}

.clear-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.history-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s ease;
  gap: 12px;
}

.history-item:hover {
  background: rgba(255, 255, 255, 0.06);
}

.history-item:hover .delete-btn {
  opacity: 1;
}

.history-item-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.history-item-title {
  font-size: 0.9rem;
  font-weight: 500;
  color: #f1f5f9;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.history-item-url {
  font-size: 0.75rem;
  color: #6366f1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.history-item-time {
  font-size: 0.75rem;
  color: #64748b;
  white-space: nowrap;
}

.delete-btn {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 4px;
  background: rgba(239, 68, 68, 0.8);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease, background 0.2s ease;
  flex-shrink: 0;
}

.delete-btn:hover {
  background: rgba(239, 68, 68, 1);
}

.empty {
  text-align: center;
  padding: 60px 20px;
  color: #64748b;
  font-size: 0.9rem;
}

.loading {
  text-align: center;
  padding: 60px 20px;
  color: #64748b;
  font-size: 0.9rem;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: #2d2d2d;
  border: 1px solid #444;
  border-radius: 16px;
  padding: 24px;
  min-width: 320px;
  max-width: 400px;
}

.modal-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #f1f5f9;
  margin-bottom: 12px;
}

.modal-message {
  font-size: 0.95rem;
  color: #94a3b8;
  margin-bottom: 24px;
  line-height: 1.5;
}

.modal-buttons {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.modal-btn {
  padding: 8px 20px;
  border-radius: 8px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.modal-btn-cancel {
  background: transparent;
  border: 1px solid #444;
  color: #94a3b8;
}

.modal-btn-cancel:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #e8eaed;
}

.modal-btn-confirm {
  background: #ef4444;
  color: white;
}

.modal-btn-confirm:hover {
  background: #dc2626;
}
</style>