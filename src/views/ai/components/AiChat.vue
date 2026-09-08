<template>
  <div class="ai-chat">
    <!-- 侧边栏 -->
    <div class="sidebar-wrapper" :class="{ collapsed }">
      <ChatSidebar
        v-show="!collapsed"
        :sessions="sessions"
        :current-session-id="currentSessionId"
        :loading-more="loadingMore"
        :has-more="hasMore"
        @new-chat="handleNewChat"
        @switch-session="handleSwitchSession"
        @delete-session="handleDeleteSession"
        @load-more="loadMore"
        @pin-session="handlePinSession"
        @rename-session="handleRenameSession"
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
        <MessagesArea
          ref="messagesAreaRef"
          :messages="currentService?.state.chatHistory || []"
          :loading="currentService?.state.loading || false"
          :current-text="currentService?.state.currentText || ''"
          :current-reasoning="currentService?.state.currentReasoning || ''"
          @copy="copy"
          @delete="remove"
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
  currentSessionId,
  currentService,
  loadingMore,
  hasMore,
  initSessions,
  loadMore,
  createSession,
  switchSession,
  deleteSession,
  updateSessionTitle,
  togglePin,
  updateCurrentMessages,
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

/** 切换/新建会话前，保存当前会话的消息（含取消进行中的流式输出） */
async function saveCurrentBeforeSwitch() {
  const service = currentService.value
  if (!service) return
  if (service.state.loading) service.cancelRequest()
  if (service.state.chatHistory.length > 0) {
    service.syncState()
    await updateCurrentMessages(service.state.chatHistory)
  }
}

async function handleNewChat() {
  await saveCurrentBeforeSwitch()
  await createSession()
  await checkConfig()
  nextTick(() => messagesAreaRef.value?.forceScrollToBottom())
}

function handleSwitchSession(convId: string) {
  saveCurrentBeforeSwitch()
  switchSession(convId)
  checkConfig()
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
</style>
