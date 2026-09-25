<template>
  <div class="help-settings">
    <div class="content-header">
      <h2>使用指南</h2>
      <p>了解 lsqapp 能为你做什么</p>
    </div>

    <div class="guide-list">
      <div v-for="item in guides" :key="item.title" class="guide-card">
        <div class="guide-icon" v-html="item.icon"></div>
        <div class="guide-info">
          <h3>{{ item.title }}</h3>
          <p>{{ item.desc }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const guides = [
  {
    title: 'AI 助手',
    desc: '配置 AI 模型后，可与 AI 对话。支持多配置切换、提示词管理。',
    icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>'
  },
  {
    title: '历史记录',
    desc: '自动记录浏览历史，方便回顾和查找曾经访问过的页面。',
    icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/></svg>'
  },
  {
    title: '收藏夹',
    desc: '将常用网站收藏到这里，快速访问。',
    icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>'
  },
  {
    title: '下载管理',
    desc: '查看和管理已下载的文件。',
    icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>'
  },
  {
    title: '新标签页',
    desc: '打开新标签页时，显示搜索入口和常用网站快捷方式。',
    icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M19 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 14H5V8h14v10z"/></svg>'
  },
  {
    title: '外观设置',
    desc: '支持浅色和深色主题自由切换。',
    icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/></svg>'
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
