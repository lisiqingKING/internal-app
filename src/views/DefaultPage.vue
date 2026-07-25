<script setup lang="ts">
import { ref } from 'vue'
import aiSvg from '../assets/icons/ai.svg?raw'
import historySvg from '../assets/icons/history.svg?raw'
import downloadsSvg from '../assets/icons/downloads.svg?raw'
import logsSvg from '../assets/icons/logs.svg?raw'

document.title = '首页'

const isDev = window.location.hostname === 'localhost'

function getInternalUrl(route: string): string {
  if (isDev) return `http://localhost:5273/#/${route}`
  return `lsqapp://internal-app/${route}`
}

interface QuickLink {
  name: string
  route: string
  icon: string
  color: string
}

const quickLinks: QuickLink[] = [
  { name: 'AI 助手', route: 'ai', color: '#8ab4f8', icon: aiSvg },
  { name: '历史记录', route: 'history', color: '#f9ab00', icon: historySvg },
  { name: '下载管理', route: 'downloads', color: '#34a853', icon: downloadsSvg },
  { name: '日志查看', route: 'logs', color: '#ea4335', icon: logsSvg },
]

const openLink = (route: string) => {
  const url = getInternalUrl(route)
  window.bridge.getModules(['tabs']).tabs.create({ title: '', url })
}
</script>

<template>
  <div class="home-page">
    <div class="home-content">
      <!-- Logo + 标题 -->
      <div class="brand">
        <div class="brand-logo">
          <svg viewBox="0 0 24 24" width="56" height="56" fill="none">
            <defs>
              <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#8ab4f8" />
                <stop offset="100%" style="stop-color:#6366f1" />
              </linearGradient>
            </defs>
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="url(#grad)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <h1 class="brand-title">lsqapp</h1>
        <p class="brand-subtitle">Electron + Vite + Vue 3 桌面浏览器</p>
      </div>

      <!-- 快捷入口 -->
      <div class="quick-links">
        <button
          v-for="link in quickLinks"
          :key="link.name"
          class="quick-link"
          @click="openLink(link.route)"
        >
          <div class="quick-link-icon" :style="{ color: link.color }">
            <span v-html="link.icon" />
          </div>
          <span class="quick-link-name">{{ link.name }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-page {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--page-bg);
  margin: 0;
  padding: 0;
}

.home-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 48px;
}

/* ── 品牌区 ── */
.brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.brand-logo {
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--card-bg);
  border-radius: 20px;
  border: 1px solid var(--card-border);
}

.brand-title {
  font-size: 2rem;
  font-weight: 700;
  background: linear-gradient(135deg, var(--color-text-primary), var(--color-accent));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
}

.brand-subtitle {
  color: var(--color-text-secondary);
  font-size: 14px;
  margin: 0;
}

/* ── 快捷入口 ── */
.quick-links {
  display: flex;
  gap: 16px;
}

.quick-link {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 20px 24px;
  border: none;
  border-radius: 16px;
  background: var(--card-bg);
  cursor: pointer;
  transition: background 0.2s ease, transform 0.15s ease;
  min-width: 100px;
}

.quick-link:hover {
  background: var(--card-hover-bg);
  transform: translateY(-4px);
}

.quick-link:active {
  transform: translateY(-1px);
}

.quick-link-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--card-hover-bg);
  border-radius: 14px;
  transition: background 0.2s ease;
}

.quick-link:hover .quick-link-icon {
  background: var(--card-hover-bg);
}

.quick-link-name {
  color: var(--color-text-secondary);
  font-size: 13px;
  transition: color 0.2s ease;
}

.quick-link:hover .quick-link-name {
  color: var(--color-text-primary);
}
</style>
