<template>
  <div class="sidebar">
    <div class="sidebar-header">
      <button class="new-chat-btn" @click="$emit('new-chat')">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        新对话
      </button>
    </div>

    <div class="session-list" ref="sessionListRef">
      <div
        v-for="session in sortedSessions"
        :key="session.convId"
        class="session-item"
        :class="{ active: session.convId === currentSessionId }"
        @click="$emit('switch-session', session.convId)"
      >
        <div class="session-info">
          <div class="session-title">{{ session.title }}</div>
          <div class="session-meta">
            <span>{{ formatSidebarTime(session.updatedAt) }}</span>
            <span v-if="session.pinned" class="pin-icon">
              <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor">
                <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
              </svg>
            </span>
          </div>
        </div>
        <button class="more-btn" @click.stop="toggleMenu(session.convId, $event)">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
            <circle cx="12" cy="5" r="2"/>
            <circle cx="12" cy="12" r="2"/>
            <circle cx="12" cy="19" r="2"/>
          </svg>
        </button>
      </div>

      <!-- 加载更多触发器 -->
      <div ref="loadMoreTrigger" class="load-more-trigger">
        <span v-if="loadingMore" class="loading-more">加载中...</span>
      </div>
    </div>

    <!-- 下拉菜单 -->
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
    <ChatHeaderRename
      v-if="renamingSession"
      v-model="renameValue"
      :error="renameError"
      @confirm="(title) => { emit('rename-session', renamingSession!.convId, title); renamingSession = null }"
      @cancel="renamingSession = null"
    />

    <!-- 底部工具栏 -->
    <div class="sidebar-footer">
      <button class="footer-btn" @click="handleOpenSaveDir">查看保存文件</button>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { onClickOutside } from '@vueuse/core'
import type { ChatSession } from '../types'
import { formatSidebarTime } from '../../../utils/time'
import ChatHeaderRename from './ChatHeaderRename.vue'

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

function handleOpenSaveDir() {
  const tabs = window.bridge.getModules(['tabs']).tabs
  if (tabs?.createAiSaves) {
    tabs.createAiSaves()
  }
}

// 下拉菜单
const menuSession = ref<ChatSession | null>(null)
const menuStyle = ref<Record<string, string>>({})
const renamingSession = ref<ChatSession | null>(null)
const renameValue = ref('')
const renameError = ref('')

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
}

function handleDelete(convId: string) {
  emit('delete-session', convId)
  menuSession.value = null
}

const dropdownRef = ref<HTMLElement | null>(null)
onClickOutside(dropdownRef, () => {
  menuSession.value = null
})

const sortedSessions = computed(() => {
  return [...props.sessions].sort((a, b) => {
    if (a.pinned !== b.pinned) return (b.pinned || 0) - (a.pinned || 0)
    return b.createdAt - a.createdAt
  })
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
  width: 200px;
  height: 100%;
  background: var(--color-bg-secondary);
  border-right: 1px solid var(--color-divider);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-header {
  padding: 14px 12px 10px;
}

.new-chat-btn {
  width: 100%;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--color-divider);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}

.new-chat-btn:hover {
  background: var(--color-surface);
  color: var(--color-text-primary);
  border-color: var(--color-border);
}

.session-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 8px;
}

.session-item {
  display: flex;
  align-items: center;
  padding: 8px 8px;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 2px;
  transition: background 0.15s;
}

.session-item:hover {
  background: var(--color-surface);
}

.session-item:hover .more-btn {
  opacity: 1;
}

.session-item.active {
  background: var(--color-surface-hover);
}

.session-item.active .session-title {
  color: var(--color-text-primary);
  font-weight: 500;
}

.session-info {
  flex: 1;
  overflow: hidden;
}

.session-title {
  font-size: 13px;
  color: var(--color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.session-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 2px;
}

.session-meta span {
  font-size: 11px;
  color: var(--color-text-tertiary);
}

.pin-icon {
  color: var(--color-accent);
  display: flex;
  align-items: center;
}

/* 加载更多 */
.load-more-trigger {
  padding: 10px;
  text-align: center;
}

.loading-more,
.no-more {
  font-size: 11px;
  color: var(--color-text-tertiary);
}

/* 底部工具栏 */
.sidebar-footer {
  padding: 10px 12px 14px;
  border-top: 1px solid var(--color-divider);
}

.footer-btn {
  width: 100%;
  padding: 7px 10px;
  border-radius: 7px;
  border: none;
  background: transparent;
  color: var(--color-text-tertiary);
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.footer-btn:hover {
  background: var(--color-surface);
  color: var(--color-text-secondary);
}

/* 更多按钮 */
.more-btn {
  width: 26px;
  height: 26px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--color-text-tertiary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.15s, background 0.15s;
  flex-shrink: 0;
}

.more-btn:hover {
  background: var(--color-divider);
  color: var(--color-text-secondary);
}

/* 下拉菜单 */
.dropdown-menu {
  min-width: 140px;
  background: var(--modal-bg);
  border: 1px solid var(--color-divider);
  border-radius: 10px;
  padding: 4px;
  box-shadow: var(--shadow-lg);
  z-index: 10000;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--color-text-primary);
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s;
  text-align: left;
}

.menu-item:hover {
  background: var(--color-surface-hover);
}

.menu-item.danger {
  color: #ef4444;
}

.menu-item.danger:hover {
  background: rgba(239, 68, 68, 0.08);
}

.menu-divider {
  height: 1px;
  background: var(--color-divider);
  margin: 4px 8px;
}
</style>
