<template>
  <!-- 下拉菜单 -->
  <Teleport to="body">
    <div v-if="menuSession" ref="dropdownRef" class="dropdown-menu" :style="menuStyle" @click.stop @pointerdown.capture.stop>
      <button class="menu-item" @click="handlePin(menuSession.convId)">
        <Pin :size="14" />
        {{ menuSession.categoryId === PINNED_CATEGORY_ID ? '取消置顶' : '置顶' }}
      </button>
      <button class="menu-item" @click="handleRename(menuSession)">
        <SquarePen :size="14" />
        重命名
      </button>
      <div class="menu-submenu-wrap">
        <button class="menu-item has-submenu" @click="showMoveToSubmenu = true">
          <ArrowRight :size="14" />
          移动到
          <ChevronRight class="submenu-arrow" :size="12" />
        </button>
        <div v-if="showMoveToSubmenu" class="dropdown-menu submenu">
          <button class="menu-item" @click="moveSessionTo(null)">
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
        <Trash2 :size="14" />
        删除
      </button>
    </div>
  </Teleport>

  <!-- 目录右键菜单 -->
  <Teleport to="body">
    <div v-if="menuCategory" ref="categoryMenuRef" class="dropdown-menu" :style="categoryMenuStyle" @click.stop @pointerdown.capture.stop>
      <button class="menu-item" @click="startRenameCategory(menuCategory)">
        <SquarePen :size="14" />
        重命名
      </button>
      <button class="menu-item" @click="handleNewChatInCategory(menuCategory)">
        <Plus :size="14" />
        新建会话
      </button>
      <div class="menu-divider"></div>
      <button class="menu-item danger" @click="showDeleteCategoryModal = true">
        <Trash2 :size="14" />
        删除
      </button>
    </div>
  </Teleport>

  <!-- 删除分组二次确认弹窗 -->
  <Teleport to="body">
    <div v-if="showDeleteCategoryModal" class="modal-overlay" @click.self="showDeleteCategoryModal = false" @pointerdown.capture.stop>
      <div class="modal-dialog">
        <div class="modal-header">删除「{{ menuCategory?.name }}」</div>
        <div class="modal-footer">
          <button class="modal-btn cancel" @click="showDeleteCategoryModal = false">取消</button>
          <button class="modal-btn danger" @click="confirmDeleteCategory">删除</button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- 重命名会话弹窗 -->
  <ChatHeaderRename
    v-if="renamingSession"
    v-model="renameValue"
    :error="renameError"
    @confirm="(title: string) => { emit('rename-session', renamingSession!.convId, title); renamingSession = null }"
    @cancel="renamingSession = null"
  />

  <!-- 重命名分组弹窗 -->
  <ChatHeaderRename
    v-if="renamingCategory"
    v-model="renameCategoryValue"
    :error="renameCategoryError"
    @confirm="(name: string) => { emit('rename-category', renamingCategory!.id, name); renamingCategory = null }"
    @cancel="renamingCategory = null"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onClickOutside } from '@vueuse/core'
import { ArrowRight, ChevronRight, Pin, Plus, SquarePen, Trash2 } from 'lucide-vue-next'
import type { ChatSession, Category } from '@/views/ai/types'
import { PINNED_CATEGORY_ID } from '@/views/ai/types'
import ChatHeaderRename from '../common/ChatHeaderRename.vue'

defineProps<{
  categories: Category[]
}>()

const emit = defineEmits<{
  'pin-session': [convId: string]
  'rename-session': [id: string, title: string]
  'delete-session': [id: string]
  'move-session': [convId: string, categoryId: string | null]
  'rename-category': [id: string, name: string]
  'delete-category': [id: string, withSessions: boolean]
  'new-chat-in-category': [categoryId: string]
}>()

// ============ 下拉菜单 ============
const menuSession = ref<ChatSession | null>(null)
const menuStyle = ref<Record<string, string>>({})
const renamingSession = ref<ChatSession | null>(null)
const renameValue = ref('')
const renameError = ref('')
const showMoveToSubmenu = ref(false)

function toggleMenu(session: ChatSession, event: MouseEvent) {
  if (menuSession.value?.convId === session.convId) {
    menuSession.value = null
    showMoveToSubmenu.value = false
    return
  }
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

function handleNewChatInCategory(cat: Category) {
  menuCategory.value = null
  emit('new-chat-in-category', cat.id)
}

function confirmDeleteCategory() {
  if (menuCategory.value) {
    emit('delete-category', menuCategory.value.id, true)
  }
  showDeleteCategoryModal.value = false
  menuCategory.value = null
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

defineExpose({
  toggleMenu,
  showCategoryMenu,
})
</script>

<style scoped>
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
  max-width: 200px;
  max-height: 240px;
  overflow-y: auto;
}

.dropdown-menu.submenu::-webkit-scrollbar {
  width: 4px;
}

.dropdown-menu.submenu::-webkit-scrollbar-track {
  background: transparent;
}

.dropdown-menu.submenu::-webkit-scrollbar-thumb {
  background: var(--color-divider);
  border-radius: 4px;
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
  justify-content: flex-start;
}

.menu-item.disabled {
  opacity: 0.5;
  cursor: default;
}

.submenu-arrow {
  flex-shrink: 0;
  margin-left: auto;
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
  margin-bottom: 16px;
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
