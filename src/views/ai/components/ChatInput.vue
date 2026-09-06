<template>
  <div class="chat-input">
    <div class="input-container">
      <textarea
        ref="textareaRef"
        :value="modelValue"
        @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
        @keydown.enter.exact.prevent="handleSend"
        :disabled="disabled && !loading"
        placeholder="输入消息..."
        rows="4"
      ></textarea>
      <button
        :class="['send-btn', { loading, disabled: !canSend }]"
        :disabled="!canSend"
        @click="handleSend"
        :title="loading ? '取消' : '发送'"
      >
        <template v-if="loading">
          <span class="spinner"></span>
        </template>
        <template v-else>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="19" x2="12" y2="5"/>
            <polyline points="5 12 12 5 19 12"/>
          </svg>
        </template>
      </button>
    </div>
    <div class="input-hint">Enter 发送 · Shift+Enter 换行</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  modelValue: string
  disabled: boolean
  loading: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'send': []
  'cancel': []
}>()

const textareaRef = ref<HTMLTextAreaElement>()

const canSend = computed(() => {
  if (props.loading) return true
  return !props.disabled && !!props.modelValue.trim()
})

function handleSend() {
  if (props.loading) {
    emit('cancel')
    return
  }
  if (!canSend.value) return
  emit('send')
}
</script>

<style scoped>
.chat-input {
  padding: 0 120px 36px;
}

.input-container {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  background: var(--input-bg);
  border: 1px solid var(--input-border);
  border-radius: 14px;
  padding: 12px 12px 12px 18px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
  transition: border-color 0.2s, box-shadow 0.2s;
}

.input-container:focus-within {
  border-color: var(--input-border-focus);
  box-shadow: 0 4px 32px rgba(0, 0, 0, 0.12);
}

.input-container textarea {
  flex: 1;
  border: none;
  background: transparent;
  color: var(--input-text);
  font-size: 15px;
  line-height: 1.6;
  outline: none;
  resize: none;
  font-family: inherit;
  box-sizing: border-box;
  max-height: 240px;
  padding: 0;
}

.input-container textarea::placeholder {
  color: var(--input-placeholder);
}

.input-container textarea:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.send-btn {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  border: none;
  background: var(--color-accent);
  color: var(--color-text-inverse);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: opacity 0.2s, transform 0.15s;
}

.send-btn:hover:not(:disabled) {
  opacity: 0.85;
}

.send-btn:active:not(:disabled) {
  transform: scale(0.95);
}

.send-btn:disabled,
.send-btn.disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.send-btn.loading {
  background: var(--color-surface);
  color: var(--color-text-secondary);
}

.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(0, 0, 0, 0.15);
  border-top-color: var(--color-text-secondary);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.input-hint {
  text-align: center;
  font-size: 11px;
  color: var(--color-text-tertiary);
  margin-top: 8px;
}
</style>
