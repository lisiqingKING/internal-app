<template>
  <div ref="dropdownRef" class="header-dropdown-menu" :style="style">
    <button class="menu-item" @click="emit('pin')">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
      </svg>
      {{ isPinned ? '取消置顶' : '置顶' }}
    </button>
    <button class="menu-item" @click="emit('rename')">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>
      重命名
    </button>
    <div class="menu-divider"></div>
    <button class="menu-item danger" @click="emit('delete')">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 6h18"/>
        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      </svg>
      删除
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onClickOutside } from '@vueuse/core'

defineProps<{
  style: Record<string, string>
  isPinned: boolean
}>()

const emit = defineEmits<{
  pin: []
  rename: []
  delete: []
  'close': []
}>()

const dropdownRef = ref<HTMLElement | null>(null)
onClickOutside(dropdownRef, () => emit('close'))
</script>
