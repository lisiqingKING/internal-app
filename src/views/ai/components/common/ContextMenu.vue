<template>
  <Teleport to="body">
    <div
      v-if="visible"
      ref="menuRef"
      class="context-menu"
      :style="style"
      @click.stop
    >
      <button class="context-menu-item" @click="handleCopy">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2"/>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </svg>
        {{ copied ? '已复制' : '复制' }}
      </button>
      <button class="context-menu-item" @click="handleSave">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        保存
      </button>
      <div class="context-menu-divider"></div>
      <button class="context-menu-item danger" @click="handleDelete">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 6h18"/>
          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
        </svg>
        删除
      </button>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onClickOutside } from '@vueuse/core'
import type { Message } from '@/views/ai/types'

const props = defineProps<{
  visible: boolean
  index: number
  message: Message | null
  style: Record<string, string>
}>()

const emit = defineEmits<{
  close: []
  copy: [index: number]
  save: [index: number, content: string]
  delete: [index: number]
}>()

const menuRef = ref<HTMLElement>()
const copied = ref(false)

onClickOutside(menuRef, () => {
  if (props.visible) {
    emit('close')
  }
})

function handleCopy() {
  emit('copy', props.index)
  copied.value = true
  setTimeout(() => { copied.value = false }, 1500)
  emit('close')
}

function handleSave() {
  if (props.message) {
    emit('save', props.index, props.message.content)
  }
  emit('close')
}

function handleDelete() {
  emit('delete', props.index)
  emit('close')
}

</script>

<style scoped>
.context-menu {
  min-width: 140px;
  background: var(--modal-bg);
  border: 1px solid var(--color-divider);
  border-radius: 10px;
  padding: 4px;
  box-shadow: var(--shadow-lg);
  z-index: 10000;
  animation: menuIn 0.15s ease;
}

@keyframes menuIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

.context-menu-item {
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

.context-menu-item:hover {
  background: var(--color-surface-hover);
}

.context-menu-item.danger {
  color: #ef4444;
}

.context-menu-item.danger:hover {
  background: rgba(239, 68, 68, 0.08);
}

.context-menu-divider {
  height: 1px;
  background: var(--color-divider);
  margin: 4px 8px;
}
</style>
