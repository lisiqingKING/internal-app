<template>
  <div class="assistant-conversations">
    <!-- 会话入口：列表收进下拉浮层，不常驻占空间 -->
    <div class="conv-entry">
      <div ref="entryRef" class="conv-entry-group">
        <button class="conv-entry-btn" title="切换辅助会话" @click="onToggleDropdown">
          <MessageCircle :size="13" class="conv-entry-icon" />
          <span class="conv-entry-title">{{ activeSession?.title || '辅助会话' }}</span>
        </button>
        <!-- 重命名入口：贴在标题右边，是「当前会话可以改名」的常驻提示 -->
        <button
          class="conv-rename-btn"
          title="重命名会话"
          :disabled="!activeSession"
          @click="onRename"
        >
          <Pencil :size="12" />
        </button>
        <button class="conv-entry-meta" title="切换辅助会话" @click="onToggleDropdown">
          <span class="conv-entry-count" :title="`共 ${sessions.length} 个辅助会话`">{{ sessions.length }}</span>
          <ChevronDown :size="13" class="conv-chevron" :class="{ open: dropdownOpen }" />
        </button>
      </div>
      <button class="conv-add-btn" title="新建辅助会话" @click="onCreate">
        <Plus :size="14" />
      </button>
    </div>

    <Teleport to="body">
      <div
        v-if="dropdownOpen"
        class="conv-dropdown"
        :style="dropdownStyle"
        @pointerdown.capture.stop
        @click.stop
      >
        <div v-if="sessions.length === 0" class="dropdown-empty">还没有辅助会话</div>
        <div
          v-for="session in sessions"
          :key="session.convId"
          class="conv-item"
          :class="{ active: session.convId === activeConvId }"
          @click="onSwitch(session.convId)"
        >
          <span class="conv-item-title">{{ session.title }}</span>
          <button class="conv-item-del" title="删除辅助会话" @click.stop="onRemove(session.convId)">
            <X :size="12" />
          </button>
        </div>
      </div>
    </Teleport>

    <div ref="scrollRef" class="message-list" @scroll="onScroll">
      <div v-if="messages.length === 0 && !loading && !error" class="empty-hint">
        <Bot :size="20" />
        <span>向第二个 AI 提问</span>
      </div>
      <div v-else-if="messages.length === 0 && !loading && error" class="empty-hint error">{{ error }}</div>

      <AssistantMessage
        v-for="message in messages"
        :key="message.msgId"
        :message="message"
        :highlighted="isHighlighted(message.msgId)"
        @excerpt="onExcerpt"
      />

      <StreamingMessage
        v-if="loading && (currentText || currentReasoning)"
        :text="currentText"
        :reasoning="currentReasoning"
      />
      <TypingIndicator v-if="loading && !currentText && !currentReasoning" />
    </div>

    <ChatInput
      v-model="inputText"
      :disabled="!activeSession"
      :loading="loading"
      @send="onSend"
      @cancel="onCancel"
    />

    <ChatHeaderRename
      v-if="renaming"
      v-model="renameValue"
      :error="renameError"
      heading="重命名辅助会话"
      @confirm="onRenameConfirm"
      @cancel="renaming = false"
    />
  </div>
</template>

<script setup lang="ts">
import { inject, nextTick, ref, watch } from 'vue'
import { onClickOutside } from '@vueuse/core'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Bot, ChevronDown, MessageCircle, Pencil, Plus, X } from 'lucide-vue-next'
import AssistantMessage from './AssistantMessage.vue'
import ChatInput from '../input/ChatInput.vue'
import ChatHeaderRename from '../common/ChatHeaderRename.vue'
import StreamingMessage from '../messages/StreamingMessage.vue'
import TypingIndicator from '../messages/TypingIndicator.vue'
import { ASSISTANT_WORKSPACE } from '../../composables/assistant/useAssistantWorkspace'
import { useFloatingDropdown } from '../../composables/assistant/useFloatingDropdown'

const workspace = inject(ASSISTANT_WORKSPACE)
if (!workspace) throw new Error('AssistantConversations 必须在提供 ASSISTANT_WORKSPACE 的父组件内使用')

const { conversations, notes, scopeId, highlight } = workspace
const { sessions, activeConvId, activeSession, messages, loading, currentText, currentReasoning, error } =
  conversations

const inputText = ref('')

// ===== 会话下拉浮层 =====

const {
  open: dropdownOpen,
  style: dropdownStyle,
  toggle: toggleDropdown,
  close: closeDropdown,
} = useFloatingDropdown()

const entryRef = ref<HTMLElement | null>(null)

// 浮层挂在 body 上，点击浮层内部不算「外部点击」，
// 这里只监听触发区域：点在浮层外、触发区外时才收起
onClickOutside(entryRef, () => closeDropdown())

function onToggleDropdown() {
  if (!entryRef.value) return
  toggleDropdown(entryRef.value)
}

// ===== 重命名当前会话 =====

const renaming = ref(false)
const renameValue = ref('')
const renameError = ref('')

function onRename() {
  const session = activeSession.value
  if (!session) return
  closeDropdown()
  renameValue.value = session.title
  renameError.value = ''
  renaming.value = true
}

async function onRenameConfirm(title: string) {
  const session = activeSession.value
  renaming.value = false
  if (!session) return
  try {
    await conversations.rename(session.convId, title)
  } catch (err) {
    reportError(err, '重命名失败')
  }
}

// ===== 滚动（仅当用户位于底部时才自动跟随） =====

const scrollRef = ref<HTMLElement | null>(null)
const isNearBottom = ref(true)

function onScroll() {
  const el = scrollRef.value
  if (!el) return
  isNearBottom.value = el.scrollHeight - el.scrollTop - el.clientHeight < 100
}

async function scrollToBottom() {
  await nextTick()
  const el = scrollRef.value
  if (!el || !isNearBottom.value) return
  el.scrollTop = el.scrollHeight
}

watch(
  () => [messages.value.length, currentText.value, loading.value],
  () => {
    void scrollToBottom()
  },
  { flush: 'post' }
)

// ===== 搜索跳转高亮（FR-5.4） =====

function isHighlighted(msgId: string): boolean {
  const target = highlight.value
  return !!target && target.type === 'message' && target.id === msgId
}

watch(
  () => highlight.value?.id,
  async (id) => {
    if (!id) return
    await nextTick()
    const el = scrollRef.value?.querySelector(`[data-msg-id="${id}"]`)
    el?.scrollIntoView({ block: 'center' })
  },
  { flush: 'post' }
)

// ===== 会话操作 =====

/** IPC 失败统一提示，避免 unhandled rejection 让用户毫无感知 */
function reportError(err: unknown, fallback: string) {
  console.error('[assistant]', err)
  ElMessage.error(err instanceof Error ? err.message : fallback)
}

async function onSwitch(convId: string) {
  closeDropdown()
  try {
    await conversations.activate(convId)
  } catch (err) {
    reportError(err, '切换会话失败')
  }
}

async function onCreate() {
  closeDropdown()
  try {
    await conversations.create()
  } catch (err) {
    reportError(err, '新建会话失败')
  }
}

async function onRemove(convId: string) {
  const session = sessions.value.find(s => s.convId === convId)
  const title = session?.title || '该辅助会话'
  try {
    await ElMessageBox.confirm(
      `确定要删除辅助会话「${title}」吗？该工作区的笔记会保留。`,
      '确认删除',
      { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' }
    )
  } catch {
    return
  }
  try {
    await conversations.remove(convId)
  } catch (err) {
    reportError(err, '删除会话失败')
  }
}

// ===== 对话 =====

async function onSend() {
  const content = inputText.value.trim()
  if (!content) return
  inputText.value = ''
  await conversations.send(content)
}

function onCancel() {
  conversations.cancel()
}

// ===== 摘录为笔记（FLOW-3） =====

async function onExcerpt(payload: { msgId: string; content: string; fullContent: string }) {
  const session = activeSession.value
  const id = scopeId.value
  if (!session || !id) return
  try {
    await notes.excerpt({
      scopeId: id,
      convId: session.convId,
      convTitle: session.title,
      msgId: payload.msgId,
      content: payload.content,
      fullContent: payload.fullContent,
    })
  } catch (err) {
    console.error('[assistant]', err)
    ElMessage.error(err instanceof Error ? err.message : '摘录为笔记失败')
  }
}
</script>

<style scoped>
.assistant-conversations {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

/* ===== 会话入口 ===== */

.conv-entry {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 32px;
  padding: 0 8px;
  border-bottom: 1px solid var(--color-divider);
  flex-shrink: 0;
}

/* 触发区：标题、重命名、计数+箭头都在里面，浮层按它定位 */
.conv-entry-group {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 4px;
}

.conv-entry-btn {
  flex: 0 1 auto;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  border: none;
  border-radius: 6px;
  background: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: background 0.15s;
}

.conv-entry-btn:hover {
  background: var(--color-surface);
  color: var(--color-text-primary);
}

.conv-entry-btn:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 1px;
}

.conv-entry-icon {
  flex-shrink: 0;
  color: var(--color-text-tertiary);
}

.conv-entry-title {
  flex: 0 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  font-weight: 600;
  text-align: left;
}

/* 重命名入口：常驻可见，弱化到 tertiary，hover 才强调 */
.conv-rename-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  border: none;
  border-radius: 4px;
  background: none;
  color: var(--color-text-tertiary);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.conv-rename-btn:hover:not(:disabled) {
  background: var(--color-surface);
  color: var(--color-text-primary);
}

.conv-rename-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* 计数 + 箭头锚在右侧，标题与重命名按钮靠左 */
.conv-entry-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
  padding: 4px 6px;
  border: none;
  border-radius: 6px;
  background: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: background 0.15s;
}

.conv-entry-meta:hover {
  background: var(--color-surface);
  color: var(--color-text-primary);
}

.conv-entry-meta:focus-visible,
.conv-rename-btn:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 1px;
}

/* 数量用 chip：裸数字会漂在标题和箭头之间，读不出是"共几条" */
.conv-entry-count {
  flex-shrink: 0;
  min-width: 16px;
  padding: 0 5px;
  border-radius: 8px;
  background: var(--color-surface);
  color: var(--color-text-tertiary);
  font-size: 10px;
  font-weight: 500;
  line-height: 16px;
  text-align: center;
}

.conv-chevron {
  flex-shrink: 0;
  color: var(--color-text-tertiary);
  transition: transform 0.2s;
}

.conv-chevron.open {
  transform: rotate(180deg);
}

.conv-add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  border: none;
  border-radius: 6px;
  background: none;
  color: var(--color-text-secondary);
  cursor: pointer;
}

.conv-add-btn:hover {
  background: var(--color-surface);
  color: var(--color-text-primary);
}

.conv-add-btn:focus-visible,
.conv-item-del:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 1px;
}

/* ===== 下拉浮层（挂在 body 上） ===== */

.conv-dropdown {
  z-index: 10000;
  max-height: 320px;
  overflow-y: auto;
  padding: 4px;
  /* 不透明：浮层会盖在消息列表上，半透明会和底下文字叠在一起 */
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-divider);
  border-radius: 8px;
  box-shadow: var(--shadow-lg);
}

.dropdown-empty {
  padding: 10px;
  text-align: center;
  font-size: 12px;
  color: var(--color-text-tertiary);
}

.conv-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.conv-item:hover {
  background: var(--color-surface);
  color: var(--color-text-primary);
}

.conv-item.active {
  background: var(--color-accent-muted);
  color: var(--color-accent);
}

.conv-item-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conv-item-del {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: none;
  border-radius: 4px;
  background: none;
  color: var(--color-text-tertiary);
  cursor: pointer;
  opacity: 0;
  flex-shrink: 0;
}

.conv-item:hover .conv-item-del,
.conv-item.active .conv-item-del {
  opacity: 1;
}

.conv-item-del:hover {
  background: var(--color-surface-hover);
  color: var(--color-text-primary);
}

.message-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 10px 12px;
}

.empty-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 120px;
  color: var(--color-text-secondary);
  font-size: 13px;
}

.empty-hint.error {
  color: var(--color-status-error);
}
</style>
