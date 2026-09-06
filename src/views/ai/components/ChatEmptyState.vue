<template>
  <div class="empty-state">
    <div class="empty-icon">
      <svg viewBox="0 0 48 48" width="56" height="56" fill="none">
        <circle cx="24" cy="24" r="22" stroke="currentColor" stroke-width="1.5" opacity="0.2"/>
        <path d="M16 20a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM32 20a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" fill="currentColor" opacity="0.4"/>
        <path d="M8 32c0-8.837 7.163-16 16-16s16 7.163 16 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.4"/>
        <circle cx="18" cy="26" r="1.5" fill="currentColor" opacity="0.6"/>
        <circle cx="26" cy="26" r="1.5" fill="currentColor" opacity="0.6"/>
        <path d="M20 30c0 0 1.5 2 4 2s4-2 4-2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/>
      </svg>
    </div>
    <h2>开始新对话</h2>
    <p>点击下方「新建对话」开启与 AI 的对话</p>
    <button class="start-btn" @click="emit('new-chat')">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="12" y1="5" x2="12" y2="19"/>
        <line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      新建对话
    </button>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  'new-chat': []
}>()
</script>

<style scoped>
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--color-text-primary);
  text-align: center;
  padding: 40px;
  gap: 12px;
}

.empty-icon {
  color: var(--color-accent);
  margin-bottom: 8px;
  opacity: 0.7;
}

.empty-state h2 {
  font-size: 22px;
  font-weight: 600;
  margin: 0;
  color: var(--color-text-primary);
}

.empty-state p {
  color: var(--color-text-secondary);
  margin: 0;
  font-size: 14px;
}

.start-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  padding: 10px 22px;
  background: var(--color-accent);
  color: var(--color-text-inverse);
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.15s;
}

.start-btn:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.start-btn:active {
  transform: translateY(0);
}
</style>
