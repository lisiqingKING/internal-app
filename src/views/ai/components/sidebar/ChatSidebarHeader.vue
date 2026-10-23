<template>
  <div class="sidebar-header">
    <div class="header-top">
      <button class="new-chat-btn" @click="$emit('new-chat')">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        新对话
      </button>
      <button class="menu-btn" @click="showMenu = !showMenu">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="5" r="2"/>
          <circle cx="12" cy="12" r="2"/>
          <circle cx="12" cy="19" r="2"/>
        </svg>
      </button>
    </div>

    <!-- 下拉菜单 -->
    <div v-if="showMenu" class="dropdown-menu">
      <button class="dropdown-item" @click="handleCreateCategory">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          <line x1="12" y1="11" x2="12" y2="17"/>
          <line x1="9" y1="14" x2="15" y2="14"/>
        </svg>
        新建分组
      </button>
      <button class="dropdown-item" @click="handleSearch">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        搜索会话
      </button>
    </div>

    <!-- 遮罩层，点击关闭菜单 -->
    <div v-if="showMenu" class="menu-overlay" @click="showMenu = false"></div>

    <ChatHeaderRename
      v-if="showNewCategoryDialog"
      v-model="newCategoryDialogValue"
      :error="newCategoryDialogError"
      @confirm="(name: string) => { showNewCategoryDialog = false; $emit('create-category', name) }"
      @cancel="showNewCategoryDialog = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ChatHeaderRename from '../common/ChatHeaderRename.vue'

const emit = defineEmits<{
  'new-chat': []
  'create-category': [name: string]
  'open-search': []
}>()

const showMenu = ref(false)
const showNewCategoryDialog = ref(false)
const newCategoryDialogValue = ref('')
const newCategoryDialogError = ref('')

function handleCreateCategory() {
  showMenu.value = false
  newCategoryDialogValue.value = ''
  newCategoryDialogError.value = ''
  showNewCategoryDialog.value = true
}

function handleSearch() {
  showMenu.value = false
  emit('open-search')
}

defineExpose({ openNewCategoryDialog: handleCreateCategory })
</script>

<style scoped>
.sidebar-header {
  padding: 10px 10px 8px;
  position: relative;
}

.header-top {
  display: flex;
  gap: 6px;
}

.new-chat-btn {
  flex: 1;
  padding: 7px 10px;
  border-radius: 8px;
  border: none;
  background: var(--color-accent);
  color: var(--color-text-inverse);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  transition: opacity 0.15s;
}

.new-chat-btn:hover {
  opacity: 0.85;
}

.menu-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid var(--color-divider);
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, color 0.15s;
  flex-shrink: 0;
}

.menu-btn:hover {
  background: var(--color-surface);
  color: var(--color-text-primary);
}

.dropdown-menu {
  position: absolute;
  top: 48px;
  left: 10px;
  right: 10px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-divider);
  border-radius: 8px;
  padding: 4px;
  z-index: 100;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

.dropdown-item {
  width: 100%;
  padding: 8px 10px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background 0.15s, color 0.15s;
  text-align: left;
}

.dropdown-item:hover {
  background: var(--color-surface);
  color: var(--color-text-primary);
}

.menu-overlay {
  position: fixed;
  inset: 0;
  z-index: 99;
}
</style>
