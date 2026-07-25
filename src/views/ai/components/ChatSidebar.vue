<template>
  <div class="sidebar">
    <div class="sidebar-header">
      <button class="new-chat-btn" @click="$emit('new-chat')">
        <span>+</span> 新建对话
      </button>
    </div>
    <div class="sidebar-title">历史对话</div>
    <div class="session-list">
      <div
        v-for="session in sortedSessions"
        :key="session.convId"
        class="session-item"
        :class="{ active: session.convId === currentSessionId, loading: session.isLoading }"
        @click="$emit('switch-session', session.convId)"
      >
        <span class="session-title">{{ session.title }}</span>
        <span v-if="session.isLoading" class="loading-indicator"></span>
        <button class="delete-btn" @click.stop="$emit('delete-session', session.convId)">×</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ChatSession } from '../types'

const props = defineProps<{
  sessions: ChatSession[]
  currentSessionId: string | null
}>()

const sortedSessions = computed(() => {
  return [...props.sessions].sort((a, b) => b.createdAt - a.createdAt)
})

defineEmits<{
  'new-chat': []
  'switch-session': [id: string]
  'delete-session': [id: string]
}>()
</script>

<style scoped>
.sidebar {
  width: 260px;
  background: var(--color-bg-secondary);
  border-right: 1px solid var(--color-divider);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-header {
  padding: 16px;
}

.new-chat-btn {
  width: 100%;
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px dashed var(--color-border);
  background: transparent;
  color: var(--color-text-primary);
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: background 0.2s, border-color 0.2s;
}

.new-chat-btn:hover {
  background: var(--color-surface);
  border-color: var(--color-accent);
}

.new-chat-btn span {
  font-size: 18px;
  font-weight: 600;
}

.sidebar-title {
  padding: 8px 16px;
  font-size: 12px;
  color: var(--color-text-secondary);
  text-transform: uppercase;
}

.session-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 8px;
}

.session-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 4px;
  transition: background 0.2s;
}

.session-item:hover {
  background: var(--color-surface);
}

.session-item.active {
  background: var(--color-accent);
}

.session-title {
  flex: 1;
  font-size: 14px;
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.loading-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--color-accent);
  animation: bounce 1.4s infinite ease-in-out both;
  flex-shrink: 0;
}

.loading-indicator:nth-child(2) { animation-delay: -0.32s; }

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}

.delete-btn {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 16px;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s, background 0.2s;
}

.session-item:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  background: var(--color-status-error);
  color: var(--color-text-inverse);
}
</style>