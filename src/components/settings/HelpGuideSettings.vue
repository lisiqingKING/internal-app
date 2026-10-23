<template>
  <div class="help-settings">
    <div class="content-header">
      <h2>使用指南</h2>
      <p>了解 lsqapp 能为你做什么</p>
    </div>

    <div class="guide-list">
      <div v-for="item in guides" :key="item.title" class="guide-card">
        <div class="guide-icon"><component :is="item.icon" :size="24" /></div>
        <div class="guide-info">
          <h3>{{ item.title }}</h3>
          <p>{{ item.desc }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Download, History, MessageCircle, Palette, Star, Square } from 'lucide-vue-next'

const guides = [
  {
    title: 'AI 助手',
    desc: '配置 AI 模型后，可与 AI 对话。支持多配置切换、提示词管理。',
    icon: MessageCircle
  },
  {
    title: '历史记录',
    desc: '自动记录浏览历史，方便回顾和查找曾经访问过的页面。',
    icon: History
  },
  {
    title: '收藏夹',
    desc: '将常用网站收藏到这里，快速访问。',
    icon: Star
  },
  {
    title: '下载管理',
    desc: '查看和管理已下载的文件。',
    icon: Download
  },
  {
    title: '新标签页',
    desc: '打开新标签页时，显示搜索入口和常用网站快捷方式。',
    icon: Square
  },
  {
    title: '外观设置',
    desc: '支持浅色和深色主题自由切换。',
    icon: Palette
  }
]
</script>

<style lang="scss" scoped>
.help-settings {
  max-width: 560px;
}

.content-header {
  margin-bottom: 28px;
}

.content-header h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 6px;
}

.content-header p {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  margin: 0;
}

.guide-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 560px;
}

.guide-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 18px 20px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 10px;
  transition: border-color 0.15s ease;
}

.guide-card:hover {
  border-color: var(--color-accent);
}

.guide-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--card-hover-bg);
  border-radius: 10px;
  color: var(--color-accent);
  flex-shrink: 0;
}

.guide-icon :deep(svg) {
  width: 22px;
  height: 22px;
}

.guide-info h3 {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 4px;
}

.guide-info p {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  margin: 0;
  line-height: 1.5;
}
</style>
