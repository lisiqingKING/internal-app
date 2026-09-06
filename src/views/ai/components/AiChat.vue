<template>
  <div class="ai-chat">
    <!-- 左侧边栏 -->
    <ChatSidebar
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
import ChatSidebar from './ChatSidebar.vue'
import ChatMessages from './ChatMessages.vue'
import ChatInput from './ChatInput.vue'
import ChatErrorBar from './ChatErrorBar.vue'
import ChatNoConfigPrompt from './ChatNoConfigPrompt.vue'
import ChatEmptyState from './ChatEmptyState.vue'

const ai = window.bridge.getModules(['ai']).ai
const router = useRouter()

const inputText = ref('')
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
</style>
