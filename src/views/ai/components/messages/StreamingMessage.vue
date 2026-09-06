<template>
  <div class="message-bubble assistant">
    <div class="bubble-content">
      <div v-if="reasoning" class="thinking-block">
        <div class="thinking-content">{{ reasoning }}</div>
      </div>
      <div class="message-text markdown-body" v-html="renderMarkdown(text)"></div>
      <span v-if="text" class="cursor"></span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useMarkdown } from '@/views/ai/composables/useMarkdown'

const { renderMarkdown } = useMarkdown()

defineProps<{
  text: string
  reasoning?: string
}>()
</script>

<style scoped>
.message-bubble {
  display: flex;
  padding: 3px 0;
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
  background: var(--color-bg-primary);
  border-bottom-left-radius: 4px;
}

.message-text {
  color: var(--color-text-primary);
  white-space: pre-wrap;
  word-break: break-word;
}

/* 光标 */
.cursor {
  display: inline-block;
  width: 2px;
  height: 16px;
  background: var(--color-accent);
  margin-left: 2px;
  vertical-align: middle;
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

/* 思考过程 */
.thinking-block {
  margin-bottom: 8px;
}

.thinking-content {
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.6;
  padding: 8px 12px;
  background: rgba(16, 185, 129, 0.06);
  border-left: 2px solid var(--color-accent);
  border-radius: 0 6px 6px 0;
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
</style>
