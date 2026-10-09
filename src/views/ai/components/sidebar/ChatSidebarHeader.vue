<template>
  <div class="sidebar-header">
    <button class="new-chat-btn" @click="$emit('new-chat')">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="12" y1="5" x2="12" y2="19"/>
        <line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      新对话
    </button>
    <button class="new-chat-btn" @click="openNewCategoryDialog">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
        <line x1="12" y1="11" x2="12" y2="17"/>
        <line x1="9" y1="14" x2="15" y2="14"/>
      </svg>
      新建分组
    </button>
    <button class="new-chat-btn" @click="$emit('open-search')">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      搜索会话
    </button>

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
import ChatHeaderRename from './ChatHeaderRename.vue'

defineEmits<{
  'new-chat': []
  'create-category': [name: string]
  'open-search': []
}>()

const showNewCategoryDialog = ref(false)
const newCategoryDialogValue = ref('')
const newCategoryDialogError = ref('')

function openNewCategoryDialog() {
  newCategoryDialogValue.value = ''
  newCategoryDialogError.value = ''
  showNewCategoryDialog.value = true
}

defineExpose({ openNewCategoryDialog })
</script>

<style scoped>
.sidebar-header {
  padding: 14px 12px 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
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
</style>
