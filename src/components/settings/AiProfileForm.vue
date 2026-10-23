<template>
  <div class="profile-form">
    <div class="form-header">
      <input
        v-if="isNewProfile"
        v-model="profile.name"
        class="name-input"
        placeholder="配置名称，如：工作助手"
        maxlength="30"
      />
      <h3 v-else class="form-title">{{ profile.name }}</h3>
      <span v-if="isNewProfile" class="mode-hint new">新建配置</span>
      <span v-else class="mode-hint edit">编辑中</span>
    </div>

    <div class="form-body">
      <!-- 名称（仅编辑状态显示） -->
      <div v-if="!isNewProfile" class="form-item">
        <label>名称</label>
        <input v-model="profile.name" placeholder="配置名称" maxlength="30" />
      </div>

      <!-- Provider -->
      <div class="form-item">
        <label>Provider</label>
        <select v-model="profile.providerType">
          <option value="openai">OpenAI 兼容</option>
          <option value="anthropic">Anthropic Claude</option>
        </select>
      </div>

      <!-- API Key -->
      <div class="form-item">
        <label>API Key</label>
        <div class="input-with-toggle">
          <input
            v-model="profile.apiKey"
            :type="showKey ? 'text' : 'password'"
            placeholder="请输入 API Key"
          />
          <button class="toggle-visibility" @click="showKey = !showKey" type="button">
            <EyeOff v-if="showKey" :size="18" />
            <Eye v-else :size="18" />
          </button>
        </div>
      </div>

      <!-- API URL -->
      <div class="form-item">
        <label>API URL</label>
        <input v-model="profile.apiUrl" placeholder="https://api.example.com/v1" />
      </div>

      <!-- Model -->
      <div class="form-item">
        <label>Model</label>
        <input v-model="profile.model" placeholder="mimo-v2.5-pro" />
      </div>

      <!-- 关联提示词 -->
      <div class="form-item">
        <label>提示词</label>
        <button class="prompt-selector-btn" @click="$emit('openPromptModal')">
          {{ selectedCount > 0 ? `已选 ${selectedCount} 个` : '未选择' }}
        </button>
      </div>

      <!-- 操作按钮 -->
      <div class="form-actions">
        <button
          class="save-btn"
          :disabled="!canApply"
          @click="$emit('save', { ...props.profile })"
        >
          保存
        </button>
      </div>
      <div class="form-hint">保存后，新建会话将使用新配置</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Eye, EyeOff } from 'lucide-vue-next'
import type { AiProfile } from '../../types/ai'

const props = defineProps<{
  profile: AiProfile
  isNewProfile: boolean
  selectedCount: number
}>()

defineEmits<{
  save: [profile: AiProfile]
  openPromptModal: []
}>()

const showKey = ref(false)

const canApply = computed(() => {
  return (
    props.profile.name.trim().length > 0 &&
    props.profile.apiKey.trim().length > 0 &&
    props.profile.apiUrl.trim().length > 0 &&
    props.profile.model.trim().length > 0
  )
})
</script>

<style lang="scss" scoped>
.profile-form {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-width: 560px;
}

.form-header {
  padding: 16px 20px;

  display: flex;
  align-items: center;
  gap: 12px;
}

.form-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.name-input {
  flex: 1;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--input-border);
  background: var(--input-bg);
  color: var(--input-text);
  font-size: 15px;
  font-weight: 600;
  outline: none;
}

.name-input:focus {
  border-color: var(--color-accent);
}

.mode-hint {
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 10px;
}

.mode-hint.new {
  color: var(--color-text-secondary);
  background: var(--color-surface);
}

.mode-hint.edit {
  color: var(--color-accent);
  background: rgba(16, 185, 129, 0.1);
}

.form-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-item label {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
  display: flex;
  align-items: center;
  gap: 6px;
}

.form-item input,
.form-item select {
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid var(--input-border);
  background: var(--input-bg);
  color: var(--input-text);
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.form-item input:focus,
.form-item select:focus {
  border-color: var(--color-accent);
}

.form-item input::placeholder {
  color: var(--input-placeholder);
}

.form-item select {
  cursor: pointer;
}

.input-with-toggle {
  position: relative;
  display: flex;
  align-items: center;
}

.input-with-toggle input {
  flex: 1;
  padding-right: 42px;
}

.toggle-visibility {
  position: absolute;
  right: 10px;
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.toggle-visibility:hover {
  color: var(--color-text-primary);
}

.prompt-selector-btn {
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s;
}

.prompt-selector-btn:hover {
  border-color: var(--color-accent);
}

.form-actions {
  display: flex;
  gap: 12px;
  padding-top: 4px;
}

.save-btn {
  flex: 1;
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s, background 0.2s;
  background: var(--color-accent);
  color: var(--color-text-inverse);
  border: none;
}

.save-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.save-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.form-hint {
  font-size: 11px;
  color: var(--color-text-secondary);
  text-align: center;
  margin-top: 6px;
}
</style>
