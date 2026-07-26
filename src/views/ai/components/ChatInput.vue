<template>
  <div class="chat-input">
    <div class="textarea-wrapper">
      <textarea
        :value="modelValue"
        @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
        @keydown.enter.exact.prevent="handleSend"
        :disabled="disabled && !loading"
        placeholder="输入消息..."
        rows="3"
      ></textarea>
      <button
        :class="['send-btn', { loading }]"
        :disabled="loading ? false : (disabled || !modelValue.trim())"
        @click="handleSend"
      >
        <template v-if="loading">
          <span class="spinner"></span>
          <span>thinking</span>
        </template>
        <span v-else>发送</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
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

function handleSend() {
  if (props.loading) {
    emit('cancel')
  } else {
    emit('send')
  }
}
</script>

<style scoped>
.chat-input {
  padding: 16px 24px;
  border-top: 1px solid var(--color-divider);
}

.textarea-wrapper {
  position: relative;
}

.textarea-wrapper textarea {
  width: 100%;
  padding: 14px 80px 14px 20px;
  border-radius: 16px;
  border: 1px solid var(--input-border);
  background: var(--input-bg);
  color: var(--input-text);
  font-size: 15px;
  outline: none;
  resize: none;
  transition: border-color 0.2s;
  line-height: 1.5;
  font-family: inherit;
  box-sizing: border-box;
}

.textarea-wrapper textarea::placeholder {
  color: var(--input-placeholder);
}

.textarea-wrapper textarea:focus {
  border-color: var(--input-border-focus);
}

.textarea-wrapper textarea:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.textarea-wrapper .send-btn {
  position: absolute;
  right: 12px;
  bottom: 12px;
  padding: 8px 16px;
  border-radius: 16px;
  border: none;
  background: var(--color-accent);
  color: var(--color-text-inverse);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
}

.textarea-wrapper .send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.textarea-wrapper .send-btn.loading {
  background: var(--color-accent);
}

.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>