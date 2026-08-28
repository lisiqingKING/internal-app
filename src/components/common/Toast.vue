<template>
  <Teleport to="body">
    <Transition name="toast">
      <div v-if="visible" class="toast" :class="type">
        <span class="toast-icon">{{ type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ' }}</span>
        <span class="toast-message">{{ message }}</span>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'

const visible = ref(false)
const message = ref('')
const type = ref<'success' | 'error' | 'info'>('success')

let timer: ReturnType<typeof setTimeout> | null = null

function show(msg: string, t: 'success' | 'error' | 'info' = 'success', duration = 2000) {
  if (timer) clearTimeout(timer)
  message.value = msg
  type.value = t
  visible.value = true
  timer = setTimeout(() => {
    visible.value = false
  }, duration)
}

onUnmounted(() => {
  if (timer) clearTimeout(timer)
})

defineExpose({ show })
</script>

<style scoped>
.toast {
  position: fixed;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 99999;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.toast.success {
  background: #22c55e;
  color: white;
}

.toast.error {
  background: #ef4444;
  color: white;
}

.toast.info {
  background: #3b82f6;
  color: white;
}

.toast-icon {
  font-size: 16px;
  font-weight: bold;
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-10px);
}
</style>
