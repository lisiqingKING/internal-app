<template>
  <div class="chat-messages" ref="messagesRef">
    <div
      v-for="(msg, index) in messages"
      :key="index"
      class="message-row"
      :class="msg.role"
    >
      <div class="message-wrapper" @contextmenu.prevent="showContextMenu(index, $event)">
        <div class="message-bubble">
          <template v-if="msg.role === 'user'">
            <div class="message-content">{{ msg.content }}</div>
          </template>
          <template v-else>
            <!-- 已完成消息的思考块 -->
            <div v-if="msg.reasoning" class="thinking-block">
              <button class="thinking-toggle" @click="toggleThinking(index)">
                <svg :class="['chevron', { open: expandedSet.has(index) }]" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" class="brain-icon">
                  <path d="M12 2a7 7 0 0 0-7 7c0 2.5 1.5 4.5 3 6 .5.5 1 1.2 1 2v1a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-1c0-.8.5-1.5 1-2 1.5-1.5 3-3.5 3-6a7 7 0 0 0-7-7z"/>
                  <path d="M9 22h6"/>
                </svg>
                <span>思考过程</span>
              </button>
              <div v-show="expandedSet.has(index)" class="thinking-content">
                {{ msg.reasoning }}
              </div>
            </div>
            <div class="message-content markdown-body" v-html="renderMarkdown(msg.content)"></div>
          </template>
        </div>
      </div>
    </div>

    <!-- 正在输入的助手消息 -->
    <div v-if="loading && currentText" class="message-row assistant">
      <div class="message-bubble">
        <div class="message-content markdown-body" v-html="renderMarkdown(currentText)"></div>
        <span class="cursor"></span>
      </div>
    </div>

    <!-- 纯等待（无任何输出） -->
    <div v-if="loading && !currentText && !currentReasoning" class="message-row assistant">
      <div class="message-bubble thinking-bubble">
        <div class="thinking-dot"></div>
        <div class="thinking-dot"></div>
        <div class="thinking-dot"></div>
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
          保存为文件
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
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { onClickOutside } from '@vueuse/core'
import { marked } from 'marked'
import hljs from 'highlight.js'
import type { Message } from '../types'

// 配置 marked 使用 highlight.js
marked.setOptions({
  gfm: true,
  breaks: true
})

const renderer = new marked.Renderer()
renderer.code = ({ text, lang }: { text: string; lang?: string }) => {
  const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext'
  const highlighted = hljs.highlight(text, { language }).value
  return `<pre><code class="hljs language-${language}">${highlighted}</code></pre>`
}
marked.use({ renderer })

function renderMarkdown(content: string): string {
  return marked.parse(content) as string
}

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
const expandedSet = ref(new Set<number>())
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

onMounted(() => {
  window.addEventListener('resize', closeContextMenu)
})

onUnmounted(() => {
  window.removeEventListener('resize', closeContextMenu)
})

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
  setTimeout(() => { toast.value = '' }, 3000)
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

function toggleThinking(index: number) {
  if (expandedSet.value.has(index)) {
    expandedSet.value.delete(index)
  } else {
    expandedSet.value.add(index)
  }
}

// 滚动到底部
async function scrollToBottom() {
  await nextTick()
  if (messagesRef.value) {
    messagesRef.value.scrollTop = messagesRef.value.scrollHeight
  }
}

// 监听消息变化和加载状态变化时滚动
watch(() => [props.messages.length, props.loading, props.currentText, props.currentReasoning], () => {
  scrollToBottom()
}, { flush: 'post' })

// 暴露 copiedIndex 供父组件设置
defineExpose({ copiedIndex })
</script>

<style scoped>
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
}

.message-row {
  display: flex;
  margin-bottom: 16px;
}

.message-row.user {
  justify-content: flex-end;
}

.message-wrapper {
  max-width: 70%;
  position: relative;
}

.message-row.user .message-wrapper {
  margin-left: auto;
}

.message-bubble {
  padding: 12px 16px;
  border-radius: 12px;
  background: var(--color-surface);
}

.message-row.user .message-bubble {
  background: var(--color-accent);
}

.message-content {
  color: var(--color-text-primary);
  font-size: 15px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.message-row.user .message-content {
  color: var(--color-text-inverse);
}

/* 光标闪烁 */
.cursor {
  display: inline-block;
  width: 2px;
  height: 14px;
  background: var(--color-text-inverse);
  margin-left: 2px;
  vertical-align: middle;
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

/* 思考中动画 */
.thinking-bubble {
  display: flex;
  gap: 6px;
  padding: 14px 18px;
}

.thinking-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-accent);
  animation: bounce 1.4s infinite ease-in-out both;
}

.thinking-dot:nth-child(1) { animation-delay: -0.32s; }
.thinking-dot:nth-child(2) { animation-delay: -0.16s; }
.thinking-dot:nth-child(3) { animation-delay: 0s; }

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}

/* Markdown 样式 */
.markdown-body {
  line-height: 1.7;
}

.markdown-body :deep(p) {
  margin: 0 0 12px;
}

.markdown-body :deep(p:last-child) {
  margin-bottom: 0;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  margin: 8px 0;
  padding-left: 24px;
}

.markdown-body :deep(li) {
  margin: 4px 0;
}

.markdown-body :deep(code) {
  background: var(--color-code-bg);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.9em;
}

.markdown-body :deep(pre) {
  background: var(--color-code-bg);
  border-radius: 8px;
  padding: 16px;
  overflow-x: auto;
  margin: 12px 0;
}

.markdown-body :deep(pre code) {
  background: transparent;
  padding: 0;
  color: var(--color-code-text);
  font-size: 0.85em;
}

/* 思考块 */
.thinking-block {
  margin-bottom: 10px;
}

.thinking-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s;
}

.thinking-toggle:hover {
  background: rgba(0, 0, 0, 0.05);
}

.chevron {
  transition: transform 0.2s ease;
}

.chevron.open {
  transform: rotate(90deg);
}

.brain-icon {
  opacity: 0.6;
}

.thinking-content {
  padding: 10px 14px;
  margin-top: 4px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--color-text-secondary);
  background: rgba(0, 0, 0, 0.03);
  border-left: 2px solid var(--color-divider);
  border-radius: 0 6px 6px 0;
  white-space: pre-wrap;
  word-break: break-word;
}

/* 流式思考中 */

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

/* 右键菜单 */
.context-menu {
  min-width: 140px;
  background: var(--input-bg);
  border: 1px solid var(--color-divider);
  border-radius: 8px;
  padding: 4px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  z-index: 10000;
  animation: contextMenuFadeIn 0.12s ease;
}

@keyframes contextMenuFadeIn {
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
  transition: background 0.12s;
  text-align: left;
}

.context-menu-item:hover {
  background: var(--color-surface);
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

/* Toast 提示 */
.toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 20px;
  background: rgba(0, 0, 0, 0.75);
  color: #fff;
  border-radius: 8px;
  font-size: 13px;
  z-index: 10001;
  animation: toastFadeIn 0.2s ease;
  pointer-events: none;
  max-width: 80%;
  text-align: center;
}

@keyframes toastFadeIn {
  from { opacity: 0; transform: translateX(-50%) translateY(8px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}
</style>