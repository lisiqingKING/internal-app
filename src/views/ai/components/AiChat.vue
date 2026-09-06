<template>
  <div class="ai-chat">
    <!-- 左侧边栏 -->
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

    <!-- 右侧主内容区 -->
    <div class="main-content">
      <!-- 无会话时显示默认页面 -->
      <ChatEmptyState v-if="sessions.length === 0" @new-chat="handleNewChat" />

      <template v-else-if="currentSessionId">
        <!-- 聊天消息列表 -->
        <ChatMessages
          ref="chatMessagesRef"
          :messages="currentService?.state.chatHistory || []"
          :loading="currentService?.state.loading || false"
          :current-text="currentService?.state.currentText || ''"
          :current-reasoning="currentService?.state.currentReasoning || ''"
          @copy="handleCopy"
          @delete="handleDelete"
          @contextmenu="handleContextMenu"
        />

        <!-- 错误提示 -->
        <ChatErrorBar
          v-if="currentService?.state.error"
          :message="currentService.state.error"
          @retry="retry"
          @dismiss="currentService?.clearError()"
        />

        <!-- 无配置提示 -->
        <ChatNoConfigPrompt v-if="noConfig" @go-settings="goToSettings" />

        <!-- 输入区域 -->
        <ChatInput
          v-else
          v-model="inputText"
          :disabled="currentService?.state.loading || false"
          :loading="currentService?.state.loading || false"
          @send="send"
          @cancel="cancelRequest"
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { ElMessageBox } from 'element-plus'
import { useRouter } from 'vue-router'
import { useChatHistory } from '../composables/useChatHistory'
import { createChatService, type ChatService } from '../composables/useChatService'
import ChatSidebar from './sidebar/ChatSidebar.vue'
import ChatMessages from './messages/ChatMessages.vue'
import ChatInput from './input/ChatInput.vue'
import ChatErrorBar from './common/ChatErrorBar.vue'
import ChatNoConfigPrompt from './common/ChatNoConfigPrompt.vue'
import ChatEmptyState from './common/ChatEmptyState.vue'

const ai = window.bridge.getModules(['ai']).ai
const router = useRouter()

const inputText = ref('')
const collapsed = ref(false)
const noConfig = ref(false)

function onVisibilityChange() {
  if (document.visibilityState === 'visible') {
    checkConfig()
  }
}
const chatMessagesRef = ref<InstanceType<typeof ChatMessages>>()

const {
  sessions,
  currentSessionId,
  loadingMore,
  hasMore,
  init,
  loadMore,
  createSession,
  getCurrentSession,
  switchSession,
  deleteSession,
  updateCurrentMessages,
  togglePin,
  updateSessionTitle
} = useChatHistory()



// 每个 session 的 service 实例
const services = new Map<string, ChatService>()

function getOrCreateService(session: ReturnType<typeof getCurrentSession>) {
  if (!session) return null
  if (!services.has(session.convId)) {
    const service = createChatService(session)
    services.set(session.convId, service)
  }
  return services.get(session.convId)!
}

const currentService = computed(() => {
  return getOrCreateService(getCurrentSession())
})

onMounted(async () => {
  await init()
  await checkConfig()
  if (sessions.value.length > 0) {
    const firstSession = sessions.value[0]
    switchSession(firstSession.convId)
  }
  document.addEventListener('visibilitychange', onVisibilityChange)
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', onVisibilityChange)
  for (const service of services.values()) {
    service.dispose()
  }
  services.clear()
})

async function checkConfig() {
  const profile = await ai.getActiveProfile()
  noConfig.value = !profile || !profile.apiKey || !profile.apiUrl
}

function goToSettings() {
  router.push('/settings')
}

async function handleNewChat() {
  // 保存当前 session 状态（包括流式输出中的内容）
  saveCurrentSessionWithStream()
  const session = await createSession()
  switchSession(session.convId)
  getOrCreateService(session)
  await checkConfig()
}

function handleSwitchSession(sessionId: string) {
  // 保存当前 session 状态（包括流式输出中的内容）
  saveCurrentSessionWithStream()

  switchSession(sessionId)

  const session = getCurrentSession()
  if (session) {
    const service = getOrCreateService(session)
    // 同步消息到状态（因为其他 session 可能在切换期间修改了 messages）
    service?.syncFromSession()
  }

  // 检查配置是否已补全
  checkConfig()

  // 切换后强制滚动到底部
  nextTick(() => {
    chatMessagesRef.value?.forceScrollToBottom()
  })
}

async function handleDeleteSession(sessionId: string) {
  try {
    await ElMessageBox.confirm('确定要删除该会话吗？', '确认删除', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }
  const service = services.get(sessionId)
  service?.dispose()
  services.delete(sessionId)
  deleteSession(sessionId)
}

function handlePinSession(sessionId: string) {
  togglePin(sessionId)
}

function handleRenameSession(sessionId: string, title: string) {
  updateSessionTitle(sessionId, title)
}

function saveCurrentSession() {
  const session = getCurrentSession()
  if (session) {
    const service = services.get(session.convId)
    if (service && service.state.chatHistory.length > 0) {
      service.syncState()
      updateCurrentMessages(service.state.chatHistory)
    }
  }
}

// 保存当前 session，包括流式输出中的内容
// cancelRequest 会触发 useChatService 的 catch 块自动保存消息
function saveCurrentSessionWithStream() {
  const session = getCurrentSession()
  if (session) {
    const service = services.get(session.convId)
    if (service?.state.loading) {
      service.cancelRequest()
    }
    if (service && service.state.chatHistory.length > 0) {
      service.syncState()
      updateCurrentMessages(service.state.chatHistory)
    }
  }
}

function cancelRequest() {
  currentService.value?.cancelRequest()
}

let lastSentMessage = ''

function retry() {
  currentService.value?.clearError()
  if (lastSentMessage) {
    send(lastSentMessage)
  }
}

async function send(msg?: string) {
  const message = msg || inputText.value.trim()
  const service = currentService.value

  if (!message || !service) return
  if (service.state.loading) return

  lastSentMessage = message
  inputText.value = ''
  await service.sendMessage(message)
  saveCurrentSession()
  nextTick(() => chatMessagesRef.value?.forceScrollToBottom())
}

// 工具栏：复制
async function handleCopy(index: number) {
  const service = currentService.value
  if (!service) return
  const msg = service.state.chatHistory[index]
  if (!msg) return
  await navigator.clipboard.writeText(msg.content)
  if (chatMessagesRef.value) {
    chatMessagesRef.value.copiedIndex = index
    setTimeout(() => {
      if (chatMessagesRef.value) chatMessagesRef.value.copiedIndex = null
    }, 1500)
  }
}

// 工具栏：删除
async function handleDelete(index: number) {
  const service = currentService.value
  if (!service) return
  service.state.chatHistory.splice(index, 1)
  service.syncState()
  updateCurrentMessages(service.state.chatHistory)
}

// 右键菜单处理
function handleContextMenu(index: number, event: MouseEvent) {
  // ChatMessages 内部已经处理右键菜单，这里不需要额外处理
}
</script>

<style scoped>
.ai-chat {
  display: flex;
  height: 100vh;
  background: var(--color-bg-primary);
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-wrapper {
  flex-shrink: 0;
  height: 100%;
  transition: width 0.2s ease;
  overflow: hidden;
}

.sidebar-wrapper.collapsed {
  width: 0;
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
