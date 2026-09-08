<template>
  <ChatInput
    :model-value="inputText"
    :disabled="disabled"
    :loading="loading"
    @update:model-value="emit('update:inputText', $event)"
    @send="emit('send')"
    @cancel="emit('cancel')"
    @retry="emit('retry')"
    @dismiss-error="emit('dismiss-error')"
    @go-settings="emit('go-settings')"
  />
</template>

<script setup lang="ts">
import ChatInput from './input/ChatInput.vue'

defineProps<{
  inputText: string
  loading: boolean
  disabled: boolean
  error: string | null
  noConfig: boolean
}>()

const emit = defineEmits<{
  'update:inputText': [value: string]
  send: []
  cancel: []
  retry: []
  'dismiss-error': []
  'go-settings': []
}>()
</script>
