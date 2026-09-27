<template>
  <div class="assistant-view">
    <!-- 标题栏 -->
    <div class="title-bar">
      <span class="title-text">{{ chatTitle || 'AI 辅助' }}</span>
      <button class="close-btn" @click="handleClose">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>

    <!-- 创建会话对话框 -->
    <div v-if="showCreate" class="create-overlay">
      <div class="create-dialog">
        <div class="dialog-header">创建 AI 辅助会话</div>
        <div class="dialog-body">
          <div class="field">
            <label>标题</label>
            <input
              v-model="inputTitle"
              class="dialog-input"
              placeholder="AI 辅助"
              @keydown.enter="handleCreate"
            />
          </div>
          <label class="checkbox-row">
            <input v-model="linkUrl" type="checkbox" />
            <span>关联当前页面 URL</span>
          </label>
          <div v-if="linkUrl" class="url-preview">{{ currentUrl }}</div>
        </div>
        <div class="dialog-footer">
          <button class="btn-cancel" @click="handleCancel">取消</button>
          <button class="btn-create" @click="handleCreate">创建</button>
        </div>
      </div>
    </div>

    <!-- 消息区域 -->
    <div v-else ref="scrollRef" class="messages-scroll">
      <div v-if="messages.length === 0" class="empty-hint">
        <span>开始新对话</span>
      </div>
      <div v-for="(msg, index) in messages" :key="msg.msgId || index" class="message-item" :class="msg.role">
        <div class="bubble">{{ msg.content }}</div>
      </div>
      <div v-if="loading && (currentText || currentReasoning)" class="message-item assistant">
        <div class="bubble loading">{{ currentText || '思考中...' }}</div>
      </div>
    </div>

    <!-- 输入区 -->
    <div v-if="!showCreate" class="input-area">
      <div class="input-row">
        <textarea
          v-model="inputText"
          class="chat-input"
          placeholder="输入消息..."
          :disabled="loading"
          rows="2"
          @keydown.enter.exact.prevent="handleSend"
        />
        <button class="send-btn" :disabled="!inputText.trim() || loading" @click="handleSend">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, onUnmounted } from 'vue'
import type { Message } from '../types'

const scrollRef = ref<HTMLElement>()
const messages = ref<Message[]>([])
const inputText = ref('')
const loading = ref(false)
const currentText = ref('')
const currentReasoning = ref('')

// 对话框状态
const showCreate = ref(true)
const inputTitle = ref('AI 辅助')
const linkUrl = ref(true)
const currentUrl = ref('')
const chatTitle = ref('')

// 会话 ID
let convId: string | null = null
let windowId: number | null = null
let unsubChunk: (() => void) | null = null
let unsubComplete: (() => void) | null = null
let unsubError: (() => void) | null = null

onMounted(async () => {
  const url = new URL(window.location.href)
  const wid = url.searchParams.get('windowId')
  if (wid) windowId = parseInt(wid, 10)
  currentUrl.value = url.href

  const ai = window.bridge.getModules(['ai']).ai
  unsubChunk = ai.onChunk(handleChunk)
  unsubComplete = ai.onComplete(handleComplete)
  unsubError = ai.onError(handleError)
})

onUnmounted(() => {
  unsubChunk?.()
  unsubComplete?.()
  unsubError?.()
})

function handleChunk(_messageId: string, content: string, _reasoning?: string) {
  currentText.value += content
  scrollToBottom()
}

function handleComplete(_messageId: string) {
  if (currentText.value) {
    messages.value.push({
      msgId: `assistant-${Date.now()}`,
      role: 'assistant',
      content: currentText.value,
    })
  }
  currentText.value = ''
  currentReasoning.value = ''
  loading.value = false
  nextTick(() => scrollToBottom())
}

function handleError(_messageId: string, reason: string) {
  loading.value = false
  currentText.value = ''
  console.error('Chat error:', reason)
}

function scrollToBottom() {
  nextTick(() => {
    const el = scrollRef.value
    if (el) el.scrollTop = el.scrollHeight
  })
}

async function handleCreate() {
  const title = inputTitle.value.trim() || 'AI 辅助'
  const urlToLink = linkUrl.value ? currentUrl.value : undefined

  try {
    const result = await window.bridge.getModules(['assistant']).assistant.createSession({
      title,
      url: urlToLink,
    })
    convId = result.convId
    chatTitle.value = title
    showCreate.value = false

    // 加载已有消息
    if (convId) {
      const msgs = await window.bridge.getModules(['ai']).ai.getMessages(convId)
      if (msgs && msgs.length > 0) {
        messages.value = msgs.map((m: any) => ({
          msgId: m.msgId || m.id || String(Math.random()),
          role: m.role,
          content: m.content,
        }))
      }
    }
  } catch (e) {
    console.error('创建会话失败:', e)
  }
}

function handleCancel() {
  window.close()
}

async function handleSend() {
  const text = inputText.value.trim()
  if (!text || loading.value || !convId) return

  messages.value.push({
    msgId: `user-${Date.now()}`,
    role: 'user',
    content: text,
  })
  inputText.value = ''
  loading.value = true
  currentText.value = ''
  scrollToBottom()

  const ai = window.bridge.getModules(['ai']).ai
  try {
    const profile = await ai.getActiveProfile()
    await ai.chat({
      conversationId: convId,
      messageId: `msg-${Date.now()}`,
      apiUrl: profile?.apiUrl || '',
      apiKey: profile?.apiKey || '',
      providerType: profile?.providerType || 'openai',
      model: profile?.model || '',
      messages: messages.value.map(m => ({ role: m.role, content: m.content })),
      stream: true,
      targetWindowId: windowId ?? undefined,
    })
  } catch (err) {
    loading.value = false
    console.error('Send error:', err)
  }
}

function handleClose() {
  const assistant = window.bridge.getModules(['assistant']).assistant
  if (windowId !== null) {
    assistant.close(windowId)
  } else {
    window.close()
  }
}
</script>

<style scoped>
.assistant-view {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--color-bg-primary);
  overflow: hidden;
}

.title-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 36px;
  padding: 0 8px 0 12px;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-divider);
  -webkit-app-region: drag;
  flex-shrink: 0;
}

.title-text {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.close-btn {
  -webkit-app-region: no-drag;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}

.close-btn:hover {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

/* 创建对话框 */
.create-overlay {
  position: absolute;
  inset: 0;
  background: var(--color-bg-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.create-dialog {
  width: 320px;
  background: var(--color-surface);
  border: 1px solid var(--color-divider);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.3);
  overflow: hidden;
}

.dialog-header {
  padding: 16px 20px;
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-primary);
  border-bottom: 1px solid var(--color-divider);
}

.dialog-body {
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.field label {
  display: block;
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-bottom: 6px;
}

.dialog-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  font-size: 14px;
  outline: none;
  box-sizing: border-box;
}

.dialog-input:focus {
  border-color: var(--color-accent);
}

.checkbox-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--color-text-secondary);
  cursor: pointer;
}

.url-preview {
  font-size: 11px;
  color: var(--color-text-tertiary);
  word-break: break-all;
  padding: 6px 8px;
  background: var(--color-bg-secondary);
  border-radius: 4px;
  max-height: 40px;
  overflow: hidden;
}

.dialog-footer {
  padding: 12px 20px;
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  border-top: 1px solid var(--color-divider);
}

.btn-cancel,
.btn-create {
  padding: 6px 16px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  border: none;
  transition: background 0.15s;
}

.btn-cancel {
  background: var(--color-surface-hover);
  color: var(--color-text-secondary);
}

.btn-cancel:hover {
  background: var(--color-divider);
}

.btn-create {
  background: var(--color-accent);
  color: #fff;
}

.btn-create:hover {
  background: var(--color-accent-hover);
}

/* 消息区域 */
.messages-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 16px;
  box-sizing: border-box;
}

.empty-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100px;
  color: var(--color-text-secondary);
  font-size: 14px;
}

.message-item {
  display: flex;
  padding: 6px 0;
}

.message-item.user {
  justify-content: flex-end;
}

.message-item.assistant {
  justify-content: flex-start;
}

.bubble {
  max-width: 80%;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.message-item.user .bubble {
  background: var(--color-surface);
  border-bottom-right-radius: 4px;
  color: var(--color-text-primary);
}

.message-item.assistant .bubble {
  background: var(--color-bg-secondary);
  border-bottom-left-radius: 4px;
  color: var(--color-text-primary);
}

.bubble.loading {
  color: var(--color-text-secondary);
  font-style: italic;
}

/* 输入区 */
.input-area {
  flex-shrink: 0;
  border-top: 1px solid var(--color-divider);
  padding: 12px 16px;
  background: var(--color-surface);
}

.input-row {
  display: flex;
  gap: 8px;
  align-items: flex-end;
}

.chat-input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  font-size: 14px;
  outline: none;
  resize: none;
  line-height: 1.5;
  max-height: 120px;
  overflow-y: auto;
  box-sizing: border-box;
}

.chat-input:focus {
  border-color: var(--color-accent);
}

.chat-input::placeholder {
  color: var(--color-text-tertiary);
}

.chat-input:disabled {
  opacity: 0.5;
}

.send-btn {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 8px;
  background: var(--color-accent);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.15s, opacity 0.15s;
}

.send-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.send-btn:not(:disabled):hover {
  background: var(--color-accent-hover);
}
</style>
