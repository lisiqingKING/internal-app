<template>
  <div class="ai-chat">
    <!-- 左侧边栏 -->
    <div
      v-show="!assistantFullscreen"
      class="sidebar-wrapper"
      :class="{ collapsed }"
      :style="{ width: collapsed ? '0px' : sidebarWidth + 'px' }"
    >
      <div class="sidebar-inner">
        <ChatSidebar
          v-show="!collapsed"
          :sessions="sessions"
          :categories="categories"
          :current-session-id="currentSessionId"
          @new-chat="handleNewChat"
          @new-chat-in-category="handleNewChatInCategory"
          @switch-session="handleSwitchSession"
          @delete-session="handleDeleteSession"
          @pin-session="handlePinSession"
          @rename-session="handleRenameSession"
          @create-category="handleCreateCategory"
          @rename-category="handleRenameCategory"
          @delete-category="handleDeleteCategory"
          @move-session="handleMoveSession"
          @reorder-categories="handleReorderCategories"
        />
      </div>
      <button class="collapse-btn" @click="collapsed = !collapsed" :title="collapsed ? '展开' : '收起'">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
          <polyline v-if="collapsed" points="9 18 15 12 9 6"/>
          <polyline v-else points="15 18 9 12 15 6"/>
        </svg>
      </button>
    </div>

    <!-- 拖拽分隔线 -->
    <div
      v-show="!collapsed && !assistantFullscreen"
      class="sidebar-resize-handle"
      @mousedown="startSidebarResize"
    ></div>

    <!-- 中间主区域 -->
    <div v-show="!assistantFullscreen" class="main-content">
      <!-- 无会话时的欢迎页 -->
      <ChatEmptyState
        v-if="sessions.length === 0"
        @new-chat="handleNewChat"
        @use-prompt="handleUsePrompt"
      />

      <template v-else>
        <!-- 顶部工具栏 -->
        <ChatTopToolbar
          :session-title="currentSessionTitle"
          :assistant-active="assistantVisible"
          :inspiration-active="!inspirationCollapsed"
          @toggle-inspiration="toggleInspiration"
          @toggle-assistant="toggleAssistant"
        />

        <!-- 消息区域 -->
        <MessagesArea
          ref="messagesAreaRef"
          :messages="currentService?.state.chatHistory || []"
          :loading="currentService?.state.loading || false"
          :current-text="currentService?.state.currentText || ''"
          :current-reasoning="currentService?.state.currentReasoning || ''"
          :highlight-msg-id="mainHighlightMsgId"
          @copy="copy"
          @delete="remove"
        />

        <!-- 输入区 -->
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

    <!-- 右侧灵感面板：与辅助面板互斥，任何时刻只有一个右侧面板展开 -->
    <div class="inspiration-panel" :class="{ collapsed: inspirationCollapsed }">
      <InspirationPanel
        @use-prompt="(prompt) => { inputText = prompt }"
        @close="inspirationCollapsed = true"
      />
    </div>

    <!-- 右侧辅助面板 -->
    <AssistantPanel v-if="assistantVisible">
      <template #conversations>
        <AssistantConversations />
      </template>
      <template #notes>
        <AssistantNotes />
      </template>
      <template #search>
        <AssistantSearch @close="closeSearch" @navigate="handleSearchNavigate" />
      </template>
    </AssistantPanel>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useChatSessions } from '../composables/chat/useChatSessions'
import { useChatActions } from '../composables/chat/useChatActions'
import { useConfigCheck } from '../composables/useConfigCheck'
import ChatSidebar from './sidebar/ChatSidebar.vue'
import MessagesArea from './MessagesArea.vue'
import InputArea from './InputArea.vue'
import ChatEmptyState from './common/ChatEmptyState.vue'
import ChatTopToolbar from './toolbar/ChatTopToolbar.vue'
import InspirationPanel from './inspiration/InspirationPanel.vue'
import AssistantPanel from './assistant/AssistantPanel.vue'
import AssistantConversations from './assistant/AssistantConversations.vue'
import AssistantNotes from './assistant/AssistantNotes.vue'
import AssistantSearch from './assistant/AssistantSearch.vue'
import { useAssistantIntegration } from '../composables/assistant/useAssistantIntegration'
import { assistantApi } from '../composables/assistant/useAssistantConversations'
import { notesApi } from '../composables/assistant/useAssistantNotes'

const collapsed = ref(false)
const sidebarWidth = ref(220)
const inspirationCollapsed = ref(true)
const messagesAreaRef = ref<InstanceType<typeof MessagesArea>>()

// 侧边栏拖拽 resize
const MIN_SIDEBAR_WIDTH = 180
const MAX_SIDEBAR_WIDTH = 400
let isResizingSidebar = false
let resizeStartX = 0
let resizeStartWidth = 0

function startSidebarResize(e: MouseEvent) {
  isResizingSidebar = true
  resizeStartX = e.clientX
  resizeStartWidth = sidebarWidth.value
  document.addEventListener('mousemove', onSidebarResize)
  document.addEventListener('mouseup', stopSidebarResize)
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

function onSidebarResize(e: MouseEvent) {
  if (!isResizingSidebar) return
  const delta = e.clientX - resizeStartX
  sidebarWidth.value = Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, resizeStartWidth + delta))
}

function stopSidebarResize() {
  isResizingSidebar = false
  document.removeEventListener('mousemove', onSidebarResize)
  document.removeEventListener('mouseup', stopSidebarResize)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
  localStorage.setItem('ai-sidebar-width', String(sidebarWidth.value))
}

const {
  sessions,
  categories,
  currentSessionId,
  currentService,
  initSessions,
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
  reorderCategories,
  moveSessionToCategory,
} = useChatSessions()

/**
 * 辅助面板集成：面板状态、工作区（辅助会话 + 笔记）、搜索跳转、未保存修改守卫。
 * 打开面板时收起灵感面板，避免两个右侧面板叠加。
 */
const {
  panel: assistantPanel,
  visible: assistantVisible,
  fullscreen: assistantFullscreen,
  toggleAssistant,
  closeSearch,
  navigateFromSearch: handleSearchNavigate,
  mainHighlightMsgId,
  guardScopeChange,
} = useAssistantIntegration({
  currentSessionId,
  switchSession: doSwitchSession,
  onOpen: () => {
    inspirationCollapsed.value = true
  },
})

/**
 * 灵感大全与辅助面板互斥：打开一个必须先收起另一个。
 * 辅助面板因笔记有未保存修改而无法关闭时，灵感面板不展开。
 */
function toggleInspiration() {
  if (!inspirationCollapsed.value) {
    inspirationCollapsed.value = true
    return
  }
  if (assistantVisible.value && !assistantPanel.requestClose()) {
    ElMessage.warning('笔记有未保存的修改，已暂停切换 —— 请在辅助面板中保存或放弃')
    return
  }
  inspirationCollapsed.value = false
}

// 当前会话标题
const currentSessionTitle = computed(() => {
  const session = sessions.value.find(s => s.convId === currentSessionId.value)
  return session?.title || '新对话'
})

const { noConfig, checkConfig, goToSettings } = useConfigCheck()

const { inputText, send, cancel, retry, copy, remove } = useChatActions({
  currentService,
  updateCurrentMessages,
  onSent: () => nextTick(() => messagesAreaRef.value?.forceScrollToBottom()),
})

onMounted(async () => {
  const saved = localStorage.getItem('ai-sidebar-width')
  if (saved) sidebarWidth.value = Number(saved)
  // 设置读取失败不能拖垮整条初始化链，否则聊天页会是空白
  try {
    await assistantPanel.loadFromSettings()
  } catch (err) {
    console.error('[ai] 读取面板设置失败', err)
  }
  try {
    await initSessions()
  } catch (err) {
    console.error('[ai] 加载会话列表失败', err)
  }
  await checkConfig()
  nextTick(() => messagesAreaRef.value?.forceScrollToBottom())
})

/** 切换会话前保存（请求在后台继续运行，onComplete/onError 会自动同步状态） */
async function saveCurrentBeforeSwitch() {
  // sendMessage 和 onComplete 都会调用 syncState，session.messages 始终保持最新
  // 无需在此主动同步或取消请求
}

async function handleNewChat() {
  guardScopeChange(() => void doNewChat())
}

async function doNewChat() {
  await saveCurrentBeforeSwitch()
  await createSession()
  await checkConfig()
  nextTick(() => messagesAreaRef.value?.forceScrollToBottom())
}

async function handleUsePrompt(prompt: string) {
  guardScopeChange(() => void doUsePrompt(prompt))
}

async function doUsePrompt(prompt: string) {
  await saveCurrentBeforeSwitch()
  const session = await createSession()
  await switchSession(session.convId)
  inputText.value = prompt
  await checkConfig()
  nextTick(() => messagesAreaRef.value?.forceScrollToBottom())
}

async function handleSwitchSession(convId: string) {
  if (convId === currentSessionId.value) return
  // 切换主会话时关闭辅助面板；笔记有未保存修改时先走行内确认条
  guardScopeChange(() => {
    assistantPanel.close()
    void doSwitchSession(convId)
  })
}

async function doSwitchSession(convId: string) {
  await saveCurrentBeforeSwitch()
  // 清除目标会话的未读标记
  const target = sessions.value.find(s => s.convId === convId)
  if (target) target.hasNewMessages = false
  await switchSession(convId)
  await checkConfig()
  nextTick(() => messagesAreaRef.value?.forceScrollToBottom())
}

/** 删除主会话前统计将被一并删除的关联内容（AC-24 / FLOW-9） */
async function fetchRelatedCounts(scopeId: string) {
  try {
    const [assistants, notes] = await Promise.all([
      assistantApi().list(scopeId),
      notesApi().list(scopeId),
    ])
    return { assistants: assistants.length, notes: notes.length }
  } catch {
    return { assistants: 0, notes: 0 }
  }
}

async function handleDeleteSession(convId: string) {
  const session = sessions.value.find(s => s.convId === convId)
  const title = session?.title || '该会话'
  const related = await fetchRelatedCounts(convId)
  const detail = `将同时删除：主会话及其消息、关联辅助会话 ${related.assistants} 个（及各自消息）、笔记 ${related.notes} 条。`
  try {
    await ElMessageBox.confirm(`确定要删除「${title}」吗？${detail}`, '确认删除', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }
  const wasCurrent = currentSessionId.value === convId
  await deleteSession(convId)
  if (wasCurrent && currentSessionId.value) {
    await switchSession(currentSessionId.value)
    await checkConfig()
    nextTick(() => messagesAreaRef.value?.forceScrollToBottom())
  }
}

async function handlePinSession(convId: string) {
  await togglePin(convId)
}

function handleRenameSession(convId: string, title: string) {
  updateSessionTitle(convId, title)
}

function handleCreateCategory(name: string) {
  addCategory(name)
}

async function handleNewChatInCategory(categoryId: string) {
  guardScopeChange(() => void doNewChatInCategory(categoryId))
}

async function doNewChatInCategory(categoryId: string) {
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

async function handleReorderCategories(orderedIds: string[]) {
  await reorderCategories(orderedIds)
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
  flex-shrink: 0;
  height: 100%;
  /* 不能裁剪：折叠按钮要露在容器外，收起后仍要能点开 */
  overflow: visible;
  transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  display: flex;
}

/* 侧栏内容单独裁剪：宽度收缩时内容跟着裁，不外溢 */
.sidebar-inner {
  flex: 1 1 auto;
  min-width: 0;
  height: 100%;
  overflow: hidden;
}

.sidebar-wrapper.collapsed {
  width: 0 !important;
}

.collapse-btn {
  position: absolute;
  right: -12px;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 48px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-divider);
  border-radius: 0 8px 8px 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
  z-index: 10;
  transition: background 0.15s;
}

/* 收起后容器宽度为 0，展开按钮改为贴在左边缘（否则整颗按钮都在视口外） */
.sidebar-wrapper.collapsed .collapse-btn {
  right: auto;
  left: 4px;
}

.collapse-btn:hover {
  background: var(--color-surface);
  color: var(--color-text-primary);
}

.sidebar-resize-handle {
  width: 4px;
  cursor: col-resize;
  flex-shrink: 0;
  background: transparent;
  transition: background 0.15s;
  z-index: 5;
}

.sidebar-resize-handle:hover,
.sidebar-resize-handle:active {
  background: var(--color-accent);
}

.main-content {
  flex: 1;
  min-width: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.inspiration-panel {
  width: 300px;
  flex-shrink: 0;
  height: 100%;
  overflow: hidden;
  border-left: 1px solid var(--color-divider);
  background: var(--color-bg-secondary);
  transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s;
}

.inspiration-panel.collapsed {
  width: 0;
  opacity: 0;
  border-left: none;
}
</style>
