<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, X } from 'lucide-vue-next'
import bilibiliSvg from '../assets/icons/bilibili.svg?raw'
import zhihuSvg from '../assets/icons/zhihu.svg?raw'
import xiaohongshuSvg from '../assets/icons/xiaohongshu.svg?raw'
import douyinSvg from '../assets/icons/douyin.svg?raw'
import ShortcutDialog from '../components/common/ShortcutDialog.vue'

document.title = '新标签页'

const query = ref('')
const dialogVisible = ref(false)

interface Site {
  name: string
  url: string
  bg: string
  icon: string
}

interface Shortcut {
  id: string
  name: string
  url: string
  icon: string | null
}

const sites: Site[] = [
  { name: 'Bilibili', url: 'https://www.bilibili.com', bg: '#fb7299', icon: bilibiliSvg },
  { name: '知乎', url: 'https://www.zhihu.com', bg: '#0066ff', icon: zhihuSvg },
  { name: '小红书', url: 'https://www.xiaohongshu.com', bg: '#fe2c55', icon: xiaohongshuSvg },
  { name: '抖音', url: 'https://www.douyin.com', bg: '#111', icon: douyinSvg },
]

const shortcuts = ref<Shortcut[]>([])

const shortcutsMod = window.bridge.getModules(['shortcuts']).shortcuts
const tabsMod = window.bridge.getModules(['tabs']).tabs

const loadShortcuts = async () => {
  try {
    const list = await shortcutsMod.list()
    shortcuts.value = list || []
  } catch {
    shortcuts.value = []
  }
}

const onShortcutsChanged = (list: Shortcut[]) => {
  if (Array.isArray(list)) shortcuts.value = list
}

onMounted(() => {
  loadShortcuts()
  window.bridge.on(window.bridge.channels.shortcuts.changed, onShortcutsChanged)
})

onUnmounted(() => {
  window.bridge.off(window.bridge.channels.shortcuts.changed, onShortcutsChanged)
})

const handleSearch = () => {
  const input = query.value.trim()
  if (!input) return

  let url: string
  if (input.startsWith('http://') || input.startsWith('https://') || input.startsWith('lsqapp://')) {
    url = input
  } else {
    url = `https://www.baidu.com/s?wd=${encodeURIComponent(input)}`
  }

  tabsMod.updateUrl(url)
}

const openSite = (url: string) => {
  tabsMod.updateUrl(url)
}

const letterOf = (name: string) => (name || '?').trim().slice(0, 1).toUpperCase()

/** 同一站点固定同一色相，图标抓取失败时的占位块不会每次刷新都变色 */
const colorOf = (url: string) => {
  let hash = 0
  for (let i = 0; i < url.length; i++) {
    hash = (hash * 31 + url.charCodeAt(i)) >>> 0
  }
  return `hsl(${hash % 360}, 55%, 45%)`
}

const handleDelete = async (shortcut: Shortcut) => {
  try {
    await ElMessageBox.confirm(`确定要删除快捷方式「${shortcut.name}」吗？`, '确认删除', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }

  try {
    await shortcutsMod.remove(shortcut.id)
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '删除失败')
  }
}
</script>

<template>
  <div class="new-tab-page">
    <div class="search-container">
      <form class="search-form" @submit.prevent="handleSearch">
        <div class="search-input-wrapper">
          <svg class="search-icon" viewBox="0 0 24 24" width="20" height="20">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
          <input
            v-model="query"
            type="text"
            class="search-input"
            placeholder="搜索或输入网址，按 Enter 跳转"
            autofocus
          />
        </div>
      </form>
    </div>

    <!-- 常用网站快捷方式 -->
    <div class="shortcuts">
      <button
        v-for="site in sites"
        :key="site.name"
        class="shortcut"
        @click="openSite(site.url)"
      >
        <div class="shortcut-icon" :style="{ background: site.bg }">
          <span v-html="site.icon" />
        </div>
        <span class="shortcut-name">{{ site.name }}</span>
      </button>

      <button
        v-for="item in shortcuts"
        :key="item.id"
        class="shortcut custom"
        :title="item.url"
        @click="openSite(item.url)"
      >
        <div
          class="shortcut-icon"
          :style="item.icon ? undefined : { background: colorOf(item.url) }"
        >
          <img v-if="item.icon" :src="item.icon" class="shortcut-img" alt="" />
          <span v-else class="shortcut-letter">{{ letterOf(item.name) }}</span>
        </div>
        <span class="shortcut-name">{{ item.name }}</span>
        <span class="shortcut-remove" title="删除" @click.stop="handleDelete(item)">
          <X :size="14" />
        </span>
      </button>

      <button class="shortcut add" title="添加快捷方式" @click="dialogVisible = true">
        <div class="shortcut-icon add">
          <Plus :size="20" />
        </div>
        <span class="shortcut-name">新建快捷方式</span>
      </button>
    </div>

    <ShortcutDialog v-model:visible="dialogVisible" />
  </div>
</template>

<style scoped>
.new-tab-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  background: transparent;
  margin: 0;
  /* 靠上锚定而非垂直居中 —— 居中会让上下各留一大片空白 */
  padding: clamp(48px, 12vh, 120px) 24px 48px;
  box-sizing: border-box;
}

.search-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  width: 100%;
  max-width: 560px;
  padding: 0 24px;
}

.search-form {
  width: 100%;
}

.search-input-wrapper {
  position: relative;
  width: 100%;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 18px;
  pointer-events: none;
  flex-shrink: 0;
  color: var(--color-text-tertiary);
}

.search-input {
  width: 100%;
  height: 52px;
  border: none;
  border-radius: 26px;
  background: var(--input-bg);
  color: var(--color-text-primary);
  font-size: 16px;
  padding: 0 24px 0 50px;
  outline: none;
  border: 1px solid var(--input-border);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  box-sizing: border-box;
}

.search-input:hover {
  border-color: var(--color-border);
}

.search-input:focus {
  border-color: var(--input-border-focus);
  box-shadow: 0 0 0 2px rgba(138, 180, 248, 0.2);
}

.search-input::placeholder {
  color: var(--color-placeholder);
}

/* ── 快捷方式 ── */
/*
 * 用 flex 换行而不是 grid：
 * grid 的 1fr 轨道会预留空轨道，卡片数不足一行时右边空出一整列，视觉上不居中；
 * flex 每行独立居中，卡片组始终居中。
 * 卡片固定 96px —— 换行后各行才对得齐，名称截断位置也一致。
 * 一行 6 个：6 × 96 + 5 × 12 = 636px。
 */
.shortcuts {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  margin-top: 24px;
  width: 100%;
  max-width: 636px;
}

.shortcut {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 96px;
  padding: 12px 8px;
  border: none;
  border-radius: 12px;
  background: transparent;
  cursor: pointer;
  transition: background 0.2s ease;
}

.shortcut:hover {
  background: var(--card-hover-bg);
}

.shortcut-icon {
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: #fff;
  overflow: hidden;
  flex-shrink: 0;
}

/* 内置站点的 SVG 是写死 22×24 的，跟着圆圈一起放大 */
.shortcut-icon svg {
  width: 60%;
  height: 60%;
}

.shortcut-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.shortcut-letter {
  font-size: 22px;
  font-weight: 600;
}

.shortcut-name {
  color: var(--color-text-secondary);
  font-size: 12px;
  white-space: nowrap;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}

.shortcut:hover .shortcut-name {
  color: var(--color-text-primary);
}

.shortcut-remove {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
  opacity: 0;
  transition: opacity 0.15s ease;
}

.shortcut:hover .shortcut-remove {
  opacity: 1;
}

.shortcut-remove:hover {
  background: #e5484d;
  color: #fff;
}

.shortcut-icon.add {
  border: 1px dashed var(--color-border);
  background: transparent;
  color: var(--color-text-tertiary);
  transition: color 0.2s ease, border-color 0.2s ease;
}

/* lucide 是描边图标，比原来的实心加号显薄，加粗一档保持视觉重量 */
.shortcut-icon.add svg {
  stroke-width: 2.5;
}

.shortcut:hover .shortcut-icon.add {
  color: var(--color-accent);
  border-color: var(--color-accent);
}
</style>
