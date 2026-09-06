<template>
  <div class="chat-messages" ref="messagesRef">
    <div class="messages-inner">
      <div
        v-for="(msg, index) in messages"
        :key="index"
        @contextmenu.prevent="showContextMenu(index, $event)"
      >
        <MessageBubble :content="msg.content" :role="msg.role" />
      </div>

      <!-- 正在输入的助手消息 -->
      <StreamingMessage
        v-if="loading && (currentText || currentReasoning)"
        :text="currentText"
        :reasoning="currentReasoning"
      />

      <!-- 纯等待 -->
      <TypingIndicator v-if="loading && !currentText && !currentReasoning" />
    </div>

    <!-- Toast 提示 -->
    <div v-if="toast" class="toast">{{ toast }}</div>

    <!-- 右键菜单 -->
    <ContextMenu
      :visible="!!contextMenu"
      :index="contextMenu?.index ?? -1"
      :message="contextMenuIndex !== null ? messages[contextMenuIndex] : null"
      :style="contextMenuStyle"
      @close="contextMenu = null"
      @copy="(i) => emit('copy', i)"
      @save="(i, content) => handleSave(i, content)"
      @delete="(i) => emit('delete', i)"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { useEventListener } from '@vueuse/core'
import type { Message } from '@/views/ai/types'
import MessageBubble from './MessageBubble.vue'
import StreamingMessage from './StreamingMessage.vue'
import TypingIndicator from './TypingIndicator.vue'
import ContextMenu from '@/views/ai/components/common/ContextMenu.vue'

const props = defineProps<{
  messages: Message[]
  loading: boolean
  currentText: string
  currentReasoning: string
}>()

const emit = defineEmits<{
  copy: [index: number]
  delete: [index: number]
  contextmenu: [index: number, event: MouseEvent]
}>()

const messagesRef = ref<HTMLElement>()
const toast = ref('')

// 右键菜单
const contextMenu = ref<{ index: number } | null>(null)
const contextMenuStyle = ref<Record<string, string>>({})
const contextMenuIndex = ref<number | null>(null)

function showContextMenu(index: number, event: MouseEvent) {
  contextMenu.value = { index }
  contextMenuIndex.value = index
  contextMenuStyle.value = {
    position: 'fixed',
    top: `${event.clientY}px`,
    left: `${event.clientX}px`
  }
}

function closeContextMenu() {
  contextMenu.value = null
  contextMenuIndex.value = null
}

useEventListener(window, 'resize', closeContextMenu)

// 监听右键菜单事件
useEventListener(window, 'contextmenu', (e: MouseEvent) => {
  // 只有在消息区域内右键才处理
  if (messagesRef.value?.contains(e.target as Node)) {
    // 由父组件处理
  }
})

function showToast(msg: string) {
  toast.value = msg
  setTimeout(() => { toast.value = '' }, 2000)
}

async function handleSave(index: number, content: string) {
  const msg = props.messages[index]
  if (!msg) return
  const preview = msg.content.replace(/\n/g, ' ').trim().slice(0, 20).replace(/[\\/:*?"<>|]/g, '_')
  const role = msg.role === 'user' ? '用户消息' : 'AI回复'
  const filename = `${role}_${preview}.md`
  try {
    const filePath = await window.electronApis?.ai?.saveFile(msg.content, filename)
    if (filePath) {
      showToast(`已保存到 ${filePath}`)
    } else {
      showToast('保存已取消')
    }
  } catch {
    showToast('保存失败')
  }
}

function isNearBottom(): boolean {
  const el = messagesRef.value
  if (!el) return true
  return el.scrollHeight - el.scrollTop - el.clientHeight < 100
}

async function scrollToBottom() {
  await nextTick()
  if (messagesRef.value && isNearBottom()) {
    messagesRef.value.scrollTop = messagesRef.value.scrollHeight
  }
}

async function forceScrollToBottom() {
  await nextTick()
  if (messagesRef.value) {
    messagesRef.value.scrollTop = messagesRef.value.scrollHeight
  }
}

watch(() => [props.messages.length, props.loading, props.currentText, props.currentReasoning], () => {
  scrollToBottom()
}, { flush: 'post' })

// 暴露给父组件的方法
defineExpose({ scrollToBottom, forceScrollToBottom })
</script>

<style scoped>
.chat-messages {
  flex: 1;
  overflow-y: auto;
  scroll-behavior: smooth;
}

.messages-inner {
  padding: 32px 120px 16px;
  display: flex;
  flex-direction: column;
}

/* Toast */
.toast {
  position: fixed;
  bottom: 140px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 20px;
  background: rgba(0, 0, 0, 0.75);
  color: #fff;
  border-radius: 8px;
  font-size: 13px;
  z-index: 10001;
  animation: toastIn 0.2s ease;
  pointer-events: none;
  max-width: 80%;
  text-align: center;
}

@keyframes toastIn {
  from { opacity: 0; transform: translateX(-50%) translateY(8px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}
</style>
