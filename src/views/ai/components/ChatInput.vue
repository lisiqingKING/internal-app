<template>
  <div class="chat-input">
    <div class="textarea-wrapper">
      <textarea
        ref="textareaRef"
        :value="modelValue"
        @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
        @keydown.enter.exact.prevent="handleSend"
        :disabled="disabled && !loading"
        placeholder="输入消息，Enter 发送，Shift+Enter 换行..."
        rows="3"
      ></textarea>
      <div class="input-footer">
        <span class="char-hint" :class="{ warn: modelValue.length > 1800 }">
          {{ modelValue.length > 0 ? `${modelValue.length} 字` : '' }}
        </span>
        <button
          :class="['send-btn', { loading, disabled: !canSend }]"
          :disabled="!canSend"
          @click="handleSend"
          :title="loading ? '取消' : '发送'"
        >
          <template v-if="loading">
            <span class="spinner"></span>
            <span>取消</span>
          </template>
          <template v-else>
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="12" y1="19" x2="12" y2="5"/>
              <polyline points="5 12 12 5 19 12"/>
            </svg>
            <span>发送</span>
          </template>
        </button>
      </div>
    </div>
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
  padding: 14px 24px 18px;
  border-top: 1px solid var(--color-divider);
}

.textarea-wrapper {
  background: var(--input-bg);
  border: 1px solid var(--input-border);
  border-radius: 16px;
  transition: border-color 0.2s, box-shadow 0.2s;
  overflow: hidden;
}

.textarea-wrapper:focus-within {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
}

.textarea-wrapper textarea {
  width: 100%;
  padding: 14px 16px 10px;
  border: none;
  background: transparent;
  color: var(--input-text);
  font-size: 15px;
  line-height: 1.6;
  outline: none;
  resize: none;
  font-family: inherit;
  box-sizing: border-box;
  min-height: 80px;
}

.textarea-wrapper textarea::placeholder {
  color: var(--input-placeholder);
  font-size: 14px;
}

.textarea-wrapper textarea:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.input-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px 10px;
}

.char-hint {
  font-size: 11px;
  color: var(--input-placeholder);
  transition: color 0.2s;
  min-width: 30px;
}

.char-hint.warn {
  color: #f59e0b;
}

.send-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  border-radius: 10px;
  border: none;
  background: var(--color-accent);
  color: var(--color-text-inverse);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.15s;
}

.send-btn:hover:not(:disabled) {
  opacity: 0.88;
  transform: translateY(-1px);
}

.send-btn:active:not(:disabled) {
  transform: translateY(0);
}

.send-btn:disabled,
.send-btn.disabled {
  opacity: 0.35;
  cursor: not-allowed;
  transform: none;
}

.send-btn.loading {
  background: var(--color-surface);
  color: var(--color-text-secondary);
  border: 1px solid var(--input-border);
}

.spinner {
  width: 13px;
  height: 13px;
  border: 2px solid rgba(0, 0, 0, 0.15);
  border-top-color: var(--color-text-secondary);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
