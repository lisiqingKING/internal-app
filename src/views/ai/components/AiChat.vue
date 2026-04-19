<template>
  <div class="ai-chat">
    <!-- 左侧边栏 -->
    <ChatSidebar
      :sessions="sessions"
      :current-session-id="currentSessionId"
      @new-chat="handleNewChat"
      @switch-session="handleSwitchSession"
      @delete-session="handleDeleteSession"
    />

    <!-- 右侧主内容区 -->
    <div class="main-content">
      <!-- 无会话时显示默认页面 -->
      <div v-if="sessions.length === 0" class="empty-state">
        <div class="empty-icon">💬</div>
        <h2>开始新对话</h2>
        <p>点击左侧「新建对话」开始聊天</p>
        <button class="start-btn" @click="handleNewChat">新建对话</button>
      </div>

      <template v-else-if="currentSessionId">
        <!-- 顶部标题 -->
        <div class="chat-header">
          <h1>{{ currentSessionTitle }}</h1>
        </div>

        <!-- 聊天消息列表 -->
        <ChatMessages
          :messages="currentService?.state.chatHistory || []"
          :loading="currentService?.state.loading || false"
          :current-text="currentService?.state.currentText || ''"
        />

        <!-- 输入区域 -->
        <ChatInput
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
import { ref, computed, onMounted } from 'vue'
import { useChatHistory } from '../composables/useChatHistory'
import { createChatService, type ChatService } from '../composables/useChatService'
import ChatSidebar from './ChatSidebar.vue'
import ChatMessages from './ChatMessages.vue'
import ChatInput from './ChatInput.vue'

const inputText = ref('')

const {
  sessions,
  currentSessionId,
  init,
  createSession,
  getCurrentSession,
  switchSession,
  deleteSession,
  updateCurrentMessages
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

// 当前对话标题
const currentSessionTitle = computed(() => {
  const session = getCurrentSession()
  return session?.title || '新会话'
})

onMounted(async () => {
  await init()
  if (sessions.value.length > 0) {
    const firstSession = sessions.value[0]
    switchSession(firstSession.convId)
  }
})

async function handleNewChat() {
  console.log('[AiChat] handleNewChat called, sessions.value.length:', sessions.value.length)
  // 保存当前 session 状态
  saveCurrentSession()
  console.log('[AiChat] before createSession, sessions.value.length:', sessions.value.length)
  const session = await createSession()
  console.log('[AiChat] handleNewChat session created:', session, 'sessions.value.length:', sessions.value.length)
  getOrCreateService(session)
}

function handleSwitchSession(sessionId: string) {
  // 保存当前 session 状态
  saveCurrentSession()

  switchSession(sessionId)

  const session = getCurrentSession()
  if (session) {
    const service = getOrCreateService(session)
    // 同步消息到状态（因为其他 session 可能在切换期间修改了 messages）
    service?.syncFromSession()
  }
}

function handleDeleteSession(sessionId: string) {
  services.delete(sessionId)
  deleteSession(sessionId)
}

function saveCurrentSession() {
  const session = getCurrentSession()
  if (session) {
    const service = services.get(session.convId)
    // 只有当有消息时才保存
    if (service && service.state.chatHistory.length > 0) {
      service.syncState()
      updateCurrentMessages(service.state.chatHistory)
    }
  }
}

function cancelRequest() {
  currentService.value?.cancelRequest()
}

async function send() {
  const msg = inputText.value.trim()
  const service = currentService.value

  if (!msg || !service) return
  if (service.state.loading) return

  inputText.value = ''

  await service.sendMessage(msg)
  saveCurrentSession()
}
</script>

<style scoped>
.ai-chat {
  display: flex;
  height: 100vh;
  background: #111827;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  max-width: 1000px;
  margin: 0 auto;
  width: 100%;
}

.chat-header {
  padding: 16px 24px;
  border-bottom: 1px solid #2d2d44;
}

.chat-header h1 {
  font-size: 18px;
  font-weight: 600;
  color: #fff;
  margin: 0;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #fff;
  text-align: center;
  padding: 40px;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 24px;
}

.empty-state h2 {
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 12px;
}

.empty-state p {
  color: #888;
  margin: 0 0 24px;
}

.start-btn {
  padding: 12px 24px;
  background: #3b82f6;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  transition: background 0.2s;
}

.start-btn:hover {
  background: #2563eb;
}
</style>
