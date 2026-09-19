<template>
  <div ref="scrollRef" class="messages-scroll" @scroll="onScroll">
    <!-- 历史消息虚拟滚动 -->
    <DynamicScroller
      v-if="messages.length > 0"
      ref="scrollerRef"
      :items="messages"
      key-field="msgId"
      :min-item-size="100"
      :page-mode="true"
      class="chat-scroller"
    >
      <template #default="{ item, index, active }">
        <DynamicScrollerItem
          :item="item"
          :active="active"
          :data-index="index"
          class="message-item"
        >
          <MessageBubble
            :content="item.content"
            :role="item.role"
            @contextmenu="(e) => showContextMenu(index, e)"
          />
        </DynamicScrollerItem>
      </template>
    </DynamicScroller>

    <!-- 空状态 -->
    <div v-else class="empty-hint">
      <span>开始新对话</span>
    </div>

    <!-- 流式消息 / 正在输入 -->
    <div class="streaming-footer">
      <StreamingMessage
        v-if="loading && (currentText || currentReasoning)"
        :text="currentText"
        :reasoning="currentReasoning"
      />
      <TypingIndicator v-if="loading && !currentText && !currentReasoning" />
    </div>

    <!-- 右键菜单 -->
    <ContextMenu
      :visible="!!contextMenu"
      :index="contextMenuIndex ?? -1"
      :message="contextMenuIndex !== null ? messages[contextMenuIndex] : null"
      :style="contextMenuStyle"
      @close="contextMenu = null"
      @copy="(i) => emit('copy', i)"
      @save="(i, _content) => handleSave(i, messages)"
      @delete="(i) => emit('delete', i)"
    />

    <!-- Toast -->
    <div v-if="toast" class="toast">{{ toast }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { useEventListener } from '@vueuse/core'
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'
import MessageBubble from './messages/MessageBubble.vue'
import StreamingMessage from './messages/StreamingMessage.vue'
import TypingIndicator from './messages/TypingIndicator.vue'
import ContextMenu from './common/ContextMenu.vue'
import type { Message } from '../types'

const props = defineProps<{
  messages: Message[]
  loading: boolean
  currentText: string
  currentReasoning: string
}>()

const emit = defineEmits<{
  copy: [index: number]
  delete: [index: number]
}>()

const scrollRef = ref<HTMLElement>()

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

// Toast
const toast = ref('')
function showToast(msg: string) {
  toast.value = msg
  setTimeout(() => { toast.value = '' }, 2000)
}

function handleSave(index: number, messages: Message[]) {
  const msg = messages[index]
  const preview = msg.content.replace(/\n/g, ' ').trim().slice(0, 20).replace(/[\\/:*?"<>|]/g, '_')
  const role = msg.role === 'user' ? '用户消息' : 'AI回复'
  const filename = `${role}_${preview}.md`
  try {
    const filePath = window.electronApis?.ai?.saveFile(msg.content, filename)
    if (filePath) {
      showToast(`已保存到 ${filePath}`)
    } else {
      showToast('保存已取消')
    }
  } catch {
    showToast('保存失败')
  }
}

// Sticky scroll
const isNearBottom = ref(true)

function onScroll() {
  const el = scrollRef.value
  if (!el) return
  isNearBottom.value = el.scrollHeight - el.scrollTop - el.clientHeight < 80
}

async function scrollToBottom() {
  await nextTick()
  if (!isNearBottom.value) return
  const el = scrollRef.value
  if (!el) return
  const stick = () => {
    if (!isNearBottom.value) return
    el.scrollTop = el.scrollHeight
  }
  stick()
  requestAnimationFrame(stick)
  requestAnimationFrame(stick)
  setTimeout(stick, 100)
  setTimeout(stick, 300)
  setTimeout(stick, 600)
}

async function forceScrollToBottom() {
  await nextTick()
  const el = scrollRef.value
  if (!el) return
  const doScroll = () => { el.scrollTop = el.scrollHeight }
  doScroll()
  requestAnimationFrame(doScroll)
  requestAnimationFrame(doScroll)
  setTimeout(doScroll, 100)
  setTimeout(doScroll, 300)
  setTimeout(doScroll, 600)
}

// 新消息 / 流式更新时自动滚动
watch(() => [props.messages.length, props.loading, props.currentText, props.currentReasoning], () => {
  if (props.loading) {
    scrollToBottom()
  } else {
    // 流式结束，强制滚到底部，防止 footer 移除时内容上跳
    forceScrollToBottom()
  }
}, { flush: 'post' })

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
  position: relative;
}

.chat-scroller {
  height: auto;
}

.message-item {
  padding: 3px 0;
}

.empty-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: var(--color-text-secondary);
  font-size: 14px;
}

.streaming-footer {
  padding: 3px 0;
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
