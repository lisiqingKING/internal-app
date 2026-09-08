<template>
  <div class="message-bubble" :class="[role, { 'has-context': hasContext }]">
    <div class="bubble-content" @contextmenu.prevent="$emit('contextmenu', $event)">
      <div v-if="role === 'assistant'" class="message-text markdown-body" v-html="renderMarkdown(content)"></div>
      <div v-else class="message-text">{{ content }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useMarkdown } from '@/views/ai/composables/useMarkdown'

const { renderMarkdown } = useMarkdown()

defineProps<{
  content: string
  role: 'user' | 'assistant'
}>()

defineEmits<{
  contextmenu: [event: MouseEvent]
}>()

const hasContext = computed(() => true)
</script>

<style scoped>
.message-bubble {
  display: flex;
  padding: 3px 0;
}

.message-bubble.user {
  justify-content: flex-end;
}

.message-bubble.assistant {
  justify-content: flex-start;
}

.bubble-content {
  max-width: 78%;
  padding: 10px 16px;
  border-radius: 12px;
  font-size: 15px;
  line-height: 1.65;
}

.message-bubble.user .bubble-content {
  background: var(--color-surface);
  border-bottom-right-radius: 4px;
}

.message-bubble.assistant .bubble-content {
  background: var(--color-bg-primary);
  border-bottom-left-radius: 4px;
}

.message-text {
  color: var(--color-text-primary);
  white-space: pre-wrap;
  word-break: break-word;
}

/* Markdown */
.markdown-body :deep(p) {
  margin: 0 0 10px;
}
.markdown-body :deep(p:last-child) {
  margin-bottom: 0;
}
.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  margin: 8px 0;
  padding-left: 20px;
}
.markdown-body :deep(li) {
  margin: 4px 0;
}
.markdown-body :deep(code) {
  background: var(--color-code-bg);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.9em;
  font-family: ui-monospace, monospace;
}
.markdown-body :deep(pre) {
  background: var(--color-code-bg);
  border-radius: 8px;
  padding: 14px 16px;
  overflow-x: auto;
  margin: 12px 0;
}
.markdown-body :deep(pre code) {
  background: transparent;
  padding: 0;
  color: var(--color-code-text);
  font-size: 0.85em;
}
.markdown-body :deep(strong) {
  font-weight: 600;
}
.markdown-body :deep(a) {
  color: var(--color-accent);
  text-decoration: none;
}
.markdown-body :deep(a:hover) {
  text-decoration: underline;
}
.markdown-body :deep(table) {
  border-collapse: collapse;
  margin: 12px 0;
  width: 100%;
}
.markdown-body :deep(th),
.markdown-body :deep(td) {
  border: 1px solid var(--color-divider);
  padding: 8px 12px;
  text-align: left;
}
.markdown-body :deep(th) {
  background: var(--color-surface);
  font-weight: 600;
}
</style>
