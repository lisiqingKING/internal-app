<template>
  <div class="assistant-tabs">
    <div
      v-for="session in sessions"
      :key="session.convId"
      class="tab"
      :class="{ active: session.convId === activeConvId, dragging: draggingId === session.convId }"
      draggable="true"
      @click="emit('switch', session.convId)"
      @dragstart="onDragStart(session.convId, $event)"
      @dragend="onDragEnd"
      @dragover.prevent
      @drop="onDrop(session.convId, $event)"
    >
      <input
        v-if="renamingId === session.convId"
        :ref="setRenameInput"
        v-model="renameText"
        class="tab-rename-input"
        @click.stop
        @keydown.enter.prevent="commitRename"
        @keydown.esc.prevent="cancelRename"
        @blur="commitRename"
      />
      <span v-else class="tab-title" @dblclick.stop="startRename(session)">
        {{ session.title }}
      </span>
      <button
        class="tab-close"
        title="删除辅助会话"
        @click.stop="emit('remove', session.convId)"
      >
        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>

    <button class="tab-add" title="新建辅助会话" @click="emit('create')">
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref } from 'vue'
import type { ChatSession } from '../../types'

const props = defineProps<{
  sessions: ChatSession[]
  activeConvId: string | null
}>()

const emit = defineEmits<{
  switch: [convId: string]
  create: []
  remove: [convId: string]
  rename: [convId: string, title: string]
  reorder: [orderedConvIds: string[]]
}>()

// ===== 拖拽排序 =====

const draggingId = ref<string | null>(null)

function onDragStart(convId: string, event: DragEvent) {
  draggingId.value = convId
  event.dataTransfer?.setData('text/plain', convId)
}

function onDragEnd() {
  draggingId.value = null
}

function onDrop(targetConvId: string, event: DragEvent) {
  event.preventDefault()
  const sourceId = draggingId.value
  draggingId.value = null
  if (!sourceId || sourceId === targetConvId) return

  const order = props.sessions.map(s => s.convId)
  const fromIndex = order.indexOf(sourceId)
  const toIndex = order.indexOf(targetConvId)
  if (fromIndex === -1 || toIndex === -1) return

  const next = [...order]
  next.splice(fromIndex, 1)
  next.splice(toIndex, 0, sourceId)
  emit('reorder', next)
}

// ===== 重命名 =====

const renamingId = ref<string | null>(null)
const renameText = ref('')
// ref 写在 v-for 里会被收集成数组，这里用函数 ref 单独持有当前编辑框
let renameInputEl: HTMLInputElement | null = null

function setRenameInput(el: unknown) {
  renameInputEl = (el as HTMLInputElement | null) ?? null
}

function startRename(session: ChatSession) {
  renamingId.value = session.convId
  renameText.value = session.title
  nextTick(() => {
    renameInputEl?.focus()
    renameInputEl?.select()
  })
}

function commitRename() {
  const convId = renamingId.value
  const title = renameText.value.trim()
  renamingId.value = null
  if (!convId || !title) return
  emit('rename', convId, title)
}

function cancelRename() {
  renamingId.value = null
}
</script>

<style scoped>
.assistant-tabs {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
  border-bottom: 1px solid var(--color-divider);
  overflow-x: auto;
  flex-shrink: 0;
}

.tab {
  display: flex;
  align-items: center;
  gap: 4px;
  max-width: 160px;
  padding: 4px 6px 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  color: var(--color-text-secondary);
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: background 0.15s, color 0.15s;
}

.tab:hover {
  background: var(--color-surface);
  color: var(--color-text-primary);
}

.tab.active {
  background: var(--color-accent-muted);
  color: var(--color-accent);
}

.tab.dragging {
  opacity: 0.4;
}

.tab-title {
  overflow: hidden;
  text-overflow: ellipsis;
}

.tab-rename-input {
  width: 90px;
  font-size: 12px;
  padding: 1px 4px;
  border: 1px solid var(--color-accent);
  border-radius: 4px;
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  outline: none;
}

.tab-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border: none;
  border-radius: 4px;
  background: none;
  color: var(--color-text-tertiary);
  cursor: pointer;
  opacity: 0;
  flex-shrink: 0;
}

.tab:hover .tab-close,
.tab.active .tab-close {
  opacity: 1;
}

.tab-close:hover {
  background: var(--color-surface-hover);
  color: var(--color-text-primary);
}

.tab-add {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  border: none;
  border-radius: 6px;
  background: none;
  color: var(--color-text-secondary);
  cursor: pointer;
}

.tab-add:hover {
  background: var(--color-surface);
  color: var(--color-text-primary);
}
</style>
