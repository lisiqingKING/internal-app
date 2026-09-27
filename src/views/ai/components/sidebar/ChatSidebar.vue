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

    <div class="sidebar-categories">
      <button class="new-category-btn" @click="showNewCategoryInput = true">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        新建目录
      </button>
      <!-- 新建目录输入 -->
      <div v-if="showNewCategoryInput" class="new-category-input-wrap">
        <input
          ref="newCategoryInputRef"
          v-model="newCategoryName"
          class="new-category-input"
          placeholder="目录名称"
          @keydown.enter="confirmCreateCategory"
          @keydown.esc="showNewCategoryInput = false"
          @blur="showNewCategoryInput = false"
        />
        <button class="confirm-btn" @mousedown.prevent="confirmCreateCategory">✓</button>
      </div>
    </div>

    <div class="session-list" ref="sessionListRef">
      <!-- 目录列表 -->
      <div v-for="cat in categoriesWithSessions" :key="cat.id" class="category-block">
        <div
          class="category-header"
          :class="{ expanded: expandedCategories.has(cat.id) }"
          @click="toggleCategory(cat.id)"
        >
          <svg class="chevron" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
          <span class="category-name" @click.stop="startRenameCategory(cat)">{{ cat.name }}</span>
          <span class="category-count">({{ cat.sessions.length }})</span>
          <button class="category-new-chat" @click.stop="$emit('new-chat-in-category', cat.id)" title="在此目录新建会话">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
          <button class="category-more" @click.stop="showCategoryMenu(cat, $event)">
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
            <button class="more-btn" @click.stop="toggleMenu(session.convId, $event)">
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

      <!-- 默认分组 -->
      <div class="category-block">
        <div
          class="category-header default-category"
          :class="{ expanded: expandedCategories.has('default') }"
          @click="toggleCategory('default')"
        >
          <svg class="chevron" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
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
            <button class="more-btn" @click.stop="toggleMenu(session.convId, $event)">
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

    <!-- 下拉菜单 -->
    <Teleport to="body">
      <div v-if="menuSession" ref="dropdownRef" class="dropdown-menu" :style="menuStyle" @click.stop>
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
        <!-- 移动到子菜单 -->
        <div class="menu-submenu-wrap">
          <button class="menu-item has-submenu" @click="showMoveToSubmenu = true">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
            移动到
            <svg class="submenu-arrow" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
          <div v-if="showMoveToSubmenu" class="dropdown-menu submenu">
            <button class="menu-item" @click="moveSessionTo(null)">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
              默认分组
            </button>
            <button
              v-for="cat in categories"
              :key="cat.id"
              class="menu-item"
              :class="{ disabled: cat.id === menuSession.categoryId }"
              @click="moveSessionTo(cat.id)"
            >
              {{ cat.name }}
            </button>
          </div>
        </div>
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

    <!-- 目录右键菜单 -->
    <Teleport to="body">
      <div v-if="menuCategory" ref="categoryMenuRef" class="dropdown-menu" :style="categoryMenuStyle" @click.stop>
        <button class="menu-item" @click="startRenameCategory(menuCategory)">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          重命名
        </button>
        <div class="menu-divider"></div>
        <button class="menu-item danger" @click="showDeleteCategoryModal = true">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18"/>
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
          </svg>
          删除目录
        </button>
      </div>
    </Teleport>

    <!-- 删除目录二次确认弹窗 -->
    <Teleport to="body">
      <div v-if="showDeleteCategoryModal" class="modal-overlay" @click.self="showDeleteCategoryModal = false">
        <div class="modal-dialog">
          <div class="modal-header">删除目录「{{ menuCategory?.name }}」</div>
          <div class="modal-body">
            <p>目录内的会话将如何处理？</p>
          </div>
          <div class="modal-footer">
            <button class="modal-btn cancel" @click="showDeleteCategoryModal = false">取消</button>
            <button class="modal-btn danger" @click="confirmDeleteCategory(false)">仅删除目录</button>
            <button class="modal-btn danger" @click="confirmDeleteCategory(true)">删除目录及会话</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 重命名弹窗 -->
    <ChatHeaderRename
      v-if="renamingSession"
      v-model="renameValue"
      :error="renameError"
      @confirm="(title: string) => { emit('rename-session', renamingSession!.convId, title); renamingSession = null }"
      @cancel="renamingSession = null"
    />

    <!-- 重命名目录弹窗 -->
    <ChatHeaderRename
      v-if="renamingCategory"
      v-model="renameCategoryValue"
      :error="renameCategoryError"
      @confirm="(name: string) => { emit('rename-category', renamingCategory!.id, name); renamingCategory = null }"
      @cancel="renamingCategory = null"
    />

    <div class="sidebar-footer">
      <button class="footer-btn" @click="handleOpenSaveDir">查看保存文件</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { onClickOutside } from '@vueuse/core'
import type { ChatSession, Category } from '@/views/ai/types'
import { formatSidebarTime } from '@/utils/time'
import { sortSessions } from '@/utils/sessionSort'
import ChatHeaderRename from './ChatHeaderRename.vue'

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

// ============ 目录折叠状态 ============
const expandedCategories = ref<Set<string>>(new Set(['default']))

function toggleCategory(id: string) {
  if (expandedCategories.value.has(id)) {
    expandedCategories.value.delete(id)
  } else {
    expandedCategories.value.add(id)
  }
}

// ============ 新建目录 ============
const showNewCategoryInput = ref(false)
const newCategoryName = ref('')
const newCategoryInputRef = ref<HTMLInputElement>()

watch(showNewCategoryInput, (v) => {
  if (v) {
    nextTick(() => newCategoryInputRef.value?.focus())
  }
})

function confirmCreateCategory() {
  const name = newCategoryName.value.trim()
  if (name) {
    emit('create-category', name)
    newCategoryName.value = ''
  }
  showNewCategoryInput.value = false
}

// ============ 会话/目录分组计算 ============
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

// ============ 下拉菜单 ============
const menuSession = ref<ChatSession | null>(null)
const menuStyle = ref<Record<string, string>>({})
const renamingSession = ref<ChatSession | null>(null)
const renameValue = ref('')
const renameError = ref('')
const showMoveToSubmenu = ref(false)

function toggleMenu(convId: string, event: MouseEvent) {
  if (menuSession.value?.convId === convId) {
    menuSession.value = null
    showMoveToSubmenu.value = false
    return
  }
  const session = props.sessions.find(s => s.convId === convId)
  if (!session) return
  menuSession.value = session
  showMoveToSubmenu.value = false
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  menuStyle.value = {
    position: 'fixed',
    top: `${rect.bottom + 4}px`,
    right: `${window.innerWidth - rect.right}px`,
  }
}

function handlePin(convId: string) {
  emit('pin-session', convId)
  menuSession.value = null
}

function handleRename(session: ChatSession) {
  menuSession.value = null
  showMoveToSubmenu.value = false
  renamingSession.value = session
  renameValue.value = session.title
  renameError.value = ''
}

function handleDelete(convId: string) {
  emit('delete-session', convId)
  menuSession.value = null
  showMoveToSubmenu.value = false
}

function moveSessionTo(categoryId: string | null) {
  if (menuSession.value) {
    emit('move-session', menuSession.value.convId, categoryId)
  }
  menuSession.value = null
  showMoveToSubmenu.value = false
}

// ============ 目录菜单 ============
const menuCategory = ref<Category | null>(null)
const categoryMenuStyle = ref<Record<string, string>>({})
const renamingCategory = ref<Category | null>(null)
const renameCategoryValue = ref('')
const renameCategoryError = ref('')
const showDeleteCategoryModal = ref(false)

function showCategoryMenu(cat: Category, event: MouseEvent) {
  menuCategory.value = cat
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  categoryMenuStyle.value = {
    position: 'fixed',
    top: `${rect.bottom + 4}px`,
    right: `${window.innerWidth - rect.right}px`,
  }
}

function startRenameCategory(cat: Category) {
  menuCategory.value = null
  renamingCategory.value = cat
  renameCategoryValue.value = cat.name
  renameCategoryError.value = ''
}

function confirmDeleteCategory(withSessions: boolean) {
  if (menuCategory.value) {
    emit('delete-category', menuCategory.value.id, withSessions)
  }
  showDeleteCategoryModal.value = false
  menuCategory.value = null
}

// ============ 拖拽 ============
const draggingSessionId = ref<string | null>(null)

function onDragStart(convId: string, event: DragEvent) {
  draggingSessionId.value = convId
  event.dataTransfer?.setData('text/plain', convId)
}

function onDragEnd() {
  draggingSessionId.value = null
}

// ============ 通用 ============
const dropdownRef = ref<HTMLElement | null>(null)
const categoryMenuRef = ref<HTMLElement | null>(null)

onClickOutside(dropdownRef, () => {
  menuSession.value = null
  showMoveToSubmenu.value = false
})

onClickOutside(categoryMenuRef, () => {
  menuCategory.value = null
})

// 分页加载
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

.sidebar-header {
  padding: 14px 12px 10px;
}

.new-chat-btn {
  width: 100%;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid var(--color-divider);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}

.new-chat-btn:hover {
  background: var(--color-surface);
  color: var(--color-text-primary);
  border-color: var(--color-border);
}

.sidebar-categories {
  padding: 0 12px 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.new-category-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--color-text-tertiary);
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.new-category-btn:hover {
  background: var(--color-surface);
  color: var(--color-text-secondary);
}

.new-category-input-wrap {
  display: flex;
  align-items: center;
  gap: 4px;
}

.new-category-input {
  flex: 1;
  padding: 5px 8px;
  border: 1px solid var(--color-divider);
  border-radius: 5px;
  background: var(--input-bg);
  color: var(--input-text);
  font-size: 12px;
  outline: none;
}

.new-category-input:focus {
  border-color: var(--input-border-focus);
}

.confirm-btn {
  padding: 4px 8px;
  border: none;
  border-radius: 5px;
  background: var(--color-accent);
  color: var(--color-text-inverse);
  font-size: 12px;
  cursor: pointer;
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

.dropdown-menu {
  min-width: 140px;
  background: var(--modal-bg);
  border: 1px solid var(--color-divider);
  border-radius: 10px;
  padding: 4px;
  box-shadow: var(--shadow-lg);
  z-index: 10000;
}

.dropdown-menu.submenu {
  position: absolute;
  left: 100%;
  top: 0;
  min-width: 120px;
}

.menu-submenu-wrap {
  position: relative;
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

.menu-item.has-submenu {
  justify-content: space-between;
}

.menu-item.disabled {
  opacity: 0.5;
  cursor: default;
}

.submenu-arrow {
  flex-shrink: 0;
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

/* 弹窗 */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.modal-dialog {
  background: var(--modal-bg);
  border: 1px solid var(--color-divider);
  border-radius: 12px;
  padding: 20px;
  width: 320px;
  box-shadow: var(--shadow-lg);
}

.modal-header {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 12px;
  color: var(--color-text-primary);
}

.modal-body {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-bottom: 16px;
}

.modal-body p {
  margin: 0;
}

.modal-footer {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.modal-btn {
  padding: 8px 16px;
  border-radius: 8px;
  border: none;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s;
}

.modal-btn.cancel {
  background: var(--color-surface);
  color: var(--color-text-primary);
}

.modal-btn.cancel:hover {
  background: var(--color-surface-hover);
}

.modal-btn.danger {
  background: #ef4444;
  color: white;
}

.modal-btn.danger:hover {
  background: #dc2626;
}
</style>
