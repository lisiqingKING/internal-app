<template>
  <div class="content-header">
    <h2>AI 配置</h2>
    <p>配置大模型接口</p>
  </div>

  <div class="form-section">
    <div class="form-item">
      <label>Provider</label>
      <select v-model="aiForm.providerType">
        <option value="openai">OpenAI 兼容</option>
        <option value="anthropic">Anthropic Claude</option>
      </select>
    </div>
    <div class="form-item">
      <label>API Key</label>
      <div class="input-with-toggle">
        <input v-model="aiForm.apiKey" :type="showApiKey ? 'text' : 'password'" placeholder="请输入你的 API Key" />
        <button class="toggle-visibility" @click="showApiKey = !showApiKey" type="button">
          <svg v-if="showApiKey" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
          </svg>
          <svg v-else viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
          </svg>
        </button>
      </div>
    </div>
    <div class="form-item">
      <label>API URL</label>
      <input v-model="aiForm.apiUrl" placeholder="https://token-plan-cn.xiaomimimo.com/v1" />
    </div>
    <div class="form-item">
      <label>Model</label>
      <input v-model="aiForm.model" placeholder="mimo-v2.5-pro" />
    </div>
    <button class="save-btn" @click="saveAiConfig">
      {{ aiSaved ? '已保存' : '保存' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const settings = window.bridge.getModules(['settings']).settings

const aiForm = ref({
  providerType: 'openai',
  apiKey: '',
  apiUrl: '',
  model: ''
})
const aiSaved = ref(false)
const showApiKey = ref(false)

onMounted(async () => {
  aiForm.value.providerType = await settings.get('ai_provider_type') || 'openai'
  aiForm.value.apiKey = await settings.get('ai_api_key') || 'tp-c2c397g9aktqbph1cpe4n9ejroyi6oaqjmeeowaflb22572n'
  aiForm.value.apiUrl = await settings.get('ai_api_url') || 'https://token-plan-cn.xiaomimimo.com/v1'
  aiForm.value.model = await settings.get('ai_model') || 'mimo-v2.5-pro'
})

async function saveAiConfig() {
  await settings.set('ai_provider_type', aiForm.value.providerType)
  await settings.set('ai_api_key', aiForm.value.apiKey)
  await settings.set('ai_api_url', aiForm.value.apiUrl)
  await settings.set('ai_model', aiForm.value.model)
  aiSaved.value = true
  setTimeout(() => aiSaved.value = false, 2000)
}
</script>

<style scoped>
.content-header {
  margin-bottom: 28px;
}

.content-header h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 6px;
}

.content-header p {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  margin: 0;
}

.form-section {
  max-width: 480px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-item label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.form-item input {
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid var(--input-border);
  background: var(--input-bg);
  color: var(--input-text);
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.2s;
}

.form-item input:focus {
  border-color: var(--color-accent);
}

.form-item input::placeholder {
  color: var(--input-placeholder);
}

.form-item select {
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid var(--input-border);
  background: var(--input-bg);
  color: var(--input-text);
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.2s;
  cursor: pointer;
}

.form-item select:focus {
  border-color: var(--color-accent);
}

.input-with-toggle {
  position: relative;
  display: flex;
  align-items: center;
}

.input-with-toggle input {
  flex: 1;
  padding-right: 40px;
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

.save-btn {
  padding: 10px 24px;
  border-radius: 8px;
  border: none;
  background: var(--color-accent);
  color: var(--color-text-inverse);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
  align-self: flex-start;
}

.save-btn:hover {
  opacity: 0.9;
}
</style>
