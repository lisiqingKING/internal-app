<template>
  <div class="chat-messages" ref="messagesRef" @scroll="handleScroll">
    <div class="messages-inner">
      <div
        v-for="(msg, index) in messages"
        :key="index"
        class="message-item"
        :class="msg.role"
      >
        <div class="message-content" @contextmenu.prevent="showContextMenu(index, $event)">
          <div v-if="msg.role === 'assistant'" class="message-text markdown-body" v-html="renderMarkdown(msg.content)"></div>
          <div v-else class="message-text">{{ msg.content }}</div>
        </div>
      </div>

      <!-- 正在输入的助手消息 -->
      <div v-if="loading && (currentText || currentReasoning)" class="message-item assistant">
        <div class="message-content">
          <div v-if="currentReasoning" class="thinking-block">
            <div class="thinking-content">{{ currentReasoning }}</div>
          </div>
          <div v-if="currentText" class="message-text markdown-body" v-html="renderMarkdown(currentText)"></div>
          <span v-if="currentText" class="cursor"></span>
        </div>
      </div>

      <!-- 纯等待 -->
      <div v-if="loading && !currentText && !currentReasoning" class="message-item assistant">
        <div class="message-content">
          <div class="thinking-dots">
            <span></span><span></span><span></span>
          </div>
        </div>
      </div>
    </div>

    <!-- Toast 提示 -->
    <div v-if="toast" class="toast">{{ toast }}</div>

    <!-- 右键菜单 -->
    <Teleport to="body">
      <div v-if="contextMenu" ref="contextMenuRef" class="context-menu" :style="contextMenuStyle">
        <button class="context-menu-item" @click="handleContextCopy">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
          {{ copiedIndex === contextMenu.index ? '已复制' : '复制' }}
        </button>
        <button class="context-menu-item" @click="handleContextSaveFile">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          保存
        </button>
        <div class="context-menu-divider"></div>
        <button class="context-menu-item danger" @click="handleContextDelete">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18"/>
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
          </svg>
          删除
        </button>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { onClickOutside, useEventListener } from '@vueuse/core'
import type { Message } from '../types'
import { useMarkdown } from '../composables/useMarkdown'

const { renderMarkdown } = useMarkdown()

const props = defineProps<{
  messages: Message[]
  loading: boolean
  currentText: string
  currentReasoning: string
}>()

const emit = defineEmits<{
  copy: [index: number]
  delete: [index: number]
}>()

const messagesRef = ref<HTMLElement>()
const copiedIndex = ref<number | null>(null)
const toast = ref('')

// 右键菜单
const contextMenu = ref<{ index: number } | null>(null)
const contextMenuStyle = ref<Record<string, string>>({})
const contextMenuRef = ref<HTMLElement>()

onClickOutside(contextMenuRef, () => {
  contextMenu.value = null
})

function closeContextMenu() {
  contextMenu.value = null
}

useEventListener(window, 'resize', closeContextMenu)

function showContextMenu(index: number, event: MouseEvent) {
  contextMenu.value = { index }
  contextMenuStyle.value = {
    position: 'fixed',
    top: `${event.clientY}px`,
    left: `${event.clientX}px`
  }
}

function handleContextCopy() {
  if (contextMenu.value) {
    emit('copy', contextMenu.value.index)
  }
  contextMenu.value = null
}

function showToast(msg: string) {
  toast.value = msg
  setTimeout(() => { toast.value = '' }, 2000)
}

async function handleContextSaveFile() {
  if (!contextMenu.value) return
  const msg = props.messages[contextMenu.value.index]
  if (!msg) return
  const preview = msg.content.replace(/\n/g, ' ').trim().slice(0, 20).replace(/[\\/:*?"<>|]/g, '_')
  const role = msg.role === 'user' ? '用户消息' : 'AI回复'
  const filename = `${role}_${preview}.md`
  contextMenu.value = null
  try {
    const filePath = await window.electronApis?.ai?.saveFile(msg.content, filename)
    if (filePath) {
      showToast(`已保存到 ${filePath}`)
    } else {
      showToast('保存已取消')
    }
  } catch {
    showToast('保存失败')
  }
}

function handleContextDelete() {
  if (contextMenu.value) {
    emit('delete', contextMenu.value.index)
  }
  contextMenu.value = null
}

function isNearBottom(): boolean {
  const el = messagesRef.value
  if (!el) return true
  return el.scrollHeight - el.scrollTop - el.clientHeight < 100
}

async function scrollToBottom() {
  await nextTick()
  if (messagesRef.value && isNearBottom()) {
    messagesRef.value.scrollTop = messagesRef.value.scrollHeight
  }
}

async function forceScrollToBottom() {
  await nextTick()
  if (messagesRef.value) {
    messagesRef.value.scrollTop = messagesRef.value.scrollHeight
  }
}

function handleScroll() {}

watch(() => [props.messages.length, props.loading, props.currentText, props.currentReasoning], () => {
  scrollToBottom()
}, { flush: 'post' })

defineExpose({ copiedIndex, scrollToBottom, forceScrollToBottom })
</script>

<style scoped>
.chat-messages {
  flex: 1;
  overflow-y: auto;
  scroll-behavior: smooth;
}

.messages-inner {
  padding: 32px 120px 16px;
  display: flex;
  flex-direction: column;
}

.message-item {
  display: flex;
  padding: 3px 0;
}

.message-item.user {
  justify-content: flex-end;
}

.message-item.assistant {
  justify-content: flex-start;
}

.message-content {
  max-width: 78%;
  padding: 10px 16px;
  border-radius: 12px;
  font-size: 15px;
  line-height: 1.65;
}

.message-item.user .message-content {
  background: var(--color-surface);
  border-bottom-right-radius: 4px;
}

.message-item.assistant .message-content {
  background: var(--color-bg-primary);
  border-bottom-left-radius: 4px;
}

.message-text {
  color: var(--color-text-primary);
  white-space: pre-wrap;
  word-break: break-word;
}

.message-item.user .message-text {
  color: var(--color-text-primary);
}

.message-item.assistant .message-text {
  color: var(--color-text-primary);
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

/* 思考中动画 */
.thinking-dots {
  display: inline-flex;
  gap: 6px;
  padding: 4px 0;
  align-items: center;
}

.thinking-dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-accent);
  animation: thinkingPulse 1.2s ease-in-out infinite;
}

.thinking-dots span:nth-child(1) { animation-delay: 0ms; }
.thinking-dots span:nth-child(2) { animation-delay: 150ms; }
.thinking-dots span:nth-child(3) { animation-delay: 300ms; }

@keyframes thinkingPulse {
  0%, 100% {
    transform: scale(0.6);
    opacity: 0.3;
  }
  50% {
    transform: scale(1);
    opacity: 1;
  }
}

/* 思考过程流式输出 */
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

/* Toast */
.toast {
  position: fixed;
  bottom: 140px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 20px;
  background: rgba(0, 0, 0, 0.75);
  color: #fff;
  border-radius: 8px;
  font-size: 13px;
  z-index: 10001;
  animation: toastIn 0.2s ease;
  pointer-events: none;
  max-width: 80%;
  text-align: center;
}

@keyframes toastIn {
  from { opacity: 0; transform: translateX(-50%) translateY(8px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}

/* 右键菜单 */
.context-menu {
  min-width: 140px;
  background: var(--modal-bg);
  border: 1px solid var(--color-divider);
  border-radius: 10px;
  padding: 4px;
  box-shadow: var(--shadow-lg);
  z-index: 10000;
  animation: menuIn 0.15s ease;
}

@keyframes menuIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--color-text-primary);
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s;
  text-align: left;
}

.context-menu-item:hover {
  background: var(--color-surface-hover);
}

.context-menu-item.danger {
  color: #ef4444;
}

.context-menu-item.danger:hover {
  background: rgba(239, 68, 68, 0.08);
}

.context-menu-divider {
  height: 1px;
  background: var(--color-divider);
  margin: 4px 8px;
}
</style>
