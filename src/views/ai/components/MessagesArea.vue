<template>
  <div ref="scrollRef" class="messages-scroll" @scroll="onScroll">
    <!-- 历史消息列表 -->
    <ChatMessages
      :messages="messages"
      :loading="loading"
      :current-text="currentText"
      :current-reasoning="currentReasoning"
      @copy="(i: number) => emit('copy', i)"
      @delete="(i: number) => emit('delete', i)"
    />
  </div>
</template>

<script setup lang="ts">
import { useStickyScroll } from '../composables/useStickyScroll'
import ChatMessages from './messages/ChatMessages.vue'
import type { Message } from '../types'

defineProps<{
  messages: Message[]
  loading: boolean
  currentText: string
  currentReasoning: string
}>()

const emit = defineEmits<{
  copy: [index: number]
  delete: [index: number]
}>()

const { scrollRef, onScroll, scrollToBottom, forceScrollToBottom } = useStickyScroll()

defineExpose({ scrollToBottom, forceScrollToBottom })
</script>

<style scoped>
.messages-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0 120px;
  box-sizing: border-box;
}
</style>
