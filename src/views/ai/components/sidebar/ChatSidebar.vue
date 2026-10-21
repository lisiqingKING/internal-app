<template>
  <div class="sidebar">
    <ChatSidebarHeader
      @new-chat="$emit('new-chat')"
      @create-category="(name) => emit('create-category', name)"
      @open-search="showSearchDialog = true"
    />

    <div class="session-list">
      <!-- 置顶分组（固定在顶部） -->
      <div class="group">
        <div class="group-header">
          <svg class="pin-icon" viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
            <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
          </svg>
          <span class="group-name">置顶</span>
          <span class="group-count">({{ pinnedSessions.length }})</span>
        </div>
        <div
          v-for="session in pinnedSessions"
          :key="session.convId"
          class="session-item"
          :class="{ active: session.convId === currentSessionId, dragging: draggingSessionId === session.convId }"
          draggable="true"
          @click="$emit('switch-session', session.convId)"
          @contextmenu.prevent="dropdownRef?.toggleMenu(session, $event)"
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
          <div class="session-time">{{ formatSidebarTime(session.updatedAt) }}</div>
        </div>
      </div>

      <!-- 用户自定义分组 -->
      <div v-for="cat in categoriesWithSessions" :key="cat.id" class="group">
        <div
          class="group-header"
          :class="{ expanded: expandedCategories.has(cat.id), dragging: draggingCategoryId === cat.id, 'no-sessions': cat.sessions.length === 0, dragOver: dragOverCategoryId === cat.id }"
          :data-cat-id="cat.id"
          draggable="true"
          @click="cat.sessions.length > 0 && toggleCategory(cat.id)"
          @contextmenu.prevent="dropdownRef?.showCategoryMenu(cat, $event)"
          @dragstart="onCategoryDragStart(cat.id, $event)"
          @dragenter="onCategoryDragEnter(cat.id)"
          @dragleave="onCategoryDragLeave"
          @dragover="onCategoryDragOver"
          @drop="onCategoryDrop(cat.id, $event)"
          @dragend="draggingCategoryId = null; dragOverCategoryId = null"
        >
          <svg v-if="cat.sessions.length > 0" class="chevron" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
          <span v-else class="chevron-placeholder"></span>
          <span class="group-name">{{ cat.name }}</span>
          <span class="group-count">({{ cat.sessions.length }})</span>
        </div>
        <div v-show="expandedCategories.has(cat.id)">
          <div
            v-for="session in cat.sessions"
            :key="session.convId"
            class="session-item"
            :class="{ active: session.convId === currentSessionId, dragging: draggingSessionId === session.convId }"
            draggable="true"
            @click="$emit('switch-session', session.convId)"
            @contextmenu.prevent="dropdownRef?.toggleMenu(session, $event)"
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
            <div class="session-time">{{ formatSidebarTime(session.updatedAt) }}</div>
          </div>
        </div>
      </div>

      <!-- 默认分组（固定在底部） -->
      <div class="group">
        <div
          class="group-header"
          :class="{ expanded: expandedCategories.has('default') }"
          @click="toggleCategory('default')"
        >
          <svg class="chevron" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
          <span class="group-name">默认</span>
          <span class="group-count">({{ defaultSessions.length }})</span>
        </div>
        <div v-show="expandedCategories.has('default')">
          <div
            v-for="session in defaultSessions"
            :key="session.convId"
            class="session-item"
            :class="{ active: session.convId === currentSessionId, dragging: draggingSessionId === session.convId }"
            draggable="true"
            @click="$emit('switch-session', session.convId)"
            @contextmenu.prevent="dropdownRef?.toggleMenu(session, $event)"
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
            <div class="session-time">{{ formatSidebarTime(session.updatedAt) }}</div>
          </div>
        </div>
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
      @new-chat-in-category="(id) => $emit('new-chat-in-category', id)"
    />

    <ChatSidebarSearchDialog
      v-model:show="showSearchDialog"
      :sessions="sessions"
      :categories="categories"
      @select-session="(id) => $emit('switch-session', id)"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { ChatSession, Category } from '@/views/ai/types'
import { PINNED_CATEGORY_ID } from '@/views/ai/types'
import { sortSessions } from '@/utils/sessionSort'
import { formatSidebarTime } from '@/utils/time'
import ChatSidebarHeader from './ChatSidebarHeader.vue'
import ChatSidebarDropdown from './ChatSidebarDropdown.vue'
import ChatSidebarSearchDialog from './ChatSidebarSearchDialog.vue'

type DropdownInstance = InstanceType<typeof ChatSidebarDropdown> & { toggleMenu: (session: ChatSession, event: MouseEvent) => void; showCategoryMenu: (cat: Category, event: MouseEvent) => void }

const props = defineProps<{
  sessions: ChatSession[]
  categories: Category[]
  currentSessionId: string | null
}>()

const emit = defineEmits<{
  'new-chat': []
  'new-chat-in-category': [categoryId: string]
  'switch-session': [id: string]
  'delete-session': [id: string]
  'pin-session': [id: string]
  'rename-session': [id: string, title: string]
  'create-category': [name: string]
  'rename-category': [id: string, name: string]
  'delete-category': [id: string, withSessions: boolean]
  'move-session': [convId: string, categoryId: string | null]
  'reorder-categories': [orderedIds: string[]]
}>()

// ============ 搜索 ============
const showSearchDialog = ref(false)

// ============ 目录折叠状态 ============
const expandedCategories = ref<Set<string>>(new Set(['default']))

function toggleCategory(id: string) {
  if (expandedCategories.value.has(id)) {
    const next = new Set(expandedCategories.value)
    next.delete(id)
    expandedCategories.value = next
  } else {
    const next = new Set(expandedCategories.value)
    next.add(id)
    expandedCategories.value = next
  }
}

// ============ 会话分组计算 ============
interface CategoryWithSessions extends Category {
  sessions: ChatSession[]
}

const sortedSessions = computed(() => {
  // 同一个 convId 只渲染一次。
  // 列表是全量拉取的，主进程保证一个 convId 一行；这里是渲染层兜底 ——
  // 万一上游出现重复，不会渲染出两个高亮（点第二个会被当成「点当前会话」直接返回，看起来像没反应）。
  const seen = new Set<string>()
  return sortSessions(props.sessions).filter((s) => {
    if (seen.has(s.convId)) return false
    seen.add(s.convId)
    return true
  })
})

const pinnedSessions = computed(() => {
  return sortedSessions.value.filter(s => s.categoryId === PINNED_CATEGORY_ID)
})

const categoriesWithSessions = computed((): CategoryWithSessions[] => {
  return props.categories.map(cat => ({
    ...cat,
    sessions: sortedSessions.value.filter(s => s.categoryId === cat.id),
  }))
})

// 分组收到新会话时自动展开
watch(() => categoriesWithSessions.value.map(c => c.sessions.length), (newLens) => {
  const next = new Set(expandedCategories.value)
  categoriesWithSessions.value.forEach((cat, i) => {
    if (newLens[i] > 0 && !next.has(cat.id)) {
      next.add(cat.id)
    }
  })
  expandedCategories.value = next
})

const defaultSessions = computed(() => {
  // 只看 categoryId：置顶是「categoryId = __pinned__」这个特殊分组，
  // pinned 只是它的冗余副本。之前这里还判 !s.pinned，
  // 于是 pinned=1 且 categoryId 为空的存量会话既不在置顶组也不在默认组 —— 直接消失。
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

// ============ 分组拖拽排序 ============
const draggingCategoryId = ref<string | null>(null)
const dragOverCategoryId = ref<string | null>(null)

function onCategoryDragStart(catId: string, event: DragEvent) {
  draggingCategoryId.value = catId
  event.dataTransfer?.setData('text/plain', catId)
}

function onCategoryDragEnter(catId: string) {
  if (draggingCategoryId.value && draggingCategoryId.value !== catId) {
    dragOverCategoryId.value = catId
  }
}

function onCategoryDragLeave() {
  dragOverCategoryId.value = null
}

function onCategoryDragOver(event: DragEvent) {
  event.preventDefault()
}

function onCategoryDrop(targetCatId: string, event: DragEvent) {
  event.preventDefault()
  dragOverCategoryId.value = null
  if (!draggingCategoryId.value || draggingCategoryId.value === targetCatId) {
    draggingCategoryId.value = null
    return
  }
  const currentOrder = props.categories.map(c => c.id)
  const fromIndex = currentOrder.indexOf(draggingCategoryId.value)
  const toIndex = currentOrder.indexOf(targetCatId)
  if (fromIndex === -1 || toIndex === -1) {
    draggingCategoryId.value = null
    return
  }
  const newOrder = [...currentOrder]
  newOrder.splice(fromIndex, 1)
  newOrder.splice(toIndex, 0, draggingCategoryId.value)
  draggingCategoryId.value = null
  emit('reorder-categories', newOrder)
}
</script>

<style scoped>
.sidebar {
  width: 100%;
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
  padding: 0 4px;
}

.group {
  margin-bottom: 4px;
}

.group-header {
  display: flex;
  align-items: center;
  padding: 4px 6px;
  border-radius: 5px;
  cursor: pointer;
  user-select: none;
  gap: 4px;
  transition: background 0.15s;
  position: relative;
}

.group-header:hover {
  background: var(--color-surface);
}

.chevron {
  flex-shrink: 0;
  color: var(--color-text-tertiary);
  transition: transform 0.2s;
}

.chevron-placeholder {
  width: 12px;
  flex-shrink: 0;
}

.group-header.expanded .chevron {
  transform: rotate(90deg);
}

.group-header.dragging {
  opacity: 0.5;
}

.group-header.no-sessions {
  cursor: default;
}

.group-header.dragOver::after {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 60%;
  background: var(--color-accent);
  border-radius: 2px;
}

.group-name {
  flex: 1;
  font-size: 11px;
  color: var(--color-text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
}

.group-count {
  font-size: 10px;
  color: var(--color-text-tertiary);
}

.group-empty {
  font-size: 11px;
  color: var(--color-text-tertiary);
  padding: 4px 10px;
  text-align: left;
}

.session-item {
  display: flex;
  align-items: center;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
  margin-bottom: 1px;
  transition: background 0.15s, opacity 0.15s;
  position: relative;
}

.session-item:hover {
  background: var(--color-surface);
}

.session-item.active {
  background: var(--color-surface-hover);
}

.session-item.active .session-title {
  color: var(--color-accent);
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

.unread-dot {
  width: 6px;
  height: 6px;
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
  width: 12px;
  height: 12px;
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
  font-size: 13px;
  color: var(--color-text-secondary);
}

.session-time {
  font-size: 10px;
  color: var(--color-text-tertiary);
  flex-shrink: 0;
  margin-left: 8px;
}
</style>
