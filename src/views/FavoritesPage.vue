<template>
  <div class="header">
    <h1>收藏夹</h1>
    <button class="clear-btn" @click="onClearAll" :disabled="favoritesList.length === 0">
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
  </div>

  <div class="favorites-scroll">
    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="favoritesList.length === 0" class="empty">暂无收藏</div>
    <div v-else-if="filteredList.length === 0" class="empty">无匹配结果</div>
    <div v-else class="favorites-list">
      <div
        v-for="item in itemsWithIcons"
        :key="item.id"
        class="favorite-item"
        @click="openFavorite(item)"
      >
        <div class="favorite-item-icon">
          <svg v-if="item.icon" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path :d="item.icon" />
          </svg>
          <img
            v-else-if="item.favicon && !failedFavicons.has(item.favicon)"
            :src="item.favicon"
            class="favicon-img"
            @error="onFaviconError(item.favicon)"
            @load="onFaviconLoad(item.favicon)"
          />
          <svg v-else viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
          </svg>
        </div>
        <div class="favorite-item-content">
          <div class="favorite-item-title">{{ item.title || item.url }}</div>
          <div class="favorite-item-url">{{ item.url }}</div>
        </div>
        <div class="favorite-item-time">{{ formatTime(item.createdAt) }}</div>
        <button class="delete-btn" @click.stop="deleteFavorite(item.url)">×</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessageBox } from 'element-plus'
import { useFaviconState } from '../composables/useFaviconState'
import { formatTime } from '../utils/time'

document.title = '收藏夹'

// 获取 favorites 模块
const favorites = window.bridge.getModules(['favorites']).favorites
const { getInternalIconFromUrl } = window.bridge.getUtils()

interface FavoriteItem {
  id: number
  url: string
  title: string
  favicon?: string
  createdAt: number
}

const favoritesList = ref<FavoriteItem[]>([])
const loading = ref(true)
const searchKeyword = ref('')
const { failedFavicons, onFaviconError, onFaviconLoad } = useFaviconState()

const filteredList = computed<FavoriteItem[]>(() => {
  if (!searchKeyword.value) return favoritesList.value
  const kw = searchKeyword.value.toLowerCase()
  return favoritesList.value.filter(item =>
    item.url.toLowerCase().includes(kw) ||
    item.title.toLowerCase().includes(kw)
  )
})

const itemsWithIcons = computed(() =>
  filteredList.value.map(item => ({
    ...item,
    icon: getInternalIconFromUrl(item.url),
  }))
)

async function loadFavorites() {
  try {
    const list = await favorites.list()
    favoritesList.value = list || []
  } catch (err) {
    console.error('Failed to load favorites:', err)
  } finally {
    loading.value = false
  }
}

async function deleteFavorite(url: string) {
  try {
    await favorites.remove(url)
    await loadFavorites()
  } catch (err) {
    console.error('Failed to delete favorite:', err)
  }
}

async function onClearAll() {
  try {
    await ElMessageBox.confirm('确定要清空所有收藏吗？此操作无法撤销。', '确认清空', {
      confirmButtonText: '清空',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }
  try {
    const list = await favorites.list()
    for (const item of list) {
      await favorites.remove(item.url)
    }
    await loadFavorites()
  } catch (err) {
    console.error('Failed to clear favorites:', err)
    ElMessageBox.alert((err as Error).message || '清空失败', '操作失败', { type: 'error' })
  }
}

async function openFavorite(item: FavoriteItem) {
  const tabs = window.bridge.getModules(['tabs']).tabs
  // 获取当前活跃 tab id
  const tabData = await tabs.list()
  const currentTabId = tabData?.currentTabId || undefined
  // 在当前 tab 后面创建新标签
  await tabs.create({ title: item.title || '加载中...', url: item.url }, currentTabId)
}

function handleVisibilityChange() {
  if (document.visibilityState === 'visible') {
    loadFavorites()
  }
}

onMounted(() => {
  loadFavorites()
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})
</script>

<style lang="scss" scoped>
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
  border-radius: var(--radius-md, 6px);
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    color: var(--color-status-error);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
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
  border-radius: var(--radius-md, 6px);
  background: var(--input-bg);
  color: var(--color-text-primary);
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.2s ease;

  &:focus {
    border-color: var(--color-accent);
  }

  &::placeholder {
    color: var(--color-text-tertiary);
  }
}

.favorites-scroll {
  max-width: 720px;
  margin: 0 auto;
  max-height: calc(100vh - 140px);
  overflow-y: auto;
  padding: 0 24px 24px;
}

.favorites-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.favorite-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border-radius: var(--radius-md, 6px);
  cursor: pointer;
  transition: background 0.2s ease;
  gap: 10px;

  &:hover {
    background: var(--card-hover-bg);

    .delete-btn {
      opacity: 1;
    }
  }
}

.favorite-item-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-accent);
}

.favicon-img {
  width: 16px;
  height: 16px;
  object-fit: contain;
}

.favorite-item-content {
  flex: 1;
  min-width: 0;
}

.favorite-item-title {
  font-size: 0.9rem;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.favorite-item-url {
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.favorite-item-time {
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
  white-space: nowrap;
}

.delete-btn {
  width: 20px;
  height: 20px;
  border: none;
  border-radius: var(--radius-sm, 4px);
  background: transparent;
  color: var(--color-text-tertiary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease, color 0.2s ease;
  flex-shrink: 0;
  font-size: 1.1rem;

  &:hover {
    color: var(--color-status-error);
  }
}

.empty,
.loading {
  text-align: center;
  padding: 48px 20px;
  color: var(--color-text-tertiary);
  font-size: 0.9rem;
}

</style>
