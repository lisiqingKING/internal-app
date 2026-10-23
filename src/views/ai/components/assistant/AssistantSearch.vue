<template>
  <div class="assistant-search">
    <div class="search-input-row">
      <Search :size="13" class="search-icon" />
      <input
        ref="inputRef"
        class="search-input"
        :value="keyword"
        placeholder="搜索笔记和对话内容..."
        @input="onInput"
      />
      <button class="search-close" title="关闭搜索" @click="emit('close')">
        <X :size="13" />
      </button>
    </div>

    <div class="search-body">
      <div v-if="loading" class="search-state">搜索中…</div>
      <div v-else-if="error" class="search-state error">搜索失败：{{ error }}</div>
      <div v-else-if="!searched" class="search-state">输入关键词开始搜索</div>
      <div v-else-if="total === 0" class="search-state">没有找到匹配内容</div>

      <template v-else>
        <section v-if="notes.length" class="result-group">
          <header class="group-title"><StickyNote :size="12" />笔记 ({{ notes.length }})</header>
          <button
            v-for="hit in notes"
            :key="hit.noteId"
            class="result-item"
            @click="onNoteClick(hit)"
          >
            <div class="result-head">
              <span class="result-title">{{ hit.title || '新笔记' }}</span>
              <span class="result-scope">· 主会话「{{ hit.scopeTitle || '未知会话' }}」</span>
            </div>
            <div class="result-snippet" v-html="snippet(hit.snippet)"></div>
          </button>
        </section>

        <section v-if="messages.length" class="result-group">
          <header class="group-title"><MessageCircle :size="12" />对话 ({{ messages.length }})</header>
          <button
            v-for="hit in messages"
            :key="hit.msgId"
            class="result-item"
            @click="onMessageClick(hit)"
          >
            <div class="result-head">
              <span class="result-title">{{ hit.convTitle || '对话' }}</span>
              <span class="result-scope">· 主会话「{{ hit.scopeTitle || '未知会话' }}」</span>
            </div>
            <div class="result-snippet" v-html="snippet(hit.snippet)"></div>
          </button>
        </section>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { MessageCircle, Search, StickyNote, X } from 'lucide-vue-next'
import { useAssistantSearch, type MessageHit, type NoteHit } from '../../composables/assistant/useAssistantSearch'
import { highlightKeyword } from '../../../../utils/highlight'

const emit = defineEmits<{
  close: []
  navigate: [target: import('../../composables/assistant/useAssistantSearch').SearchNavigateTarget]
}>()

const { keyword, results, loading, searched, error, setKeyword } = useAssistantSearch()

const inputRef = ref<HTMLInputElement | null>(null)

const notes = computed(() => results.value.notes)
const messages = computed(() => results.value.messages)
const total = computed(() => notes.value.length + messages.value.length)

onMounted(async () => {
  await nextTick()
  inputRef.value?.focus()
})

function onInput(e: Event) {
  setKeyword((e.target as HTMLInputElement).value)
}

function snippet(html: string): string {
  return highlightKeyword(html, keyword.value)
}

function onNoteClick(hit: NoteHit) {
  emit('navigate', { type: 'note', scopeId: hit.scopeId, noteId: hit.noteId })
}

function onMessageClick(hit: MessageHit) {
  emit('navigate', {
    type: 'message',
    scopeId: hit.scopeId,
    convId: hit.convId,
    msgId: hit.msgId,
  })
}
</script>

<style scoped>
.assistant-search {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.search-input-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--color-divider);
  flex-shrink: 0;
}

.search-icon {
  flex-shrink: 0;
  color: var(--color-text-tertiary);
}

.search-input {
  flex: 1;
  min-width: 0;
  padding: 4px 8px;
  font-size: 13px;
  border: 1px solid var(--color-divider);
  border-radius: 6px;
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  outline: none;
}

.search-input:focus {
  border-color: var(--color-accent);
}

.search-close {
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
  flex-shrink: 0;
}

.search-close:hover {
  background: var(--color-surface);
  color: var(--color-text-primary);
}

.search-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 8px 12px;
}

.search-state {
  padding: 24px 0;
  text-align: center;
  font-size: 13px;
  color: var(--color-text-tertiary);
}

.search-state.error {
  color: var(--color-status-error);
}

.group-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
  padding: 6px 0;
}

.result-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 8px 10px;
  margin-bottom: 6px;
  border: 1px solid var(--color-divider);
  border-radius: 8px;
  background: var(--color-bg-primary);
  cursor: pointer;
}

.result-item:hover {
  border-color: var(--color-accent);
}

.result-head {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-size: 12px;
}

.result-title {
  font-weight: 600;
  color: var(--color-text-primary);
}

.result-scope {
  color: var(--color-text-tertiary);
}

.result-snippet {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--color-text-secondary);
  word-break: break-word;
}

.result-snippet :deep(mark) {
  background: var(--color-accent-muted);
  color: var(--color-accent);
  border-radius: 2px;
}
</style>
