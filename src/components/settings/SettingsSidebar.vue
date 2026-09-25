<template>
  <aside class="sidebar">
    <div class="sidebar-header">
      <div class="sidebar-icon">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
          <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
        </svg>
      </div>
      <span class="sidebar-title">设置</span>
    </div>

    <nav class="sidebar-nav">
      <button
        v-for="item in menuItems"
        :key="item.id"
        :class="['nav-item', { active: modelValue === item.id }]"
        @click="$emit('update:modelValue', item.id)"
      >
        <span class="nav-icon" v-html="item.icon"></span>
        <span class="nav-label">{{ item.label }}</span>
      </button>
    </nav>

    <div class="sidebar-footer">
      <span class="version">lsqapp v1.0.0</span>
    </div>
  </aside>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: string
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()

const menuItems = [
  {
    id: 'appearance',
    label: '外观',
    icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/></svg>'
  },
  {
    id: 'downloads',
    label: '下载',
    icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>'
  },
  {
    id: 'ai',
    label: 'AI',
    icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>'
  },
  {
    id: 'about',
    label: '关于',
    icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>'
  },
  {
    id: 'help',
    label: '使用指南',
    icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/></svg>'
  }
]
</script>

<style lang="scss" scoped>
.sidebar {
  width: 200px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: transparent;
  border-right: 1px solid var(--card-border);
  padding: 16px 12px;
}

.sidebar-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 8px 16px;
}

.sidebar-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-accent);
  border-radius: 8px;
  color: white;
  flex-shrink: 0;
}

.sidebar-title {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--color-text-primary);
}

.sidebar-nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 7px 10px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;
  width: 100%;
  border-left: 3px solid transparent;
}

.nav-item:hover {
  background: var(--color-surface);
  color: var(--color-text-primary);
}

.nav-item.active {
  background: var(--color-surface);
  color: var(--color-accent);
  border-left-color: var(--color-accent);
}

.nav-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.sidebar-footer {
  padding: 12px 8px 4px;
}

.version {
  font-size: 0.7rem;
  color: var(--color-text-tertiary);
}
</style>
