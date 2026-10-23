<template>
  <div class="no-config-prompt">
    <div class="no-config-icon">
      <TriangleAlert :size="22" :stroke-width="1.5" />
    </div>
    <h3>未配置大模型</h3>
    <p>请先在设置中添加 AI 配置</p>
    <button class="go-settings-btn" @click="emit('go-settings')">
      <Settings :size="14" />
      去设置
    </button>
  </div>
</template>

<script setup lang="ts">
import { Settings, TriangleAlert } from 'lucide-vue-next'

const emit = defineEmits<{
  'go-settings': []
}>()
</script>

<style scoped>
.no-config-prompt {
  padding: 24px 20px;
  border-top: 1px solid var(--color-divider);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  text-align: center;
}

.no-config-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(251, 191, 36, 0.12);
  color: #fbbf24;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
}

.no-config-prompt h3 {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.no-config-prompt p {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin: 0;
}

.go-settings-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding: 7px 16px;
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
  opacity: 0.88;
}
</style>
