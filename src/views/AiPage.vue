<template>
  <AiChat />
</template>

<script setup lang="ts">
import { AiChat } from './ai'

document.title = 'AI 助手'
</script>

<style scoped>
:deep(.ai-chat) {
  height: 100vh;
}
</style>