<template>
  <div class="assistant-notes">
    <header class="notes-header">
      <span class="notes-title">📝 笔记 ({{ notes.length }})</span>
      <button class="notes-new-btn" title="新建笔记" @click="onNewNote">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
    </header>

    <div class="notes-list-wrap">
      <div class="notes-list">
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
            <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <div class="notes-editor">
      <AssistantNoteEditor v-if="activeNote" />
      <div v-else class="editor-empty">选择或新建一条笔记</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { inject } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import AssistantNoteEditor from './AssistantNoteEditor.vue'
import { ASSISTANT_WORKSPACE } from '../../composables/assistant/useAssistantWorkspace'
import type { NoteRow } from '../../composables/assistant/useAssistantNotes'
import { formatTime } from '../../../../utils/time'

const workspace = inject(ASSISTANT_WORKSPACE)
if (!workspace) throw new Error('AssistantNotes 必须在提供 ASSISTANT_WORKSPACE 的父组件内使用')

const { notes: notesState } = workspace
const { notes, activeNoteId, activeNote } = notesState
const { highlight } = workspace

/** 搜索跳转后短暂高亮（FR-5.4） */
function isHighlighted(noteId: string): boolean {
  return highlight.value?.type === 'note' && highlight.value.id === noteId
}

// ===== 笔记操作 =====

async function onNewNote() {
  try {
    await notesState.newNote()
  } catch (err) {
    console.error('[assistant]', err)
    ElMessage.error(err instanceof Error ? err.message : '新建笔记失败')
  }
}

/** 切换编辑目标；有未保存修改时挂起，由编辑器顶部的确认条处理 */
function onSelect(noteId: string) {
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
  padding: 6px 8px;
  border-bottom: 1px solid var(--color-divider);
  flex-shrink: 0;
}

.notes-title {
  flex: 1;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
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

/* 列表在上、编辑器在下：列表可压缩，编辑器占据剩余空间 */
.notes-list-wrap {
  display: flex;
  flex-direction: column;
  min-height: 60px;
  max-height: 40%;
  flex: 0 1 auto;
  overflow: hidden;
}

.notes-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 4px 0;
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
  border-radius: 4px;
}

.note-item-title {
  flex: 1;
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

.note-item:hover .note-item-delete {
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
