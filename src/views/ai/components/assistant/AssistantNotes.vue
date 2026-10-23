<template>
  <div class="assistant-notes">
    <header class="notes-header">
      <button ref="entryBtnRef" class="notes-title" title="切换笔记" @click="onToggleDropdown">
        <StickyNote :size="13" class="notes-title-icon" />
        <span class="notes-title-text">笔记</span>
        <span class="notes-count">{{ notes.length }}</span>
        <ChevronDown :size="13" class="notes-chevron" :class="{ open: dropdownOpen }" />
      </button>
      <button class="notes-new-btn" title="新建笔记" @click="onNewNote">
        <Plus :size="14" />
      </button>
    </header>

    <Teleport to="body">
      <div
        v-if="dropdownOpen"
        class="notes-dropdown"
        :style="dropdownStyle"
        @pointerdown.capture.stop
        @click.stop
      >
        <div v-if="notes.length === 0" class="notes-empty">还没有笔记</div>
        <div
          v-for="note in notes"
          :key="note.id"
          class="note-item"
          :class="{ active: note.id === activeNoteId, highlighted: isHighlighted(note.id) }"
          @click="onSelect(note.id)"
        >
          <span class="note-item-title">{{ note.title || '新笔记' }}</span>
          <span class="note-item-time">{{ formatTime(note.updatedAt) }}</span>
          <button class="note-item-delete" title="删除笔记" @click.stop="onDelete(note)">
            <X :size="12" />
          </button>
        </div>
      </div>
    </Teleport>

    <div class="notes-editor">
      <AssistantNoteEditor v-if="activeNote" />
      <div v-else class="editor-empty">选择或新建一条笔记</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { inject, ref } from 'vue'
import { onClickOutside } from '@vueuse/core'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ChevronDown, Plus, StickyNote, X } from 'lucide-vue-next'
import AssistantNoteEditor from './AssistantNoteEditor.vue'
import { ASSISTANT_WORKSPACE } from '../../composables/assistant/useAssistantWorkspace'
import { useFloatingDropdown } from '../../composables/assistant/useFloatingDropdown'
import type { NoteRow } from '../../composables/assistant/useAssistantNotes'
import { formatTime } from '../../../../utils/time'

const workspace = inject(ASSISTANT_WORKSPACE)
if (!workspace) throw new Error('AssistantNotes 必须在提供 ASSISTANT_WORKSPACE 的父组件内使用')

const { notes: notesState } = workspace
const { notes, activeNoteId, activeNote } = notesState
const { highlight } = workspace

// ===== 笔记下拉浮层 =====

const {
  open: dropdownOpen,
  style: dropdownStyle,
  toggle: toggleDropdown,
  close: closeDropdown,
} = useFloatingDropdown()

const entryBtnRef = ref<HTMLElement | null>(null)

onClickOutside(entryBtnRef, () => closeDropdown())

function onToggleDropdown(e: MouseEvent) {
  toggleDropdown(e.currentTarget as HTMLElement)
}

/** 搜索跳转后短暂高亮（FR-5.4） */
function isHighlighted(noteId: string): boolean {
  return highlight.value?.type === 'note' && highlight.value.id === noteId
}

// ===== 笔记操作 =====

async function onNewNote() {
  closeDropdown()
  try {
    await notesState.newNote()
  } catch (err) {
    console.error('[assistant]', err)
    ElMessage.error(err instanceof Error ? err.message : '新建笔记失败')
  }
}

/** 切换编辑目标；有未保存修改时挂起，由编辑器顶部的确认条处理 */
function onSelect(noteId: string) {
  closeDropdown()
  notesState.select(noteId)
}

async function onDelete(note: NoteRow) {
  try {
    await ElMessageBox.confirm(`确定要删除笔记「${note.title || '新笔记'}」吗？`, '确认删除', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }
  try {
    await notesState.remove(note.id)
  } catch (err) {
    console.error('[assistant]', err)
    ElMessage.error(err instanceof Error ? err.message : '删除笔记失败')
  }
}
</script>

<style scoped>
.assistant-notes {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.notes-header {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 8px;
  border-bottom: 1px solid var(--color-divider);
  flex-shrink: 0;
}

.notes-title {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 4px;
  border: none;
  border-radius: 5px;
  background: none;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: background 0.15s;
}

.notes-title:hover {
  background: var(--color-surface);
  color: var(--color-text-primary);
}

.notes-title:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 1px;
}

.notes-title-icon {
  flex-shrink: 0;
  color: var(--color-text-tertiary);
}

/* 标题文字撑满，展开箭头靠右 —— 与辅助会话区入口保持一致 */
.notes-title-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
}

/* 数量用 chip：裸数字会漂在文字旁边，读不出是"共几条" */
.notes-count {
  flex-shrink: 0;
  min-width: 16px;
  padding: 0 5px;
  border-radius: 8px;
  background: var(--color-surface);
  color: var(--color-text-tertiary);
  font-size: 10px;
  font-weight: 500;
  line-height: 16px;
  text-align: center;
}

.notes-chevron {
  flex-shrink: 0;
  color: var(--color-text-tertiary);
  transition: transform 0.2s;
}

.notes-chevron.open {
  transform: rotate(180deg);
}

.notes-new-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 5px;
  background: none;
  color: var(--color-text-tertiary);
  cursor: pointer;
}

.notes-new-btn:hover {
  background: var(--color-surface);
  color: var(--color-text-primary);
}

.notes-new-btn:focus-visible,
.note-item-delete:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 1px;
}

/* ===== 下拉浮层（挂在 body 上） ===== */

.notes-dropdown {
  z-index: 10000;
  max-height: 320px;
  overflow-y: auto;
  padding: 4px;
  /* 不透明：浮层会盖在编辑器工具栏上，半透明会和底下文字叠在一起 */
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-divider);
  border-radius: 8px;
  box-shadow: var(--shadow-lg);
}

.notes-empty {
  padding: 12px;
  text-align: center;
  font-size: 12px;
  color: var(--color-text-tertiary);
}

.note-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px 6px 10px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.note-item:hover {
  background: var(--color-surface);
}

.note-item.active {
  background: var(--color-accent-muted);
  color: var(--color-accent);
}

.note-item.highlighted {
  outline: 1px solid var(--color-accent);
}

.note-item-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.note-item-time {
  font-size: 11px;
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}

.note-item-delete {
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

.note-item:hover .note-item-delete,
.note-item.active .note-item-delete {
  opacity: 1;
}

.note-item-delete:hover {
  background: var(--color-surface-hover);
  color: var(--color-text-primary);
}

.notes-editor {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.editor-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: 12px;
  color: var(--color-text-tertiary);
}
</style>
