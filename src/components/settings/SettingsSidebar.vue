<template>
  <aside class="sidebar">
    <div class="sidebar-header">
      <div class="sidebar-icon">
        <Settings :size="24" />
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
        <span class="nav-icon"><component :is="item.icon" :size="18" /></span>
        <span class="nav-label">{{ item.label }}</span>
      </button>
    </nav>

    <div class="sidebar-footer">
      <span class="version">lsqapp v1.0.0</span>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { CircleHelp, Download, Info, MessageCircle, Palette, Settings } from 'lucide-vue-next'

defineProps<{
  modelValue: string
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()

const menuItems = [
  { id: 'appearance', label: '外观', icon: Palette },
  { id: 'downloads', label: '下载', icon: Download },
  { id: 'ai', label: 'AI', icon: MessageCircle },
  { id: 'about', label: '关于', icon: Info },
  { id: 'help', label: '使用指南', icon: CircleHelp }
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
