<script setup lang="ts">
import { ref } from 'vue'
import bilibiliSvg from '../assets/icons/bilibili.svg?raw'
import zhihuSvg from '../assets/icons/zhihu.svg?raw'
import xiaohongshuSvg from '../assets/icons/xiaohongshu.svg?raw'
import douyinSvg from '../assets/icons/douyin.svg?raw'

document.title = '新标签页'

const query = ref('')

interface Site {
  name: string
  url: string
  bg: string
  icon: string
}

const sites: Site[] = [
  { name: 'Bilibili', url: 'https://www.bilibili.com', bg: '#fb7299', icon: bilibiliSvg },
  { name: '知乎', url: 'https://www.zhihu.com', bg: '#0066ff', icon: zhihuSvg },
  { name: '小红书', url: 'https://www.xiaohongshu.com', bg: '#fe2c55', icon: xiaohongshuSvg },
  { name: '抖音', url: 'https://www.douyin.com', bg: '#111', icon: douyinSvg },
]

const handleSearch = () => {
  const input = query.value.trim()
  if (!input) return

  let url: string
  if (input.startsWith('http://') || input.startsWith('https://') || input.startsWith('lsqapp://')) {
    url = input
  } else {
    url = `https://www.baidu.com/s?wd=${encodeURIComponent(input)}`
  }

  window.bridge.getModules(['tabs']).tabs.updateUrl(url)
}

const openSite = (url: string) => {
  window.bridge.getModules(['tabs']).tabs.updateUrl(url)
}
</script>

<template>
  <div class="new-tab-page">
    <div class="search-container">
      <form class="search-form" @submit.prevent="handleSearch">
        <div class="search-input-wrapper">
          <svg class="search-icon" viewBox="0 0 24 24" width="20" height="20" fill="#80868b">
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
    </div>
  </div>
</template>

<style scoped>
.new-tab-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #1a1a2e;
  margin: 0;
  padding: 0;
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
}

.search-input {
  width: 100%;
  height: 52px;
  border: none;
  border-radius: 26px;
  background: #2a2a3e;
  color: #e8eaed;
  font-size: 16px;
  padding: 0 24px 0 50px;
  outline: none;
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  box-sizing: border-box;
}

.search-input:hover {
  border-color: rgba(255, 255, 255, 0.15);
}

.search-input:focus {
  border-color: #8ab4f8;
  box-shadow: 0 0 0 2px rgba(138, 180, 248, 0.2);
}

.search-input::placeholder {
  color: #80868b;
}

/* ── 快捷方式 ── */
.shortcuts {
  display: flex;
  gap: 16px;
  margin-top: 24px;
}

.shortcut {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border: none;
  border-radius: 12px;
  background: transparent;
  cursor: pointer;
  transition: background 0.2s ease;
  min-width: 80px;
}

.shortcut:hover {
  background: rgba(255, 255, 255, 0.06);
}

.shortcut-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: #fff;
}

.shortcut-name {
  color: #9aa0a6;
  font-size: 12px;
  white-space: nowrap;
}

.shortcut:hover .shortcut-name {
  color: #e8eaed;
}
</style>
