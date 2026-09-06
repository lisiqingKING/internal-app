<template>
  <div class="empty-state">
    <div class="empty-icon">💬</div>
    <h2>开始新对话</h2>
    <p>点击左侧「新建对话」开始聊天</p>
    <button class="start-btn" @click="emit('new-chat')">新建对话</button>
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
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 24px;
}

.empty-state h2 {
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 12px;
}

.empty-state p {
  color: var(--color-text-secondary);
  margin: 0 0 24px;
}

.start-btn {
  padding: 12px 24px;
  background: var(--color-accent);
  color: var(--color-text-inverse);
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  transition: background 0.2s;
}

.start-btn:hover {
  background: var(--color-accent-hover);
}
</style>
