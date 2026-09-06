<template>
  <div class="no-config-prompt">
    <div class="no-config-icon">⚠️</div>
    <h3>请先配置 AI</h3>
    <p>还没有可用的大模型配置，请前往设置添加</p>
    <button class="go-settings-btn" @click="emit('go-settings')">去设置</button>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  'go-settings': []
}>()
</script>

<style scoped>
.no-config-prompt {
  padding: 32px 24px;
  border-top: 1px solid var(--color-divider);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
}

.no-config-icon {
  font-size: 32px;
  margin-bottom: 4px;
}

.no-config-prompt h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.no-config-prompt p {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin: 0;
}

.go-settings-btn {
  margin-top: 8px;
  padding: 8px 20px;
  border-radius: 8px;
  background: var(--color-accent);
  color: var(--color-text-inverse);
  border: none;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}

.go-settings-btn:hover {
  opacity: 0.9;
}
</style>
