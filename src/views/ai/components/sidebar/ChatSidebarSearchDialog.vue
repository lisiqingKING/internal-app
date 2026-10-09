<template>
  <Teleport to="body">
    <div v-if="show" class="modal-overlay" @click.self="close">
      <div class="modal-dialog search-dialog">
        <div class="modal-header">搜索会话</div>
        <input
          ref="searchInputRef"
          v-model="localQuery"
          class="modal-input"
          placeholder="输入会话标题..."
          @keydown.esc="close"
        />
        <div class="search-results">
          <template v-if="sessionResults.length > 0">
            <div class="search-divider"><span>会话</span></div>
            <div
              v-for="item in sessionResults"
              :key="item.convId"
              class="search-result-item"
              @click="handleSelect(item.convId)"
            >
              <svg class="result-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              <span class="result-title">{{ item.title }}</span>
              <span v-if="item.categoryId" class="result-badge">{{ getCategoryName(item.categoryId) }}</span>
              <svg v-if="linkedSessionIds.has(item.convId)" class="linked-icon" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
          </template>
          <div v-if="localQuery && sessionResults.length === 0" class="search-empty">未找到相关会话</div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import type { ChatSession, Category } from '@/views/ai/types'
import { sortSessions } from '@/utils/sessionSort'

const props = defineProps<{
  show: boolean
  sessions: ChatSession[]
  categories: Category[]
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  'select-session': [convId: string]
}>()

const localQuery = ref('')
const searchInputRef = ref<HTMLInputElement>()
const linkedSessionIds = ref<Set<string>>(new Set())

watch(() => props.show, async (v) => {
  if (v) {
    localQuery.value = ''
    linkedSessionIds.value = new Set()
    await nextTick()
    searchInputRef.value?.focus()
    const assistant = window.bridge.getModules(['assistant']).assistant
    for (const s of props.sessions) {
      const link = await assistant.getLinksForSource('conversation', s.convId)
      if (link?.assistantConvId) {
        linkedSessionIds.value.add(s.convId)
      }
    }
  }
})

const sortedSessions = computed(() => sortSessions(props.sessions))

const sessionResults = computed(() => {
  if (!localQuery.value.trim()) return []
  const q = localQuery.value.toLowerCase()
  return sortedSessions.value.filter(s => s.title.toLowerCase().includes(q))
})

function getCategoryName(categoryId: string): string {
  return props.categories.find(c => c.id === categoryId)?.name || ''
}

function close() {
  emit('update:show', false)
}

function handleSelect(convId: string) {
  emit('select-session', convId)
  close()
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.modal-dialog {
  background: var(--modal-bg);
  border: 1px solid var(--color-divider);
  border-radius: 12px;
  padding: 20px;
  box-shadow: var(--shadow-lg);
}

.search-dialog {
  width: 360px;
  max-height: 480px;
  display: flex;
  flex-direction: column;
}

.modal-header {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 12px;
  color: var(--color-text-primary);
}

.modal-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--color-divider);
  border-radius: 8px;
  background: var(--input-bg);
  color: var(--input-text);
  font-size: 14px;
  outline: none;
  box-sizing: border-box;
}

.modal-input:focus {
  border-color: var(--input-border-focus);
}

.search-results {
  margin-top: 12px;
  max-height: 320px;
  overflow-y: auto;
}

.search-result-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
  gap: 8px;
}

.search-result-item:hover {
  background: var(--color-surface);
}

.search-result-item.active {
  background: var(--color-surface-hover);
}

.result-title {
  flex: 1;
  font-size: 13px;
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-badge {
  font-size: 11px;
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}

.search-divider {
  display: flex;
  align-items: center;
  padding: 8px 4px 4px;
  font-size: 11px;
  color: var(--color-text-tertiary);
}

.linked-icon {
  flex-shrink: 0;
  color: var(--color-accent);
}

.search-empty {
  text-align: center;
  color: var(--color-text-tertiary);
  font-size: 13px;
  padding: 16px 0;
}
</style>
