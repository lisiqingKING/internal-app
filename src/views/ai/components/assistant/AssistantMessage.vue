<template>
  <div
    ref="rootRef"
    class="assistant-message"
    :class="[message.role, { highlighted }]"
    :data-msg-id="message.msgId"
  >
    <div class="bubble">
      <div
        v-if="message.role === 'assistant'"
        class="markdown-body"
        v-html="renderMarkdown(message.content)"
      ></div>
      <div v-else class="plain-text">{{ message.content }}</div>
    </div>

    <div v-if="message.role === 'assistant'" class="actions">
      <button class="excerpt-btn" title="摘录为笔记" @click="onExcerpt">📝</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useMarkdown } from '../../composables/useMarkdown'
import type { Message } from '../../types'

const props = defineProps<{
  message: Message
  /** 搜索跳转后短暂高亮（FR-5.4） */
  highlighted?: boolean
}>()

const emit = defineEmits<{
  excerpt: [payload: { msgId: string; content: string; fullContent: string }]
}>()

const { renderMarkdown } = useMarkdown()
const rootRef = ref<HTMLElement | null>(null)

/** 有选中文字时摘录选中部分，否则摘录整条消息 */
function onExcerpt() {
  const selection = window.getSelection()
  const selected = selection?.toString().trim() ?? ''
  const root = rootRef.value
  const inThisMessage =
    !!selected && !!root && !!selection?.anchorNode && root.contains(selection.anchorNode)

  emit('excerpt', {
    msgId: props.message.msgId,
    content: inThisMessage ? selected : props.message.content,
    fullContent: props.message.content,
  })
}
</script>

<style scoped>
.assistant-message {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  padding: 4px 0;
}

.assistant-message.user {
  justify-content: flex-end;
}

.assistant-message.highlighted .bubble {
  outline: 1px solid var(--color-accent);
  outline-offset: 2px;
  border-radius: 12px;
}

.bubble {
  max-width: 88%;
  padding: 8px 12px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.6;
}

.assistant-message.user .bubble {
  background: var(--color-surface);
  border-bottom-right-radius: 4px;
  color: var(--color-text-primary);
}

.assistant-message.assistant .bubble {
  background: transparent;
  border-bottom-left-radius: 4px;
  padding-left: 0;
}

.plain-text {
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--color-text-primary);
}

.actions {
  opacity: 0;
  transition: opacity 0.15s;
  flex-shrink: 0;
}

.assistant-message:hover .actions {
  opacity: 1;
}

.excerpt-btn {
  border: none;
  background: none;
  cursor: pointer;
  font-size: 13px;
  line-height: 1;
  padding: 4px;
  border-radius: 4px;
  color: var(--color-text-tertiary);
}

.excerpt-btn:hover {
  background: var(--color-surface);
}

/* Markdown */
.markdown-body :deep(p) {
  margin: 0 0 8px;
}

.markdown-body :deep(p:last-child) {
  margin-bottom: 0;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  margin: 6px 0;
  padding-left: 18px;
}

.markdown-body :deep(li) {
  margin: 3px 0;
}

.markdown-body :deep(code) {
  background: var(--color-code-bg);
  padding: 2px 5px;
  border-radius: 4px;
  font-size: 0.9em;
  font-family: ui-monospace, monospace;
}

.markdown-body :deep(pre) {
  background: var(--color-code-bg);
  border-radius: 6px;
  padding: 10px 12px;
  overflow-x: auto;
  margin: 8px 0;
}

.markdown-body :deep(pre code) {
  background: transparent;
  color: var(--color-code-text);
}

.markdown-body :deep(strong) {
  font-weight: 600;
}
</style>
