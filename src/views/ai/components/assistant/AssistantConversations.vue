<template>
  <div class="assistant-conversations">
    <AssistantTabs
      :sessions="sessions"
      :active-conv-id="activeConvId"
      @switch="onSwitch"
      @create="onCreate"
      @remove="onRemove"
      @rename="onRename"
      @reorder="onReorder"
    />

    <div ref="scrollRef" class="message-list" @scroll="onScroll">
      <div v-if="messages.length === 0 && !loading && !error" class="empty-hint">🤖 向第二个 AI 提问</div>
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
  </div>
</template>

<script setup lang="ts">
import { inject, nextTick, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import AssistantTabs from './AssistantTabs.vue'
import AssistantMessage from './AssistantMessage.vue'
import ChatInput from '../input/ChatInput.vue'
import StreamingMessage from '../messages/StreamingMessage.vue'
import TypingIndicator from '../messages/TypingIndicator.vue'
import { ASSISTANT_WORKSPACE } from '../../composables/assistant/useAssistantWorkspace'

const workspace = inject(ASSISTANT_WORKSPACE)
if (!workspace) throw new Error('AssistantConversations 必须在提供 ASSISTANT_WORKSPACE 的父组件内使用')

const { conversations, notes, scopeId, highlight } = workspace
const { sessions, activeConvId, activeSession, messages, loading, currentText, currentReasoning, error } =
  conversations

const inputText = ref('')

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
  try {
    await conversations.activate(convId)
  } catch (err) {
    reportError(err, '切换会话失败')
  }
}

async function onCreate() {
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

async function onRename(convId: string, title: string) {
  try {
    await conversations.rename(convId, title)
  } catch (err) {
    reportError(err, '重命名失败')
  }
}

async function onReorder(orderedConvIds: string[]) {
  try {
    await conversations.reorder(orderedConvIds)
  } catch (err) {
    reportError(err, '排序失败')
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

.message-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 10px 12px;
}

.empty-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 120px;
  color: var(--color-text-secondary);
  font-size: 13px;
}

.empty-hint.error {
  color: var(--color-status-error);
}
</style>
