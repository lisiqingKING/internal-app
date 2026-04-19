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
        :disabled="loading ? false : (disabled || !modelValue.trim())"
        @click="handleSend"
      >
        {{ loading ? '停止' : '发送' }}
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
  border-top: 1px solid #2d2d44;
}

.textarea-wrapper {
  position: relative;
}

.textarea-wrapper textarea {
  width: 100%;
  padding: 14px 80px 14px 20px;
  border-radius: 16px;
  border: 1px solid #3d3d5c;
  background: #1f2937;
  color: #fff;
  font-size: 15px;
  outline: none;
  resize: none;
  transition: border-color 0.2s;
  line-height: 1.5;
  font-family: inherit;
  box-sizing: border-box;
}

.textarea-wrapper textarea::placeholder {
  color: #888;
}

.textarea-wrapper textarea:focus {
  border-color: #3b82f6;
}

.textarea-wrapper textarea:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.textarea-wrapper button {
  position: absolute;
  right: 12px;
  bottom: 12px;
  padding: 8px 16px;
  border-radius: 16px;
  border: none;
  background: #3b82f6;
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.2s;
}

.textarea-wrapper button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>