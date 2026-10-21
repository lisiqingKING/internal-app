<template>
  <div class="note-editor">
    <!-- 未保存确认条（FLOW-5 / FR-4.6） -->
    <div v-if="pendingAction" class="unsaved-bar">
      <span class="unsaved-text">有未保存的修改</span>
      <div class="unsaved-actions">
        <button class="unsaved-save" @click="onSaveThenContinue">保存</button>
        <button class="unsaved-discard" @click="onDiscardThenContinue">放弃</button>
        <button class="unsaved-cancel" @click="onCancelSwitch">取消切换</button>
      </div>
    </div>

    <div class="editor-toolbar">
      <input
        class="editor-title"
        :value="draftTitle"
        placeholder="新笔记"
        @input="onTitleInput"
      />
      <div class="editor-tools">
        <button class="tool-btn" title="加粗" @click="onFormat('bold')"><strong>B</strong></button>
        <button class="tool-btn" title="斜体" @click="onFormat('italic')"><em>I</em></button>
        <button class="tool-btn" title="无序列表" @click="onFormat('insertUnorderedList')">•</button>
        <button class="tool-btn" title="有序列表" @click="onFormat('insertOrderedList')">1.</button>
        <button class="tool-btn" title="插入图片 URL" @click="onInsertImage">🖼</button>
      </div>
      <button class="editor-save" :disabled="!dirty" @click="onSave">保存</button>
    </div>

    <div
      ref="contentRef"
      class="editor-content"
      contenteditable="true"
      @input="onContentInput"
    ></div>

    <p v-if="errorMessage" class="editor-error">{{ errorMessage }}</p>
  </div>
</template>

<script setup lang="ts">
import { inject, nextTick, ref, watch } from 'vue'
import { ASSISTANT_WORKSPACE } from '../../composables/assistant/useAssistantWorkspace'
import { sanitizeHtml } from '../../../../utils/sanitizeHtml'

const workspace = inject(ASSISTANT_WORKSPACE)
if (!workspace) throw new Error('AssistantNoteEditor 必须在提供 ASSISTANT_WORKSPACE 的父组件内使用')

const { notes } = workspace
const { activeNote, activeNoteId, draftTitle, draftContent, dirty, pendingAction } = notes

const contentRef = ref<HTMLElement | null>(null)
const errorMessage = ref('')

// ===== 内容区与草稿双向同步 =====

/**
 * 用命令式赋值而不是 v-html：v-html 每次渲染会重建子节点，光标会跳回开头。
 * 渲染前消毒（NFR-S2）：DB 里的内容可能来自旧版本或直接写库，不能直接塞进 innerHTML。
 */
function syncContent() {
  const el = contentRef.value
  if (!el) return
  const next = sanitizeHtml(draftContent.value)
  if (el.innerHTML !== next) el.innerHTML = next
}

watch(
  () => [activeNoteId.value, activeNote.value?.content] as const,
  () => {
    void nextTick(syncContent)
  },
  { immediate: true }
)

function onTitleInput(e: Event) {
  notes.setDraftTitle((e.target as HTMLInputElement).value)
}

function onContentInput() {
  const el = contentRef.value
  if (!el) return
  notes.setDraftContent(el.innerHTML)
}

// ===== 富文本工具栏 =====

function execCommand(command: string): void {
  const el = contentRef.value
  if (!el) return
  el.focus()
  if (typeof document.execCommand === 'function') {
    document.execCommand(command, false)
  }
}

function onFormat(command: string) {
  execCommand(command)
  onContentInput()
}

function onInsertImage() {
  const el = contentRef.value
  if (!el) return
  let url = ''
  try {
    url = window.prompt('请输入图片 URL') ?? ''
  } catch {
    return
  }
  if (!url.trim()) return
  const safe = url.trim().replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
  el.focus()
  if (typeof document.execCommand === 'function') {
    document.execCommand('insertHTML', false, `<img src="${safe}" alt="">`)
  } else {
    el.insertAdjacentHTML('beforeend', `<img src="${safe}" alt="">`)
  }
  onContentInput()
}

// ===== 保存 =====

async function onSave() {
  errorMessage.value = ''
  try {
    await notes.save()
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : '保存失败'
  }
}

// ===== 未保存确认条 =====

async function onSaveThenContinue() {
  errorMessage.value = ''
  try {
    const ok = await notes.save()
    if (!ok) return
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : '保存失败'
    return
  }
  notes.runPendingAction()
}

function onDiscardThenContinue() {
  notes.discard()
  syncContent()
  notes.runPendingAction()
}

function onCancelSwitch() {
  notes.cancelPendingAction()
}
</script>

<style scoped>
.note-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.unsaved-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 10px;
  background: var(--color-accent-muted);
  color: var(--color-accent);
  font-size: 12px;
  flex-shrink: 0;
}

.unsaved-actions {
  display: flex;
  gap: 4px;
}

.unsaved-actions button {
  padding: 2px 8px;
  font-size: 12px;
  border: 1px solid var(--color-divider);
  border-radius: 4px;
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  cursor: pointer;
}

.unsaved-actions button:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.editor-toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-bottom: 1px solid var(--color-divider);
  flex-shrink: 0;
}

.editor-title {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  font-weight: 600;
  padding: 2px 6px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: none;
  color: var(--color-text-primary);
  outline: none;
}

.editor-title:hover,
.editor-title:focus {
  border-color: var(--color-divider);
  background: var(--color-bg-primary);
}

.editor-tools {
  display: flex;
  gap: 2px;
}

.tool-btn {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 4px;
  background: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: 12px;
}

.tool-btn:hover {
  background: var(--color-surface);
  color: var(--color-text-primary);
}

.editor-save {
  padding: 3px 12px;
  font-size: 12px;
  border: none;
  border-radius: 5px;
  background: var(--color-accent);
  color: var(--btn-primary-text);
  cursor: pointer;
}

.editor-save:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.editor-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 10px 12px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--color-text-primary);
  outline: none;
}

.editor-content:empty::before {
  content: '输入笔记内容…';
  color: var(--color-text-tertiary);
}

.editor-content img {
  max-width: 100%;
}

.editor-error {
  margin: 0;
  padding: 6px 12px;
  font-size: 12px;
  color: var(--color-status-error);
  border-top: 1px solid var(--color-divider);
  flex-shrink: 0;
}
</style>
