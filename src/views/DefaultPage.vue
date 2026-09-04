<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useEventListener } from '@vueuse/core'
import { debounce } from 'lodash-es'
import { ChevronRight, Search } from 'lucide-vue-next'
import aiSvg from '../assets/icons/ai.svg?raw'
import historySvg from '../assets/icons/history.svg?raw'
import downloadsSvg from '../assets/icons/downloads.svg?raw'

document.title = '首页'

const query = ref('')
const failedFavicons = ref<Set<string>>(new Set())

interface FavoriteItem { url: string; title: string; favicon?: string | null }
interface TabItem { id: string; title: string; url: string; favicon?: string; isHome?: boolean; visitedAt?: number }
interface HistoryItem { id: number; title: string; url: string; favicon?: string | null; visitedAt: number }
interface SearchResult { type: 'history' | 'favorites' | 'ai'; title: string; url: string; favicon?: string | null }
const favorites = ref<FavoriteItem[]>([])
const recentTabs = ref<TabItem[]>([])
const searchResults = ref<SearchResult[]>([])

const isDev = window.location.hostname === 'localhost'

function getInternalUrl(route: string): string {
  if (isDev) return `http://localhost:${__DEV_PORT__}/#/${route}`
  return `lsqapp://internal-app/${route}`
}

function openLink(route: string) {
  window.bridge.getModules(['tabs']).tabs.create({ title: '', url: getInternalUrl(route) })
}

function handleSearch() {
  const input = query.value.trim()
  if (!input) return
  let url: string
  if (input.startsWith('http://') || input.startsWith('https://') || input.startsWith('lsqapp://')) {
    url = input
  } else {
    url = `https://www.baidu.com/s?wd=${encodeURIComponent(input)}`
  }
  window.bridge.getModules(['tabs']).tabs.create({ title: '', url })
}

const doSearch = debounce(async (keyword: string) => {
  if (!keyword.trim()) {
    searchResults.value = []
    return
  }
  try {
    const { history: historyModule } = await window.bridge.getModules(['history'])
    const historyList = (await historyModule.get().catch(() => [])) as HistoryItem[]
    const lowerKeyword = keyword.toLowerCase()
    searchResults.value = historyList
      .filter(item => item.title.toLowerCase().includes(lowerKeyword) || item.url.toLowerCase().includes(lowerKeyword))
      .slice(0, 5)
      .map(item => ({ type: 'history' as const, title: item.title || item.url, url: item.url, favicon: item.favicon }))
  } catch {
    searchResults.value = []
  }
}, 300)

function clearSearch() {
  query.value = ''
  searchResults.value = []
}

async function loadData() {
  try {
    const [{ favorites: favModule }, { history: historyModule }] = await Promise.all([
      window.bridge.getModules(['favorites']),
      window.bridge.getModules(['history']),
    ])
    const [favList, historyList] = await Promise.all([
      favModule.list().catch(() => []),
      historyModule.get().catch(() => []),
    ])
    favorites.value = (favList as FavoriteItem[]).slice(0, 8)
    // 最近 10 条历史记录
    recentTabs.value = (historyList as HistoryItem[]).slice(0, 10).map(item => ({
      id: String(item.id),
      title: item.title || item.url,
      url: item.url,
      favicon: item.favicon ?? undefined,
      visitedAt: item.visitedAt,
    }))
  } catch {
    favorites.value = []
    recentTabs.value = []
  }
}

function openItem(url: string, title: string) {
  clearSearch()
  window.bridge.getModules(['tabs']).tabs.create({ title: title || '', url })
}

function onFaviconError(url: string) {
  failedFavicons.value.add(url)
}

function onFaviconLoad(url: string) {
  failedFavicons.value.delete(url)
}

function getInternalIconPath(url: string): string | null {
  const utils = window.bridge.getUtils?.()
  return utils?.getInternalIconFromUrl(url) ?? null
}

onMounted(() => {
  loadData()
})

useEventListener(document, 'click', (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (!target.closest('.search-wrap')) {
    clearSearch()
  }
})

useEventListener(document, 'keydown', (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    clearSearch()
  }
})
</script>

<template>
  <div class="page">
    <div class="inner">
      <!-- 搜索框 -->
      <div class="search-wrap">
        <form @submit.prevent="handleSearch">
          <input
            v-model="query"
            type="text"
            class="search-input"
            placeholder="搜索或输入网址"
            @input="doSearch(query)"
          />
          <Search class="search-icon" :size="18" />
        </form>
        <!-- 搜索结果浮层 -->
        <div v-if="query.trim()" class="search-dropdown">
          <button
            v-for="item in searchResults"
            :key="item.url"
            class="search-item"
            @click="openItem(item.url, item.title)"
          >
            <div class="fav-icon">
              <svg v-if="getInternalIconPath(item.url)" viewBox="0 0 24 24" width="16" height="16" fill="var(--color-accent)">
                <path :d="getInternalIconPath(item.url) ?? ''"/>
              </svg>
              <img v-else-if="item.favicon" :src="item.favicon" class="fav-favicon" />
              <svg v-else viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
              </svg>
            </div>
            <span class="search-item-title">{{ item.title }}</span>
            <ChevronRight class="search-item-arrow" :size="16" />
          </button>
          <button v-if="searchResults.length === 0" class="search-item" @click="handleSearch(); clearSearch()">
            <div class="fav-icon">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
              </svg>
            </div>
            <span class="search-item-title">搜索 {{ query }}</span>
            <ChevronRight class="search-item-arrow" :size="16" />
          </button>
        </div>
      </div>

      <!-- 常驻入口：AI助手大卡片 + 其他四个小卡片 -->
      <div class="entry-grid">
        <button class="entry-btn ai-card" @click="openLink('ai')">
          <div class="ai-icon">
            <span v-html="aiSvg" class="ai-svg" />
          </div>
          <div class="ai-text">
            <span class="ai-name">AI 助手</span>
            <span class="ai-desc">智能对话 · 随时响应</span>
          </div>
        </button>
        <button class="entry-btn small" @click="openLink('history')">
          <div class="entry-icon">
            <span v-html="historySvg" />
          </div>
          <span class="entry-name">历史记录</span>
        </button>
        <button class="entry-btn small" @click="openLink('favorites')">
          <div class="entry-icon">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
            </svg>
          </div>
          <span class="entry-name">收藏夹</span>
        </button>
        <button class="entry-btn small" @click="openLink('downloads')">
          <div class="entry-icon">
            <span v-html="downloadsSvg" />
          </div>
          <span class="entry-name">下载管理</span>
        </button>
        <button class="entry-btn small" @click="openLink('settings')">
          <div class="entry-icon">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
              <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
            </svg>
          </div>
          <span class="entry-name">设置</span>
        </button>
      </div>

      <!-- 收藏夹 -->
      <div v-if="favorites.length > 0" class="section">
        <div class="section-header">
          <button class="section-more" @click="openLink('favorites')">
            <span class="section-title">收藏夹</span>
            <ChevronRight :size="16" />
          </button>
        </div>
        <div class="fav-grid">
          <button
            v-for="item in favorites"
            :key="item.url"
            class="fav-card"
            @click="openItem(item.url, item.title)"
          >
            <div class="fav-icon">
              <svg v-if="getInternalIconPath(item.url)" viewBox="0 0 24 24" width="20" height="20" fill="var(--color-accent)" class="internal-icon">
                <path :d="getInternalIconPath(item.url) ?? ''"/>
              </svg>
              <img
                v-else-if="item.favicon && !failedFavicons.has(item.favicon)"
                :src="item.favicon"
                class="fav-favicon"
                @error="onFaviconError(item.favicon)"
                @load="onFaviconLoad(item.favicon)"
              />
              <svg v-else viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
              </svg>
            </div>
            <span class="fav-name">{{ item.title || item.url }}</span>
          </button>
        </div>
      </div>

      <!-- 最近打开 -->
      <div v-if="recentTabs.length > 0" class="section">
        <div class="section-header">
          <button class="section-more" @click="openLink('history')">
            <span class="section-title">最近打开</span>
            <ChevronRight :size="16" />
          </button>
        </div>
        <div class="recent-grid">
          <button
            v-for="tab in recentTabs"
            :key="tab.id"
            class="recent-card"
            @click="openItem(tab.url, tab.title)"
          >
            <div class="fav-icon">
              <svg v-if="getInternalIconPath(tab.url)" viewBox="0 0 24 24" width="16" height="16" fill="var(--color-accent)" class="internal-icon">
                <path :d="getInternalIconPath(tab.url) ?? ''"/>
              </svg>
              <img
                v-else-if="tab.favicon && !failedFavicons.has(tab.favicon)"
                :src="tab.favicon"
                class="fav-favicon"
                @error="onFaviconError(tab.favicon)"
                @load="onFaviconLoad(tab.favicon)"
              />
              <svg v-else viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
              </svg>
            </div>
            <span class="fav-name">{{ tab.title || tab.url }}</span>
            <ChevronRight class="card-more" :size="16" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: var(--page-bg);
  padding: 32px 0 48px;
  box-sizing: border-box;
}

.inner {
  max-width: 720px;
  margin: 0 auto;
  padding: 0 32px;
}

/* ── 搜索框 ── */
.search-wrap {
  margin-bottom: 16px;
  position: relative;
}

.search-icon {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-tertiary);
  pointer-events: none;
}

/* ── 搜索结果浮层 ── */
.search-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--page-bg);
  border: 1px solid var(--card-border);
  border-radius: 8px;
  margin-top: 4px;
  padding: 8px;
  z-index: 100;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.search-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 6px;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background 0.15s ease;
  width: 100%;
  text-align: left;
}

.search-item:hover {
  background: var(--card-hover-bg);
}

.search-item .fav-icon {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}

.search-item .fav-icon :deep(svg) {
  width: 16px;
  height: 16px;
}

.search-item .fav-favicon {
  width: 16px;
  height: 16px;
  object-fit: contain;
}

.search-item-title {
  flex: 1;
  font-size: 14px;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.search-item-arrow {
  opacity: 0;
  color: var(--color-text-tertiary);
  flex-shrink: 0;
  transition: opacity 0.15s ease;
}

.search-item:hover .search-item-arrow {
  opacity: 1;
}

.search-input {
  width: 100%;
  height: 48px;
  border: 1px solid var(--input-border);
  border-radius: 8px;
  background: var(--input-bg);
  color: var(--input-text);
  font-size: 15px;
  padding: 0 48px 0 16px;
  outline: none;
  transition: border-color 0.2s ease;
  box-sizing: border-box;
}

.search-input::placeholder {
  color: var(--input-placeholder);
}

.search-input:focus {
  border-color: var(--input-border-focus);
}

/* ── 常驻入口 ── */
.entry-grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  grid-template-rows: auto auto;
  gap: 10px;
  margin-bottom: 32px;
}

.ai-card {
  grid-row: span 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 32px 24px;
  border: 1px solid var(--card-border);
  border-radius: 14px;
  background: var(--card-bg);
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
  text-align: center;
}

.ai-card:hover {
  background: var(--card-hover-bg);
  border-color: var(--color-accent);
}

.ai-icon {
  width: 108px;
  height: 108px;
  border-radius: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-accent);
}

.ai-icon :deep(svg) {
  width: 64px;
  height: 64px;
}

.ai-text {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.ai-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.ai-desc {
  font-size: 12px;
  color: var(--color-text-tertiary);
}

.entry-btn.small {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 8px;
  border: 1px solid var(--card-border);
  border-radius: 12px;
  background: var(--card-bg);
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.entry-btn.small:hover {
  background: var(--card-hover-bg);
  border-color: var(--color-accent);
}

.entry-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-accent);
}

.entry-icon :deep(svg) {
  width: 32px;
  height: 32px;
}

.entry-name {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.entry-btn.small:hover .entry-name {
  color: var(--color-text-primary);
}

/* ── 收藏夹/最近打开 ── */
.section {
  margin-bottom: 28px;
}

.section-header {
  margin-bottom: 10px;
}

.section-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.section-more {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--color-text-tertiary);
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
}

.section-more .section-title {
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.fav-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 8px;
}

.fav-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 14px 8px;
  border: 1px solid var(--card-border);
  border-radius: 10px;
  background: var(--card-bg);
  cursor: pointer;
  transition: background 0.15s ease;
}

.fav-card:hover {
  background: var(--card-hover-bg);
  border-color: var(--color-accent);
}

/* ── 历史记录 ── */
.recent-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.recent-card {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
  border: 1px solid var(--card-border);
  border-radius: 8px;
  background: var(--card-bg);
  cursor: pointer;
  transition: background 0.15s ease;
  box-sizing: border-box;
  min-width: 0;
}

.recent-card:hover {
  background: var(--card-hover-bg);
}

.recent-card:active {
  background: var(--card-hover-bg);
  opacity: 0.8;
}

.recent-card .fav-icon {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: var(--card-hover-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}

.recent-card .fav-name {
  flex: 1;
  font-size: 13px;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-more {
  opacity: 0;
  color: var(--color-text-tertiary);
  flex-shrink: 0;
  transition: opacity 0.15s ease;
}

.recent-card:hover .card-more {
  opacity: 1;
}

.fav-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: var(--card-hover-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}

.fav-favicon {
  width: 20px;
  height: 20px;
  object-fit: contain;
  border-radius: 4px;
}

.fav-name {
  font-size: 11px;
  color: var(--color-text-secondary);
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  line-height: 1.3;
}

.fav-card:hover .fav-name {
  color: var(--color-text-primary);
}
</style>
