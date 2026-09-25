<template>
  <div class="ai-settings">
    <div class="section-header">
      <h2>AI 配置</h2>
      <p>支持多套配置切换使用</p>
    </div>

    <div class="settings-layout">
      <AiProfileList
        v-if="profiles.length > 0"
        :profiles="profiles"
        :activeName="activeProfile?.name ?? ''"
        @select="handleSelect"
        @add="handleAdd"
        @delete="handleDelete"
      />

      <AiProfileForm
        v-if="activeProfile || isCreatingNew"
        :profile="editingProfile"
        :isNewProfile="isCreatingNew"
        :selectedCount="selectedPromptIds.length"
        @save="handleSave"
        @openPromptModal="promptModalOpen = true"
      />

      <div v-else class="no-profile">
        <p class="no-profile-title">暂无 AI 配置</p>
        <p class="no-profile-desc">添加配置以开始使用 AI 对话功能</p>
        <button class="no-profile-btn" @click="handleAdd">添加配置</button>
      </div>
    </div>

    <!-- 提示词选择 Modal -->
    <Teleport to="body">
      <div v-if="promptModalOpen" class="modal-overlay" @click.self="promptModalOpen = false">
        <div class="modal-dialog prompt-modal">
          <div class="modal-header">
            <span>选择提示词</span>
            <button class="modal-close" @click="promptModalOpen = false">×</button>
          </div>
          <div class="modal-body">
            <div class="prompt-list">
              <label
                v-for="prompt in availablePrompts"
                :key="prompt.id"
                class="prompt-item"
                :class="{ selected: selectedPromptIds.includes(prompt.id) }"
              >
                <input
                  type="checkbox"
                  :value="prompt.id"
                  v-model="selectedPromptIds"
                  @change="editingProfile.systemPromptIds = [...selectedPromptIds]"
                />
                <div class="prompt-info">
                  <span class="prompt-name">{{ prompt.name }}</span>
                  <span class="prompt-preview">{{ prompt.content.slice(0, 50) }}{{ prompt.content.length > 50 ? '...' : '' }}</span>
                </div>
              </label>
              <div v-if="availablePrompts.length === 0" class="no-prompts">
                暂无提示词，请在下方添加
              </div>
            </div>
            <div class="prompt-editor">
              <input
                v-model="newPromptName"
                class="prompt-input"
                placeholder="新提示词名称"
              />
              <textarea
                v-model="newPromptContent"
                class="prompt-textarea"
                placeholder="提示词内容..."
                rows="4"
              />
              <button
                class="prompt-add-btn"
                :disabled="!newPromptName.trim() || !newPromptContent.trim()"
                @click="addPrompt"
              >添加</button>
            </div>
          </div>
          <div class="modal-footer">
            <button class="modal-btn confirm" @click="promptModalOpen = false">确定</button>
          </div>
        </div>
      </div>
    </Teleport>

    <Toast ref="toastRef" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessageBox } from 'element-plus'
import AiProfileList from './AiProfileList.vue'
import AiProfileForm from './AiProfileForm.vue'
import Toast from '../common/Toast.vue'
import type { AiProfile } from '../../types/ai'

const ai = window.bridge.getModules(['ai']).ai

const profiles = ref<AiProfile[]>([])
const activeProfile = ref<AiProfile | null>(null)
const isCreatingNew = ref(false)
const editingProfile = ref<AiProfile>({
  name: '',
  providerType: 'openai',
  apiKey: '',
  apiUrl: '',
  model: '',
  systemPromptIds: []
})
const toastRef = ref<InstanceType<typeof Toast>>()

const availablePrompts = ref<Array<{ id: string; name: string; content: string }>>([])
const selectedPromptIds = ref<string[]>([])
const promptModalOpen = ref(false)
const newPromptName = ref('')
const newPromptContent = ref('')

onMounted(async () => {
  await loadProfiles()
  await loadActiveProfile()
  await loadPrompts()
})

async function loadProfiles() {
  profiles.value = await ai.listProfiles()
}

async function loadActiveProfile() {
  activeProfile.value = await ai.getActiveProfile()
  if (activeProfile.value) {
    editingProfile.value = { ...activeProfile.value }
    isCreatingNew.value = false
    selectedPromptIds.value = activeProfile.value.systemPromptIds || []
  }
}

async function loadPrompts() {
  availablePrompts.value = await ai.listSystemPrompts()
}

async function handleSelect(name: string) {
  const profile = profiles.value.find(p => p.name === name)
  if (!profile) return
  activeProfile.value = profile
  editingProfile.value = { ...profile }
  isCreatingNew.value = false
  selectedPromptIds.value = profile.systemPromptIds || []
}

function handleAdd() {
  activeProfile.value = null
  isCreatingNew.value = true
  editingProfile.value = {
    name: '',
    providerType: 'openai',
    apiKey: '',
    apiUrl: '',
    model: '',
    systemPromptIds: []
  }
  selectedPromptIds.value = []
}

async function handleDelete(name: string) {
  try {
    await ElMessageBox.confirm(`确定要删除配置「${name}」吗？`, '确认删除', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }
  try {
    await ai.deleteProfile(name)
  } catch (e: any) {
    showStatus(e.message || '删除失败', 'error')
    return
  }
  await loadProfiles()
  if (activeProfile.value?.name === name) {
    await loadActiveProfile()
  }
}

async function handleSave(profile: AiProfile) {
  const toSave = JSON.parse(JSON.stringify({
    ...profile,
    providerType: profile.providerType || 'openai',
    systemPromptIds: profile.systemPromptIds ?? [],
  }))
  try {
    await ai.saveProfile(toSave)
    await ai.setActiveProfile(toSave.name)
    activeProfile.value = { ...toSave }
    isCreatingNew.value = false
    await loadProfiles()
    showStatus('保存成功', 'success')
  } catch (e: any) {
    showStatus(e.message || '保存失败', 'error')
  }
}

async function addPrompt() {
  if (!newPromptName.value.trim() || !newPromptContent.value.trim()) return
  try {
    await ai.saveSystemPrompt({
      name: newPromptName.value.trim(),
      content: newPromptContent.value.trim(),
    })
    await loadPrompts()
    newPromptName.value = ''
    newPromptContent.value = ''
    showStatus('添加成功', 'success')
  } catch (e: any) {
    showStatus(e.message || '添加失败', 'error')
  }
}

function showStatus(msg: string, type: 'success' | 'error') {
  toastRef.value?.show(msg, type)
}
</script>

<style lang="scss" scoped>
.ai-settings {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 32px;
  max-width: 800px;
}

.section-header {
  padding-bottom: 4px;

}

.section-header h2 {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 4px;
}

.section-header p {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  margin: 0;
}

.settings-layout {
  flex: 1;
  display: flex;
  overflow: hidden;
  gap: 12px;
  min-height: 0;
}

.settings-layout > :first-child {
  width: 220px;
  flex-shrink: 0;
  background: var(--color-surface);
  border-radius: 10px;
  border: 1px solid var(--color-border);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.settings-layout > :last-child:not(.no-selection) {
  flex: 1;
  min-width: 0;
}

.no-profile {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: var(--color-text-secondary);
  font-size: 14px;
}

.no-profile-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.no-profile-desc {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.no-profile-btn {
  margin-top: 12px;
  padding: 8px 20px;
  border-radius: 8px;
  border: none;
  background: var(--color-accent);
  color: var(--color-text-inverse);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.2s;
}

.no-profile-btn:hover {
  opacity: 0.9;
}

/* 提示词 Modal */
.prompt-modal {
  width: 560px;
  max-width: 90vw;
  background: var(--card-bg);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 12px;
  border: 1px solid var(--card-border);
  overflow: hidden;
}

.prompt-modal .modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;

}

.prompt-modal .modal-header span {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.modal-close {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-close:hover {
  background: var(--color-surface);
}

.prompt-modal .modal-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 60vh;
  overflow-y: auto;
  padding: 16px 20px;
}

.prompt-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.prompt-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
}

.prompt-item:hover {
  background: var(--color-surface);
}

.prompt-item.selected {
  background: rgba(16, 185, 129, 0.08);
}

.prompt-item input[type="checkbox"] {
  margin-top: 2px;
  flex-shrink: 0;
  cursor: pointer;
}

.prompt-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
}

.prompt-name {
  font-size: 13px;
  color: var(--color-text-primary);
  font-weight: 500;
}

.prompt-preview {
  font-size: 11px;
  color: var(--color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 280px;
}

.no-prompts {
  padding: 20px;
  text-align: center;
  color: var(--color-text-secondary);
  font-size: 13px;
}

.prompt-editor {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 12px;
  border-top: 1px solid var(--color-divider);
}

.prompt-input {
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid var(--color-border);
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  font-size: 13px;
  outline: none;
  width: 100%;
  box-sizing: border-box;
  max-width: 100%;
}

.prompt-input:focus {
  border-color: var(--color-accent);
}

.prompt-textarea {
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid var(--color-border);
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  font-size: 13px;
  resize: vertical;
  font-family: inherit;
  outline: none;
  width: 100%;
  box-sizing: border-box;
  max-width: 100%;
}

.prompt-textarea:focus {
  border-color: var(--color-accent);
}

.prompt-add-btn {
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  background: var(--color-accent);
  color: var(--color-text-inverse);
  font-size: 13px;
  cursor: pointer;
  align-self: flex-end;
  transition: opacity 0.15s;
}

.prompt-add-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.prompt-add-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.prompt-modal .modal-footer {
  padding: 12px 20px;
  border-top: 1px solid var(--color-divider);
  display: flex;
  justify-content: flex-end;
}

.modal-btn {
  padding: 7px 18px;
  border-radius: 6px;
  border: none;
  background: var(--color-accent);
  color: var(--color-text-inverse);
  font-size: 13px;
  cursor: pointer;
  transition: opacity 0.15s;
}

.modal-btn:hover {
  opacity: 0.9;
}
</style>
