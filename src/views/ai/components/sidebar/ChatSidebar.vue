<template>
  <div class="sidebar">
    <ChatSidebarHeader
      @new-chat="$emit('new-chat')"
      @create-category="(name) => emit('create-category', name)"
      @open-search="showSearchDialog = true"
    />

    <div class="session-list" ref="sessionListRef">
      <div v-for="cat in categoriesWithSessions" :key="cat.id" class="category-block">
        <div
          class="category-header"
          :class="{ expanded: expandedCategories.has(cat.id) }"
          @click="toggleCategory(cat.id)"
        >
          <svg class="chevron" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
          <span class="category-name" @click.stop="dropdownRef?.showCategoryMenu(cat, $event)">{{ cat.name }}</span>
          <span class="category-count">({{ cat.sessions.length }})</span>
          <button class="category-new-chat" @click.stop="$emit('new-chat-in-category', cat.id)" title="在此目录新建会话">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
          <button class="category-more" @click.stop="dropdownRef?.showCategoryMenu(cat, $event)">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
              <circle cx="12" cy="5" r="2"/>
              <circle cx="12" cy="12" r="2"/>
              <circle cx="12" cy="19" r="2"/>
            </svg>
          </button>
        </div>
        <div v-show="expandedCategories.has(cat.id)" class="category-sessions">
          <div
            v-for="session in cat.sessions"
            :key="session.convId"
            class="session-item"
            :class="{ active: session.convId === currentSessionId, dragging: draggingSessionId === session.convId }"
            draggable="true"
            @click="$emit('switch-session', session.convId)"
            @dragstart="onDragStart(session.convId, $event)"
            @dragend="onDragEnd"
          >
            <div class="session-left">
              <span class="status-placeholder">
                <span v-if="session.isLoading" class="loading-spinner"></span>
                <span v-else-if="session.hasNewMessages" class="unread-dot"></span>
              </span>
              <div class="session-title">{{ session.title }}</div>
            </div>
            <div class="session-right">
              <span class="session-time">{{ formatSidebarTime(session.updatedAt) }}</span>
              <span v-if="session.pinned" class="pin-icon">
                <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor">
                  <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
                </svg>
              </span>
            </div>
            <button class="more-btn" @click.stop="dropdownRef?.toggleMenu(session, $event)">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <circle cx="12" cy="5" r="2"/>
                <circle cx="12" cy="12" r="2"/>
                <circle cx="12" cy="19" r="2"/>
              </svg>
            </button>
          </div>
          <div v-if="cat.sessions.length === 0" class="category-empty">暂无会话</div>
        </div>
      </div>

      <div class="category-block">
        <div class="category-header default-category">
          <span class="category-name">默认分组</span>
          <span class="category-count">({{ defaultSessions.length }})</span>
        </div>
        <div v-show="expandedCategories.has('default')" class="category-sessions">
          <div
            v-for="session in defaultSessions"
            :key="session.convId"
            class="session-item"
            :class="{ active: session.convId === currentSessionId, dragging: draggingSessionId === session.convId }"
            draggable="true"
            @click="$emit('switch-session', session.convId)"
            @dragstart="onDragStart(session.convId, $event)"
            @dragend="onDragEnd"
          >
            <div class="session-left">
              <span class="status-placeholder">
                <span v-if="session.isLoading" class="loading-spinner"></span>
                <span v-else-if="session.hasNewMessages" class="unread-dot"></span>
              </span>
              <div class="session-title">{{ session.title }}</div>
            </div>
            <div class="session-right">
              <span class="session-time">{{ formatSidebarTime(session.updatedAt) }}</span>
              <span v-if="session.pinned" class="pin-icon">
                <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor">
                  <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
                </svg>
              </span>
            </div>
            <button class="more-btn" @click.stop="dropdownRef?.toggleMenu(session, $event)">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <circle cx="12" cy="5" r="2"/>
                <circle cx="12" cy="12" r="2"/>
                <circle cx="12" cy="19" r="2"/>
              </svg>
            </button>
          </div>
          <div v-if="defaultSessions.length === 0" class="category-empty">暂无会话</div>
        </div>
      </div>

      <div ref="loadMoreTrigger" class="load-more-trigger">
        <span v-if="loadingMore" class="loading-more">加载中...</span>
      </div>
    </div>

    <ChatSidebarDropdown
      ref="dropdownRef"
      :categories="categories"
      @pin-session="(id) => $emit('pin-session', id)"
      @rename-session="(id, title) => $emit('rename-session', id, title)"
      @delete-session="(id) => $emit('delete-session', id)"
      @move-session="(convId, catId) => $emit('move-session', convId, catId)"
      @rename-category="(id, name) => $emit('rename-category', id, name)"
      @delete-category="(id, withSessions) => $emit('delete-category', id, withSessions)"
    />

    <ChatSidebarSearchDialog
      v-model:show="showSearchDialog"
      :sessions="sessions"
      :categories="categories"
      @select-session="(id) => $emit('switch-session', id)"
    />

    <div class="sidebar-footer">
      <button class="footer-btn" @click="handleOpenSaveDir">查看保存文件</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { ChatSession, Category } from '@/views/ai/types'
import { formatSidebarTime } from '@/utils/time'
import { sortSessions } from '@/utils/sessionSort'
import ChatSidebarHeader from './ChatSidebarHeader.vue'
import ChatSidebarDropdown from './ChatSidebarDropdown.vue'
import ChatSidebarSearchDialog from './ChatSidebarSearchDialog.vue'

type DropdownInstance = InstanceType<typeof ChatSidebarDropdown> & { toggleMenu: (session: ChatSession, event: MouseEvent) => void; showCategoryMenu: (cat: Category, event: MouseEvent) => void }

const props = defineProps<{
  sessions: ChatSession[]
  categories: Category[]
  currentSessionId: string | null
  loadingMore: boolean
  hasMore: boolean
}>()

const emit = defineEmits<{
  'new-chat': []
  'new-chat-in-category': [categoryId: string]
  'switch-session': [id: string]
  'delete-session': [id: string]
  'load-more': []
  'pin-session': [id: string]
  'rename-session': [id: string, title: string]
  'create-category': [name: string]
  'rename-category': [id: string, name: string]
  'delete-category': [id: string, withSessions: boolean]
  'move-session': [convId: string, categoryId: string | null]
}>()

function handleOpenSaveDir() {
  const tabs = window.bridge.getModules(['tabs']).tabs
  if (tabs?.createAiSaves) {
    tabs.createAiSaves()
  }
}

// ============ 搜索 ============
const showSearchDialog = ref(false)

// ============ 目录折叠状态 ============
const expandedCategories = ref<Set<string>>(new Set(['default']))

function toggleCategory(id: string) {
  if (expandedCategories.value.has(id)) {
    expandedCategories.value.delete(id)
  } else {
    expandedCategories.value.add(id)
  }
}

// ============ 会话分组计算 ============
interface CategoryWithSessions extends Category {
  sessions: ChatSession[]
}

const sortedSessions = computed(() => sortSessions(props.sessions))

const categoriesWithSessions = computed((): CategoryWithSessions[] => {
  return props.categories.map(cat => ({
    ...cat,
    sessions: sortedSessions.value.filter(s => s.categoryId === cat.id),
  }))
})

const defaultSessions = computed(() => {
  return sortedSessions.value.filter(s => !s.categoryId)
})

// ============ 拖拽 ============
const draggingSessionId = ref<string | null>(null)
const dropdownRef = ref<DropdownInstance | null>(null)

function onDragStart(convId: string, event: DragEvent) {
  draggingSessionId.value = convId
  event.dataTransfer?.setData('text/plain', convId)
}

function onDragEnd() {
  draggingSessionId.value = null
}

// ============ 分页加载 ============
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
      { root: sessionListRef.value, threshold: 0.1 },
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

.session-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 8px;
}

.category-block {
  margin-bottom: 4px;
}

.category-header {
  display: flex;
  align-items: center;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
  user-select: none;
  gap: 4px;
  transition: background 0.15s;
}

.category-header:hover {
  background: var(--color-surface);
}

.category-header:hover .category-more {
  opacity: 1;
}

.category-header:hover .category-new-chat {
  opacity: 1;
}

.chevron {
  flex-shrink: 0;
  transition: transform 0.2s;
}

.category-header.expanded .chevron {
  transform: rotate(90deg);
}

.category-name {
  flex: 1;
  font-size: 12px;
  color: var(--color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.category-count {
  font-size: 11px;
  color: var(--color-text-tertiary);
}

.category-new-chat {
  width: 22px;
  height: 22px;
  border-radius: 4px;
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

.category-new-chat:hover {
  background: var(--color-divider);
  color: var(--color-text-secondary);
}

.category-more {
  width: 22px;
  height: 22px;
  border-radius: 4px;
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

.category-more:hover {
  background: var(--color-divider);
  color: var(--color-text-secondary);
}

.category-sessions {
  padding-left: 12px;
}

.category-empty {
  font-size: 11px;
  color: var(--color-text-tertiary);
  padding: 8px 12px;
  text-align: center;
}

.session-item {
  display: flex;
  align-items: center;
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 2px;
  transition: background 0.15s, opacity 0.15s;
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

.session-item.dragging {
  opacity: 0.5;
}

.session-left {
  flex: 1;
  overflow: hidden;
  display: flex;
  align-items: center;
  gap: 6px;
}

.session-right {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.unread-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ef4444;
  flex-shrink: 0;
}

.status-placeholder {
  width: 14px;
  height: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.loading-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid var(--color-divider);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  flex-shrink: 0;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.session-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
}

.session-time {
  font-size: 11px;
  color: var(--color-text-tertiary);
}

.pin-icon {
  color: var(--color-accent);
  display: flex;
  align-items: center;
}

.load-more-trigger {
  padding: 10px;
  text-align: center;
}

.loading-more {
  font-size: 11px;
  color: var(--color-text-tertiary);
}

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
</style>
