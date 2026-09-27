<template>
  <div class="ai-chat">
    <!-- 侧边栏 -->
    <div class="sidebar-wrapper" :class="{ collapsed }">
      <ChatSidebar
        v-show="!collapsed"
        :sessions="sessions"
        :categories="categories"
        :current-session-id="currentSessionId"
        :loading-more="loadingMore"
        :has-more="hasMore"
        @new-chat="handleNewChat"
        @new-chat-in-category="handleNewChatInCategory"
        @switch-session="handleSwitchSession"
        @delete-session="handleDeleteSession"
        @load-more="loadMore"
        @pin-session="handlePinSession"
        @rename-session="handleRenameSession"
        @create-category="handleCreateCategory"
        @rename-category="handleRenameCategory"
        @delete-category="handleDeleteCategory"
        @move-session="handleMoveSession"
      />
    </div>

    <button class="collapse-btn" @click="collapsed = !collapsed" :title="collapsed ? '展开' : '收起'">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
        <polyline v-if="collapsed" points="9 18 15 12 9 6"/>
        <polyline v-else points="15 18 9 12 15 6"/>
      </svg>
    </button>

    <!-- 右侧主区域 -->
    <div class="main-content">
      <ChatEmptyState v-if="sessions.length === 0" @new-chat="handleNewChat" />

      <template v-else-if="currentSessionId">
        <!-- 顶部工具栏 -->
        <div class="toolbar">
          <button class="toolbar-btn" @click="openAssistantSession">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            关联会话
          </button>
        </div>

        <MessagesArea
          ref="messagesAreaRef"
          :messages="currentService?.state.chatHistory || []"
          :loading="currentService?.state.loading || false"
          :current-text="currentService?.state.currentText || ''"
          :current-reasoning="currentService?.state.currentReasoning || ''"
          @copy="copy"
          @delete="remove"
          @assistant="handleAssistant"
        />

        <InputArea
          v-model:input-text="inputText"
          :loading="currentService?.state.loading || false"
          :disabled="currentService?.state.loading || false"
          :error="currentService?.state.error || null"
          :no-config="noConfig"
          @send="send"
          @cancel="cancel"
          @retry="retry"
          @dismiss-error="currentService?.clearError()"
          @go-settings="goToSettings"
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted } from 'vue'
import { ElMessageBox } from 'element-plus'
import { useChatSessions } from '../composables/chat/useChatSessions'
import { useChatActions } from '../composables/chat/useChatActions'
import { useConfigCheck } from '../composables/useConfigCheck'
import ChatSidebar from './sidebar/ChatSidebar.vue'
import MessagesArea from './MessagesArea.vue'
import InputArea from './InputArea.vue'
import ChatEmptyState from './common/ChatEmptyState.vue'

const collapsed = ref(false)
const messagesAreaRef = ref<InstanceType<typeof MessagesArea>>()

const {
  sessions,
  categories,
  currentSessionId,
  currentService,
  loadingMore,
  hasMore,
  initSessions,
  loadMore,
  createSession,
  createSessionInCategory,
  switchSession,
  deleteSession,
  updateSessionTitle,
  togglePin,
  updateCurrentMessages,
  addCategory,
  renameCategory,
  removeCategory,
  removeCategoryWithSessions,
  moveSessionToCategory,
} = useChatSessions()

const { noConfig, checkConfig, goToSettings } = useConfigCheck()

const { inputText, send, cancel, retry, copy, remove } = useChatActions({
  currentService,
  updateCurrentMessages,
  onSent: () => nextTick(() => messagesAreaRef.value?.forceScrollToBottom()),
})

onMounted(async () => {
  await initSessions()
  await checkConfig()
  nextTick(() => messagesAreaRef.value?.forceScrollToBottom())
})

/** 切换会话前保存（请求在后台继续运行，onComplete/onError 会自动同步状态） */
async function saveCurrentBeforeSwitch() {
  // sendMessage 和 onComplete 都会调用 syncState，session.messages 始终保持最新
  // 无需在此主动同步或取消请求
}

async function handleNewChat() {
  await saveCurrentBeforeSwitch()
  await createSession()
  await checkConfig()
  nextTick(() => messagesAreaRef.value?.forceScrollToBottom())
}

async function handleSwitchSession(convId: string) {
  await saveCurrentBeforeSwitch()
  // 清除目标会话的未读标记
  const target = sessions.value.find(s => s.convId === convId)
  if (target) target.hasNewMessages = false
  await switchSession(convId)
  await checkConfig()
  nextTick(() => messagesAreaRef.value?.forceScrollToBottom())
}

async function handleDeleteSession(convId: string) {
  try {
    await ElMessageBox.confirm('确定要删除该会话吗？', '确认删除', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }
  await deleteSession(convId)
}

function handlePinSession(convId: string) {
  togglePin(convId)
}

function handleRenameSession(convId: string, title: string) {
  updateSessionTitle(convId, title)
}

function handleCreateCategory(name: string) {
  addCategory(name)
}

async function handleNewChatInCategory(categoryId: string) {
  await saveCurrentBeforeSwitch()
  const session = await createSessionInCategory(categoryId)
  await switchSession(session.convId)
  await checkConfig()
  nextTick(() => messagesAreaRef.value?.forceScrollToBottom())
}

function handleRenameCategory(id: string, name: string) {
  renameCategory(id, name)
}

function handleDeleteCategory(id: string, withSessions: boolean) {
  if (withSessions) {
    removeCategoryWithSessions(id)
  } else {
    removeCategory(id)
  }
}

function handleMoveSession(convId: string, categoryId: string | null) {
  moveSessionToCategory(convId, categoryId)
}

async function openAssistantWindow(x: number, y: number) {
  if (!currentSessionId.value) return
  try {
    const assistant = window.bridge.getModules(['assistant']).assistant
    const link = await assistant.getLinksForSource('conversation', currentSessionId.value)
    if (link?.assistantConvId) {
      assistant.create({ x, y, convId: link.assistantConvId })
    } else {
      const { convId } = await assistant.createSession({
        title: 'AI 辅助',
        sourceType: 'conversation',
        sourceId: currentSessionId.value,
      })
      assistant.create({ x, y, convId })
    }
  } catch (e) {
    console.error('打开辅助会话失败:', e)
  }
}

async function handleAssistant(screenX: number, screenY: number) {
  await openAssistantWindow(screenX, screenY)
}

async function openAssistantSession() {
  await openAssistantWindow(100, 100)
}
</script>

<style scoped>
.ai-chat {
  display: flex;
  height: 100vh;
  background: var(--color-bg-primary);
  overflow: hidden;
}

.sidebar-wrapper {
  width: 200px;
  flex-shrink: 0;
  height: 100%;
  overflow: hidden;
  transition: width 0.2s ease;
}

.sidebar-wrapper.collapsed {
  width: 0;
}

.main-content {
  flex: 1;
  min-width: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.collapse-btn {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 48px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-divider);
  border-left: none;
  border-radius: 0 8px 8px 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
  z-index: 10;
  transition: background 0.15s, left 0.2s ease;
}

.collapse-btn:hover {
  background: var(--color-surface);
  color: var(--color-text-primary);
}

.sidebar-wrapper:not(.collapsed) ~ .collapse-btn {
  left: 200px;
}

.toolbar {
  display: flex;
  padding: 8px 16px;
  border-bottom: 1px solid var(--color-divider);
  gap: 8px;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--color-surface);
  border: 1px solid var(--color-divider);
  border-radius: 6px;
  color: var(--color-text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.toolbar-btn:hover {
  background: var(--color-surface-hover);
  color: var(--color-text-primary);
}
</style>
