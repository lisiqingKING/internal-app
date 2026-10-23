<template>
  <div class="profile-list">
    <div class="list-header">
      <span class="list-title">配置列表</span>
      <button class="add-btn" @click="$emit('add')" title="新建配置">
        <Plus :size="16" />
      </button>
    </div>

    <div class="list-items">
      <div
        v-for="profile in profiles"
        :key="profile.name"
        class="profile-item"
        :class="{ active: profile.name === activeName }"
        @click="$emit('select', profile.name)"
      >
        <div class="profile-info">
          <span class="profile-name">{{ profile.name }}</span>
          <span class="profile-meta">{{ formatProvider(profile.providerType) }} · {{ profile.model || '未设置模型' }}</span>
        </div>
        <button
          class="delete-btn"
          title="删除"
          @click="$emit('delete', profile.name)"
        >
          <Trash2 :size="14" />
        </button>
        <span v-if="profile.name === activeName" class="active-badge">使用中</span>
      </div>

      <div v-if="profiles.length === 0" class="empty-hint">
        暂无配置，点击 + 新建
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Plus, Trash2 } from 'lucide-vue-next'
import type { AiProfile } from '../../types/ai'

defineProps<{
  profiles: AiProfile[]
  activeName: string
}>()

defineEmits<{
  select: [name: string]
  add: []
  delete: [name: string]
}>()

function formatProvider(type: string): string {
  return type === 'anthropic' ? 'Claude' : 'OpenAI'
}
</script>

<style lang="scss" scoped>
.profile-list {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;

}

.list-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.add-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, color 0.15s;
}

.add-btn:hover {
  background: var(--color-surface);
  color: var(--color-accent);
}

.list-items {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.profile-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 4px;
  transition: background 0.15s;
  gap: 6px;
}

.profile-item:hover {
  background: var(--color-surface);
}

.profile-item.active {
  background: rgba(16, 185, 129, 0.08);
}

.profile-item.active .profile-name {
  color: var(--color-accent);
  font-weight: 500;
}

.profile-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
  min-width: 0;
}

.profile-name {
  font-size: 14px;
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-meta {
  font-size: 11px;
  color: var(--color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.delete-btn {
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 1;
  pointer-events: auto;
  transition: opacity 0.15s, background 0.15s, color 0.15s;
  flex-shrink: 0;
}

.profile-item:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.active-badge {
  font-size: 11px;
  color: var(--color-accent);
  background: rgba(16, 185, 129, 0.12);
  padding: 2px 8px;
  border-radius: 10px;
  flex-shrink: 0;
}

.empty-hint {
  padding: 24px 12px;
  text-align: center;
  font-size: 13px;
  color: var(--color-text-secondary);
}
</style>
