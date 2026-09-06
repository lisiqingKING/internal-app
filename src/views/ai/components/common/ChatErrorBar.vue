<template>
  <div class="error-bar">
    <span class="error-icon">!</span>
    <span class="error-text">{{ message }}</span>
    <button class="retry-btn" @click="emit('retry')">重试</button>
    <button class="dismiss-btn" @click="emit('dismiss')">×</button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  message: string
}>()

const emit = defineEmits<{
  retry: []
  dismiss: []
}>()
</script>

<style scoped>
.error-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  background: rgba(239, 68, 68, 0.1);
  border-top: 1px solid rgba(239, 68, 68, 0.2);
}

.error-icon {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ef4444;
  color: white;
  border-radius: 50%;
  font-size: 12px;
  font-weight: bold;
  flex-shrink: 0;
}

.error-text {
  flex: 1;
  font-size: 14px;
  color: #ef4444;
}

.retry-btn {
  padding: 6px 14px;
  border-radius: 6px;
  border: 1px solid #ef4444;
  background: transparent;
  color: #ef4444;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.retry-btn:hover {
  background: #ef4444;
  color: white;
}

.dismiss-btn {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 16px;
  cursor: pointer;
  transition: background 0.2s;
}

.dismiss-btn:hover {
  background: rgba(0, 0, 0, 0.1);
}
</style>
