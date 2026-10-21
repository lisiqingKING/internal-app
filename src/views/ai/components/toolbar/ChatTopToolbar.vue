<template>
  <div class="top-toolbar">
    <!-- 中间: 会话标题 -->
    <div class="session-title">{{ sessionTitle }}</div>

    <!-- 右侧: 辅助面板入口 / 灵感入口 -->
    <div class="toolbar-right">
      <button class="toolbar-btn assistant-entry-btn" @click="emit('toggle-assistant')" title="辅助面板">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="4" width="18" height="16" rx="2"/>
          <line x1="13" y1="4" x2="13" y2="20"/>
        </svg>
      </button>
      <button class="toolbar-btn inspiration-entry-btn" @click="emit('toggle-inspiration')" title="灵感大全">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  sessionTitle: string
}>()

const emit = defineEmits<{
  'toggle-inspiration': []
  'toggle-assistant': []
}>()
</script>

<style scoped>
.top-toolbar {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  border-bottom: 1px solid var(--color-divider);
  gap: 12px;
  flex-shrink: 0;
  background: var(--color-bg-primary);
}

.session-title {
  flex: 1;
  text-align: center;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 0 12px;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: var(--color-surface);
  border: 1px solid var(--color-divider);
  border-radius: 6px;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.toolbar-btn:hover {
  background: var(--color-surface-hover);
  color: var(--color-text-primary);
}
</style>
