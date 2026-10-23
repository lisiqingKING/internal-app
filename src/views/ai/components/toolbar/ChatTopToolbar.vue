<template>
  <div class="top-toolbar">
    <!-- 中间: 会话标题 -->
    <div class="session-title">{{ sessionTitle }}</div>

    <!-- 右侧: 辅助面板入口 / 灵感入口 -->
    <div class="toolbar-right">
      <button
        class="toolbar-btn assistant-entry-btn"
        :class="{ active: assistantActive }"
        :title="assistantActive ? '关闭辅助面板' : '辅助面板'"
        @click="emit('toggle-assistant')"
      >
        <Bot :size="15" />
      </button>
      <button
        class="toolbar-btn inspiration-entry-btn"
        :class="{ active: inspirationActive }"
        :title="inspirationActive ? '收起灵感大全' : '灵感大全'"
        @click="emit('toggle-inspiration')"
      >
        <Lightbulb :size="15" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Bot, Lightbulb } from 'lucide-vue-next'

defineProps<{
  sessionTitle: string
  /** 辅助面板是否已打开 */
  assistantActive?: boolean
  /** 灵感面板是否已展开 */
  inspirationActive?: boolean
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

/* 面板已打开：入口按钮给出状态提示 */
.toolbar-btn.active {
  background: var(--color-accent-muted);
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.toolbar-btn.active:hover {
  background: var(--color-accent-muted);
  color: var(--color-accent);
}
</style>
