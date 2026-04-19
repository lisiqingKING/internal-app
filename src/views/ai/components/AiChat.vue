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
      <!-- 顶部标题 -->
      <div class="chat-header">
        <h1>{{ currentSessionTitle }}</h1>
      </div>

      <!-- 聊天消息列表 -->
      <ChatMessages
        :messages="currentState.chatHistory"
        :loading="currentState.loading"
        :current-text="currentState.currentText"
      />

      <!-- 输入区域 -->
      <ChatInput
        v-model="inputText"
        :disabled="currentState.loading"
        :loading="currentState.loading"
        @send="send"
        @cancel="cancelRequest"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { aiConfig, systemPrompt } from '../config'
import { useStream } from '../composables/useStream'
import ChatSidebar from './ChatSidebar.vue'
import ChatMessages from './ChatMessages.vue'
import ChatInput from './ChatInput.vue'
import type { Message, ChatSession } from '../types'

interface SessionState {
  chatHistory: Message[]
  currentText: string
  loading: boolean
}

const inputText = ref('')

const sessions = ref<ChatSession[]>([])
const currentSessionId = ref<string | null>(null)

// 每个会话的独立状态
const sessionStates = reactive(new Map<string, SessionState>())

const { parseSSE } = useStream()

// 获取当前会话状态
function getCurrentState(): SessionState {
  if (!currentSessionId.value) {
    return { chatHistory: [], currentText: '', loading: false }
  }
  if (!sessionStates.has(currentSessionId.value)) {
    sessionStates.set(currentSessionId.value, {
      chatHistory: [],
      currentText: '',
      loading: false
    })
  }
  return sessionStates.get(currentSessionId.value)!
}

// 当前显示的状态（计算属性）
const currentState = computed(() => getCurrentState())

// 当前对话标题
const currentSessionTitle = computed(() => {
  const session = sessions.value.find(s => s.id === currentSessionId.value)
  return session?.title || '新会话'
})

// 加载历史记录
function loadSessions() {
  try {
    const data = localStorage.getItem('ai-chat-sessions')
    sessions.value = data ? JSON.parse(data) : []
  } catch {
    sessions.value = []
  }
}

// 保存历史记录
function saveSessions() {
  const toSave = sessions.value.map(s => ({
    id: s.id,
    title: s.title,
    messages: s.messages,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    isLoading: s.isLoading
  }))
  localStorage.setItem('ai-chat-sessions', JSON.stringify(toSave))
}

// 获取当前会话
function getCurrentSession(): ChatSession | null {
  if (!currentSessionId.value) return null
  return sessions.value.find(s => s.id === currentSessionId.value) || null
}

// 初始化
onMounted(() => {
  loadSessions()
  if (sessions.value.length > 0) {
    const firstSession = sessions.value[0]
    currentSessionId.value = firstSession.id
    sessionStates.set(firstSession.id, {
      chatHistory: [...firstSession.messages],
      currentText: '',
      loading: false
    })
  }
})

function handleNewChat() {
  saveCurrentSession()
  const newSession: ChatSession = {
    id: `session-${Date.now()}`,
    title: '新会话',
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
  sessions.value.unshift(newSession)
  currentSessionId.value = newSession.id
  sessionStates.set(newSession.id, {
    chatHistory: [],
    currentText: '',
    loading: false
  })
  inputText.value = ''
  saveSessions()
}

function handleSwitchSession(id: string) {
  saveCurrentSession()
  currentSessionId.value = id

  const session = sessions.value.find(s => s.id === id)
  if (session) {
    if (!sessionStates.has(id)) {
      sessionStates.set(id, {
        chatHistory: [...session.messages],
        currentText: '',
        loading: false
      })
    }
  }

  inputText.value = ''
}

function handleDeleteSession(id: string) {
  sessionStates.delete(id)
  const index = sessions.value.findIndex(s => s.id === id)
  if (index !== -1) {
    sessions.value.splice(index, 1)
    if (currentSessionId.value === id) {
      if (sessions.value.length > 0) {
        currentSessionId.value = sessions.value[0].id
      } else {
        currentSessionId.value = null
      }
    }
  }
  saveSessions()
}

// 保存当前会话
function saveCurrentSession() {
  const session = getCurrentSession()
  const state = sessionStates.get(currentSessionId.value || '')
  if (session && state) {
    session.messages = [...state.chatHistory]
    session.updatedAt = Date.now()
    if (session.title === '新会话' && state.chatHistory.length > 0) {
      const firstUserMsg = state.chatHistory.find(m => m.role === 'user')
      if (firstUserMsg) {
        session.title = firstUserMsg.content.slice(0, 20) + (firstUserMsg.content.length > 20 ? '...' : '')
      }
    }
    saveSessions()
  }
}

function cancelRequest() {
  const session = getCurrentSession()
  if (session?.abortController) {
    session.abortController.abort()
  }
}

async function send() {
  const msg = inputText.value.trim()
  const targetSession = sessions.value.find(s => s.id === currentSessionId.value)

  if (!msg || (targetSession && targetSession.isLoading)) return
  if (!currentSessionId.value) return

  const currentState = getCurrentState()

  // 如果没有会话，创建一个
  if (!targetSession) {
    const session: ChatSession = {
      id: `session-${Date.now()}`,
      title: '新会话',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isLoading: false
    }
    sessions.value.unshift(session)
    currentSessionId.value = session.id
    saveSessions()
  }

  const session = getCurrentSession()
  if (!session) return

  // 创建 AbortController
  const abortController = new AbortController()
  session.isLoading = true
  session.abortController = abortController

  currentState.loading = true
  currentState.currentText = ''
  inputText.value = ''

  // 添加用户消息
  const userMsg = { role: 'user' as const, content: msg }
  currentState.chatHistory.push(userMsg)
  session.messages.push(userMsg)

  // 准备 API 请求
  const requestMessages = [
    { role: 'system', content: systemPrompt },
    ...session.messages.slice(0, -1),
    { role: 'user', content: msg }
  ]

  let fullText = ''
  try {
    const response = await fetch(aiConfig.apiUrl, {
      method: 'POST',
      signal: abortController.signal,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + aiConfig.apiKey
      },
      body: JSON.stringify({
        model: aiConfig.model,
        messages: requestMessages,
        stream: true
      })
    })

    for await (const data of parseSSE(response)) {
      const choice = data.choices?.[0]
      if (!choice) continue

      const content = choice.delta?.content || ''
      const reasoning = choice.delta?.reasoning_content || ''
      const text = content || reasoning

      if (text) {
        fullText += text
        currentState.currentText = fullText
      }
    }
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      // 取消请求时，保存已拿到的数据
      if (fullText) {
        if (session.title === '新会话') {
          const firstUserMsg = session.messages.find(m => m.role === 'user')
          if (firstUserMsg) {
            session.title = firstUserMsg.content.slice(0, 20) + (firstUserMsg.content.length > 20 ? '...' : '')
          }
        }
        session.messages.push({ role: 'assistant', content: fullText })
        currentState.chatHistory.push({ role: 'assistant', content: fullText })
        currentState.currentText = ''
      }
      session.isLoading = false
      session.abortController = undefined
      currentState.loading = false
      saveSessions()
      return
    }
    throw err
  }

  // 写入响应
  if (session.title === '新会话') {
    const firstUserMsg = session.messages.find(m => m.role === 'user')
    if (firstUserMsg) {
      session.title = firstUserMsg.content.slice(0, 20) + (firstUserMsg.content.length > 20 ? '...' : '')
    }
  }
  session.messages.push({ role: 'assistant', content: fullText })
  currentState.chatHistory.push({ role: 'assistant', content: fullText })
  session.updatedAt = Date.now()
  session.isLoading = false
  session.abortController = undefined
  currentState.loading = false
  currentState.currentText = ''
  saveSessions()
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
</style>