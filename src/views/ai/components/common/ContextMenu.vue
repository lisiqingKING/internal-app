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
        <Copy :size="14" />
        {{ copied ? '已复制' : '复制' }}
      </button>
      <button class="context-menu-item" @click="handleSave">
        <Import :size="14" />
        保存
      </button>
      <div class="context-menu-divider"></div>
      <button class="context-menu-item danger" @click="handleDelete">
        <Trash2 :size="14" />
        删除
      </button>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onClickOutside } from '@vueuse/core'
import { Copy, Import, Trash2 } from 'lucide-vue-next'
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
