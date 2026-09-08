<template>
  <div class="message-bubble user">
    <div class="bubble-content">
      <div class="message-text">{{ content }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  content: string
}>()
</script>

<style scoped>
.message-bubble {
  display: block;
  max-width: 100%;
  text-align: left;
  margin-left: auto;
}

.bubble-content {
  max-width: 100%;
  padding: 10px 16px;
  border-radius: 12px;
  background: var(--color-surface);
  border-bottom-right-radius: 4px;
  font-size: 15px;
  line-height: 1.65;
}

.message-text {
  color: var(--color-text-primary);
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
