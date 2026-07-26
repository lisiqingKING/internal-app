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
          <div v-if="currentService?.state.loading && currentService?.state.currentReasoning" class="thinking-badge">
            <span class="thinking-pulse"></span>
            <span>思考中</span>
          </div>
          <div class="header-menu-wrapper" @click.stop>
            <button class="header-more-btn" @click="toggleHeaderMenu($event)">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <circle cx="12" cy="5" r="2"/>
                <circle cx="12" cy="12" r="2"/>
                <circle cx="12" cy="19" r="2"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- 标题栏下拉菜单 -->
        <Teleport to="body">
          <div v-if="headerMenuOpen" ref="headerDropdownRef" class="header-dropdown-menu" :style="headerMenuStyle">
            <button class="menu-item" @click="handleHeaderPin">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
              </svg>
              {{ currentSession?.pinned ? '取消置顶' : '置顶' }}
            </button>
            <button class="menu-item" @click="handleHeaderRename">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              重命名
            </button>
            <div class="menu-divider"></div>
            <button class="menu-item danger" @click="handleHeaderDelete">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 6h18"/>
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              </svg>
              删除
            </button>
          </div>
        </Teleport>

        <!-- 重命名弹窗 -->
        <Teleport to="body">
          <div v-if="headerRenaming" class="modal-overlay" @click.self="headerRenaming = false">
            <div class="modal-dialog">
              <div class="modal-header">重命名对话</div>
              <input
                ref="headerRenameInputRef"
                v-model="headerRenameValue"
                class="modal-input"
                :class="{ error: headerRenameError }"
                placeholder="输入新名称"
                :maxlength="MAX_TITLE_LENGTH"
                @input="validateHeaderRename"
                @keydown.enter="finishHeaderRename"
              />
              <div v-if="headerRenameError" class="modal-error">{{ headerRenameError }}</div>
              <div class="modal-footer">
                <button class="modal-btn cancel" @click="headerRenaming = false">取消</button>
                <button class="modal-btn confirm" :disabled="!canHeaderRename" @click="finishHeaderRename">确定</button>
              </div>
            </div>
          </div>
        </Teleport>

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
        <div v-if="currentService?.state.error" class="error-bar">
          <span class="error-icon">!</span>
          <span class="error-text">{{ currentService.state.error }}</span>
          <button class="retry-btn" @click="retry">重试</button>
          <button class="dismiss-btn" @click="currentService?.clearError()">×</button>
        </div>

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
import { ref, computed, nextTick, onMounted } from 'vue'
import { onClickOutside } from '@vueuse/core'
import { useChatHistory } from '../composables/useChatHistory'
import { createChatService, type ChatService } from '../composables/useChatService'
import { ILLEGAL_CHARS, MAX_TITLE_LENGTH } from '../types'
import ChatSidebar from './ChatSidebar.vue'
import ChatMessages from './ChatMessages.vue'
import ChatInput from './ChatInput.vue'

const inputText = ref('')
const chatMessagesRef = ref<InstanceType<typeof ChatMessages>>()
const headerMenuOpen = ref(false)
const headerMenuStyle = ref<Record<string, string>>({})
const headerRenaming = ref(false)
const headerRenameValue = ref('')
const headerRenameInputRef = ref<HTMLInputElement>()
const headerRenameError = ref('')

const canHeaderRename = computed(() => {
  const val = headerRenameValue.value.trim()
  return val.length > 0 && val !== currentSession.value?.title && !ILLEGAL_CHARS.test(val)
})

function validateHeaderRename() {
  const val = headerRenameValue.value
  if (val.length === 0) {
    headerRenameError.value = '名称不能为空'
  } else if (ILLEGAL_CHARS.test(val)) {
    headerRenameError.value = '不允许包含 \\ / : * ? " < > |'
  } else if (val.length > MAX_TITLE_LENGTH) {
    headerRenameError.value = `名称不能超过 ${MAX_TITLE_LENGTH} 个字符`
  } else {
    headerRenameError.value = ''
  }
}

function toggleHeaderMenu(event: MouseEvent) {
  headerMenuOpen.value = !headerMenuOpen.value
  if (headerMenuOpen.value) {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    headerMenuStyle.value = {
      position: 'fixed',
      top: `${rect.bottom + 4}px`,
      right: `${window.innerWidth - rect.right}px`
    }
  }
}

const headerDropdownRef = ref<HTMLElement | null>(null)
onClickOutside(headerDropdownRef, () => {
  headerMenuOpen.value = false
})

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
  // 保存当前 session 状态（包括流式输出中的内容）
  saveCurrentSessionWithStream()
  const session = await createSession()
  switchSession(session.convId)
  getOrCreateService(session)
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
}

function handleDeleteSession(sessionId: string) {
  services.delete(sessionId)
  deleteSession(sessionId)
}

function handlePinSession(sessionId: string) {
  togglePin(sessionId)
}

function handleRenameSession(sessionId: string, title: string) {
  updateSessionTitle(sessionId, title)
}

// 标题栏菜单
const currentSession = computed(() => getCurrentSession())

function handleHeaderPin() {
  if (currentSession.value) {
    togglePin(currentSession.value.convId)
  }
  headerMenuOpen.value = false
}

function handleHeaderRename() {
  headerMenuOpen.value = false
  if (currentSession.value) {
    headerRenaming.value = true
    headerRenameValue.value = currentSession.value.title
    headerRenameError.value = ''
    nextTick(() => headerRenameInputRef.value?.focus())
  }
}

function finishHeaderRename() {
  validateHeaderRename()
  if (!canHeaderRename.value) return
  updateSessionTitle(currentSession.value!.convId, headerRenameValue.value.trim())
  headerRenaming.value = false
  headerRenameError.value = ''
}

function handleHeaderDelete() {
  if (currentSession.value) {
    services.delete(currentSession.value.convId)
    deleteSession(currentSession.value.convId)
  }
  headerMenuOpen.value = false
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
  max-width: 1000px;
  margin: 0 auto;
  width: 100%;
}

.chat-header {
  padding: 16px 24px;
  border-bottom: 1px solid var(--color-divider);
  display: flex;
  align-items: center;
  gap: 12px;
}

.chat-header h1 {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.thinking-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 12px;
  background: rgba(99, 102, 241, 0.08);
  color: var(--color-accent);
  font-size: 12px;
  font-weight: 500;
  animation: fadeIn 0.2s ease;
}

.thinking-pulse {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-accent);
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.4; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1); }
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 标题栏菜单 */
.header-menu-wrapper {
  margin-left: auto;
}

.header-more-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}

.header-more-btn:hover {
  background: rgba(0, 0, 0, 0.06);
}

.header-dropdown-menu {
  min-width: 140px;
  background: var(--input-bg);
  border: 1px solid var(--color-divider);
  border-radius: 8px;
  padding: 4px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  z-index: 10000;
  animation: fadeIn 0.12s ease;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--color-text-primary);
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
  color: var(--color-text-secondary);
  margin: 0 0 24px;
}

.start-btn {
  padding: 12px 24px;
  background: var(--color-accent);
  color: var(--color-text-inverse);
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  transition: background 0.2s;
}

.start-btn:hover {
  background: var(--color-accent-hover);
}

/* 错误提示 */
.error-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  background: rgba(239, 68, 68, 0.1);
  border-top: 1px solid rgba(239, 68, 68, 0.2);
}

.error-icon {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ef4444;
  color: white;
  border-radius: 50%;
  font-size: 12px;
  font-weight: bold;
  flex-shrink: 0;
}

.error-text {
  flex: 1;
  font-size: 14px;
  color: #ef4444;
}

.retry-btn {
  padding: 6px 14px;
  border-radius: 6px;
  border: 1px solid #ef4444;
  background: transparent;
  color: #ef4444;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.retry-btn:hover {
  background: #ef4444;
  color: white;
}

.dismiss-btn {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 16px;
  cursor: pointer;
  transition: background 0.2s;
}

.dismiss-btn:hover {
  background: rgba(0, 0, 0, 0.1);
}
</style>
