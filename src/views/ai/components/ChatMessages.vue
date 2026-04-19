<template>
  <div class="chat-messages" ref="messagesRef">
    <div
      v-for="(msg, index) in messages"
      :key="index"
      class="message-row"
      :class="msg.role"
    >
      <div class="message-bubble">
        <div class="message-content">{{ msg.content }}</div>
      </div>
    </div>

    <!-- 正在输入的助手消息 -->
    <div v-if="loading && currentText" class="message-row assistant">
      <div class="message-bubble">
        <div class="message-content">{{ currentText }}<span class="cursor"></span></div>
      </div>
    </div>

    <!-- 思考中 -->
    <div v-if="loading && !currentText" class="message-row assistant">
      <div class="message-bubble thinking-bubble">
        <div class="thinking-dot"></div>
        <div class="thinking-dot"></div>
        <div class="thinking-dot"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import type { Message } from '../types'

const props = defineProps<{
  messages: Message[]
  loading: boolean
  currentText: string
}>()

const messagesRef = ref<HTMLElement>()

// 滚动到底部
async function scrollToBottom() {
  await nextTick()
  if (messagesRef.value) {
    messagesRef.value.scrollTop = messagesRef.value.scrollHeight
  }
}

// 监听消息变化和加载状态变化时滚动
watch(() => [props.messages.length, props.loading, props.currentText], () => {
  scrollToBottom()
}, { flush: 'post' })
</script>

<style scoped>
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
}

.message-row {
  display: flex;
  margin-bottom: 16px;
}

.message-row.user {
  justify-content: flex-end;
}

.message-bubble {
  max-width: 70%;
  padding: 12px 16px;
  border-radius: 12px;
  background: #2d2d44;
}

.message-row.user .message-bubble {
  background: #3b82f6;
}

.message-content {
  color: #fff;
  font-size: 15px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

/* 光标闪烁 */
.cursor {
  display: inline-block;
  width: 2px;
  height: 14px;
  background: #fff;
  margin-left: 2px;
  vertical-align: middle;
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

/* 思考中动画 */
.thinking-bubble {
  display: flex;
  gap: 6px;
  padding: 14px 18px;
}

.thinking-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #3b82f6;
  animation: bounce 1.4s infinite ease-in-out both;
}

.thinking-dot:nth-child(1) { animation-delay: -0.32s; }
.thinking-dot:nth-child(2) { animation-delay: -0.16s; }
.thinking-dot:nth-child(3) { animation-delay: 0s; }

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}
</style>