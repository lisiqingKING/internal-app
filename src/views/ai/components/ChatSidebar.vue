<template>
  <div class="sidebar">
    <div class="sidebar-header">
      <button class="new-chat-btn" @click="$emit('new-chat')">
        <span>+</span> 新建对话
      </button>
    </div>
    <div class="sidebar-title">历史对话</div>
    <div class="session-list" ref="sessionListRef">
      <div
        v-for="session in sortedSessions"
        :key="session.convId"
        class="session-item"
        :class="{ active: session.convId === currentSessionId, loading: session.isLoading }"
        @click="$emit('switch-session', session.convId)"
      >
        <span v-if="session.pinned" class="pin-icon">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
            <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
          </svg>
        </span>
        <span class="session-title">{{ session.title }}</span>
        <span v-if="session.isLoading" class="loading-indicator"></span>
        <div class="session-menu-wrapper" @click.stop>
          <button class="more-btn" @click="toggleMenu(session.convId, $event)">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <circle cx="12" cy="5" r="2"/>
              <circle cx="12" cy="12" r="2"/>
              <circle cx="12" cy="19" r="2"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- 加载更多触发器 -->
      <div ref="loadMoreTrigger" class="load-more-trigger">
        <span v-if="loadingMore" class="loading-more">加载中...</span>
        <span v-else-if="!hasMore && sortedSessions.length > 0" class="no-more">没有更多了</span>
      </div>
    </div>

    <!-- 下拉菜单（Teleport 到 body 避免被 overflow 裁剪） -->
    <Teleport to="body">
      <div v-if="menuSession" ref="dropdownRef" class="dropdown-menu" :style="menuStyle">
        <button class="menu-item" @click="handlePin(menuSession.convId)">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
          </svg>
          {{ menuSession.pinned ? '取消置顶' : '置顶' }}
        </button>
        <button class="menu-item" @click="handleRename(menuSession)">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          重命名
        </button>
        <div class="menu-divider"></div>
        <button class="menu-item danger" @click="handleDelete(menuSession.convId)">
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
      <div v-if="renamingSession" class="modal-overlay" @click.self="renamingSession = null">
        <div class="modal-dialog">
          <div class="modal-header">重命名对话</div>
          <input
            ref="renameInputRef"
            v-model="renameValue"
            class="modal-input"
            :class="{ error: renameError }"
            placeholder="输入新名称"
            :maxlength="MAX_TITLE_LENGTH"
            @input="validateRename"
            @keydown.enter="confirmRename"
          />
          <div v-if="renameError" class="modal-error">{{ renameError }}</div>
          <div class="modal-footer">
            <button class="modal-btn cancel" @click="renamingSession = null">取消</button>
            <button class="modal-btn confirm" :disabled="!canRename" @click="confirmRename">确定</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, nextTick, onMounted, onUnmounted } from 'vue'
import { onClickOutside } from '@vueuse/core'
import type { ChatSession } from '../types'
import { ILLEGAL_CHARS, MAX_TITLE_LENGTH } from '../types'

const props = defineProps<{
  sessions: ChatSession[]
  currentSessionId: string | null
  loadingMore: boolean
  hasMore: boolean
}>()

const emit = defineEmits<{
  'new-chat': []
  'switch-session': [id: string]
  'delete-session': [id: string]
  'load-more': []
  'pin-session': [id: string]
  'rename-session': [id: string, title: string]
}>()

const sortedSessions = computed(() => {
  return [...props.sessions].sort((a, b) => {
    if (a.pinned !== b.pinned) return (b.pinned || 0) - (a.pinned || 0)
    return b.createdAt - a.createdAt
  })
})

// 下拉菜单
const menuSession = ref<ChatSession | null>(null)
const menuStyle = ref<Record<string, string>>({})
const renamingSession = ref<ChatSession | null>(null)
const renameValue = ref('')
const renameInputRef = ref<HTMLInputElement>()
const renameError = ref('')

const canRename = computed(() => {
  const val = renameValue.value.trim()
  return val.length > 0 && val !== renamingSession.value?.title && !ILLEGAL_CHARS.test(val)
})

function validateRename() {
  const val = renameValue.value
  if (val.length === 0) {
    renameError.value = '名称不能为空'
  } else if (ILLEGAL_CHARS.test(val)) {
    renameError.value = '不允许包含 \\ / : * ? " < > |'
  } else if (val.length > MAX_TITLE_LENGTH) {
    renameError.value = `名称不能超过 ${MAX_TITLE_LENGTH} 个字符`
  } else {
    renameError.value = ''
  }
}

function toggleMenu(convId: string, event: MouseEvent) {
  if (menuSession.value?.convId === convId) {
    menuSession.value = null
    return
  }
  const session = props.sessions.find(s => s.convId === convId)
  if (!session) return
  menuSession.value = session
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  menuStyle.value = {
    position: 'fixed',
    top: `${rect.bottom + 4}px`,
    right: `${window.innerWidth - rect.right}px`
  }
}

function handlePin(convId: string) {
  emit('pin-session', convId)
  menuSession.value = null
}

function handleRename(session: ChatSession) {
  menuSession.value = null
  renamingSession.value = session
  renameValue.value = session.title
  renameError.value = ''
  nextTick(() => renameInputRef.value?.focus())
}

function confirmRename() {
  validateRename()
  if (!canRename.value) return
  emit('rename-session', renamingSession.value!.convId, renameValue.value.trim())
  renamingSession.value = null
  renameError.value = ''
}

function handleDelete(convId: string) {
  emit('delete-session', convId)
  menuSession.value = null
}

// onClickOutside — 点击菜单外部自动关闭
const dropdownRef = ref<HTMLElement | null>(null)
onClickOutside(dropdownRef, () => {
  menuSession.value = null
})

// Intersection Observer for infinite scroll
const sessionListRef = ref<HTMLElement>()
const loadMoreTrigger = ref<HTMLElement>()
let observer: IntersectionObserver | null = null

onMounted(() => {
  if (loadMoreTrigger.value && sessionListRef.value) {
    observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && props.hasMore && !props.loadingMore) {
          emit('load-more')
        }
      },
      {
        root: sessionListRef.value,
        threshold: 0.1
      }
    )
    observer.observe(loadMoreTrigger.value)
  }
})

onUnmounted(() => {
  observer?.disconnect()
})
</script>

<style scoped>
.sidebar {
  width: 260px;
  background: var(--color-bg-secondary);
  border-right: 1px solid var(--color-divider);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-header {
  padding: 16px;
}

.new-chat-btn {
  width: 100%;
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px dashed var(--color-border);
  background: transparent;
  color: var(--color-text-primary);
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: background 0.2s, border-color 0.2s;
}

.new-chat-btn:hover {
  background: var(--color-surface);
  border-color: var(--color-accent);
}

.new-chat-btn span {
  font-size: 18px;
  font-weight: 600;
}

.sidebar-title {
  padding: 8px 16px;
  font-size: 12px;
  color: var(--color-text-secondary);
  text-transform: uppercase;
}

.session-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 8px;
}

.session-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 4px;
  transition: background 0.2s;
}

.session-item:hover {
  background: var(--color-surface);
}

.session-item.active {
  background: var(--color-accent);
}

.session-item.active .pin-icon {
  color: var(--color-text-inverse);
}

.pin-icon {
  color: var(--color-accent);
  margin-right: 4px;
  flex-shrink: 0;
}

.session-title {
  flex: 1;
  font-size: 14px;
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.loading-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--color-accent);
  animation: bounce 1.4s infinite ease-in-out both;
  flex-shrink: 0;
}

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}

/* 更多按钮 */
.session-menu-wrapper {
  position: relative;
  flex-shrink: 0;
}

.more-btn {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.15s, background 0.15s;
}

.session-item:hover .more-btn {
  opacity: 1;
}

.more-btn:hover {
  background: rgba(0, 0, 0, 0.08);
}

/* 加载更多 */
.load-more-trigger {
  padding: 12px;
  text-align: center;
}

.loading-more,
.no-more {
  font-size: 12px;
  color: var(--color-text-secondary);
}
</style>
