<script setup lang="ts">
import { ref, onMounted } from 'vue'
import aiSvg from '../assets/icons/ai.svg?raw'
import historySvg from '../assets/icons/history.svg?raw'
import downloadsSvg from '../assets/icons/downloads.svg?raw'
import logsSvg from '../assets/icons/logs.svg?raw'

document.title = '首页'

const query = ref('')
const failedFavicons = ref<Set<string>>(new Set())

interface FavoriteItem { url: string; title: string; favicon?: string | null }
interface TabItem { id: string; title: string; url: string; favicon?: string; isHome?: boolean }
const favorites = ref<FavoriteItem[]>([])
const recentTabs = ref<TabItem[]>([])

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

async function loadData() {
  try {
    const [{ favorites: favModule }, { tabs: tabsModule }] = await Promise.all([
      window.bridge.getModules(['favorites']),
      window.bridge.getModules(['tabs']),
    ])
    const [favList, tabList] = await Promise.all([
      favModule.list().catch(() => []),
      tabsModule.list().catch(() => ({ tabs: [] })),
    ])
    favorites.value = (favList as FavoriteItem[]).slice(0, 8)
    const allTabs = (tabList as { tabs: TabItem[] }).tabs ?? []
    recentTabs.value = allTabs.filter(t => !t.isHome).slice(-8).reverse()
  } catch {
    favorites.value = []
    recentTabs.value = []
  }
}

function openItem(url: string, title: string) {
  window.bridge.getModules(['tabs']).tabs.create({ title: title || '', url })
}

function onFaviconError(url: string) {
  failedFavicons.value.add(url)
}

function onFaviconLoad(url: string) {
  failedFavicons.value.delete(url)
}

function getFaviconEl(item: { favicon?: string | null; url: string }) {
  if (item.favicon && !failedFavicons.value.has(item.favicon)) {
    return `img:${item.favicon}`
  }
  return 'default'
}

onMounted(() => {
  loadData()
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
          />
        </form>
      </div>

      <!-- 常驻入口：AI助手大卡片 + 其他四个小卡片 -->
      <div class="entry-grid">
        <button class="entry-btn ai-card" @click="openLink('ai')">
          <div class="ai-icon">
            <span v-html="aiSvg" />
          </div>
          <div class="ai-text">
            <span class="ai-name">AI 助手</span>
            <span class="ai-desc">智能对话 · 随时响应</span>
          </div>
        </button>
        <button class="entry-btn small" @click="openLink('history')">
          <div class="entry-icon" style="background: rgba(249,171,0,0.12)">
            <span v-html="historySvg" />
          </div>
          <span class="entry-name">历史记录</span>
        </button>
        <button class="entry-btn small" @click="openLink('favorites')">
          <div class="entry-icon" style="background: rgba(249,171,0,0.12)">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="#f9ab00">
              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
            </svg>
          </div>
          <span class="entry-name">收藏夹</span>
        </button>
        <button class="entry-btn small" @click="openLink('downloads')">
          <div class="entry-icon" style="background: rgba(52,168,83,0.12)">
            <span v-html="downloadsSvg" />
          </div>
          <span class="entry-name">下载管理</span>
        </button>
        <button class="entry-btn small" @click="openLink('logs')">
          <div class="entry-icon" style="background: rgba(234,67,53,0.12)">
            <span v-html="logsSvg" />
          </div>
          <span class="entry-name">日志查看</span>
        </button>
      </div>

      <!-- 收藏夹 -->
      <div v-if="favorites.length > 0" class="section">
        <div class="section-header">
          <span class="section-title">收藏夹</span>
          <button class="section-more" @click="openLink('favorites')">查看全部</button>
        </div>
        <div class="fav-grid">
          <button
            v-for="item in favorites"
            :key="item.url"
            class="fav-card"
            @click="openItem(item.url, item.title)"
          >
            <div class="fav-icon">
              <img
                v-if="item.favicon && !failedFavicons.has(item.favicon)"
                :src="item.favicon"
                class="fav-favicon"
                @error="onFaviconError(item.favicon!)"
                @load="onFaviconLoad(item.favicon!)"
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
          <span class="section-title">最近打开</span>
        </div>
        <div class="fav-grid">
          <button
            v-for="tab in recentTabs"
            :key="tab.id"
            class="fav-card"
            @click="openItem(tab.url, tab.title)"
          >
            <div class="fav-icon">
              <img
                v-if="tab.favicon && !failedFavicons.has(tab.favicon)"
                :src="tab.favicon"
                class="fav-favicon"
                @error="onFaviconError(tab.favicon)"
                @load="onFaviconLoad(tab.favicon)"
              />
              <svg v-else viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
              </svg>
            </div>
            <span class="fav-name">{{ tab.title || tab.url }}</span>
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
  margin-bottom: 32px;
}

.search-input {
  width: 100%;
  height: 48px;
  border: 1px solid var(--input-border);
  border-radius: 8px;
  background: var(--input-bg);
  color: var(--input-text);
  font-size: 15px;
  padding: 0 16px;
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
  background: rgba(138,180,248,0.12);
  display: flex;
  align-items: center;
  justify-content: center;
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
  display: flex;
  justify-content: space-between;
  align-items: center;
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
  font-size: 12px;
  color: var(--color-accent);
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
}

.section-more:hover {
  background: var(--card-hover-bg);
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
