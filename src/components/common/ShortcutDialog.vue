<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'saved'): void
}>()

const shortcutsMod = window.bridge.getModules(['shortcuts']).shortcuts

const name = ref('')
const url = ref('')
const error = ref('')
const submitting = ref(false)

watch(
  () => props.visible,
  (visible) => {
    if (!visible) return
    name.value = ''
    url.value = ''
    error.value = ''
  }
)

function close() {
  emit('update:visible', false)
}

/**
 * ipcRenderer.invoke 会把主进程抛出的 Error 再包一层，
 * 原始文案被埋在 "Error invoking remote method 'xxx': Error: " 后面。
 */
function extractError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err)
  return raw.replace(/^Error invoking remote method '[^']*':\s*(Error:\s*)?/, '') || '添加失败'
}

/**
 * 前置粗筛：拦掉明显不是网址的输入，不用等 IPC 往返。
 * 规则与主进程 isValidHostname 对齐，但主进程才是权威 —— 这里漏了它也会兜住。
 */
function looksLikeUrl(input: string): boolean {
  const value = input.trim()
  if (!value) return false

  const withoutProtocol = value.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//, '')
  const host = withoutProtocol.split(/[/?#]/)[0].split(':')[0]
  if (!host) return false
  if (host === 'localhost') return true
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true
  return host.includes('.')
}

/** 显式协议不是 http/https 就直接拒 —— file:// 这类输入再像网址也是打不开的 */
function hasUnsupportedProtocol(input: string): boolean {
  const match = input.trim().match(/^([a-zA-Z][a-zA-Z0-9+.-]*):\/\//)
  return !!match && !/^https?$/i.test(match[1])
}

async function submit() {
  if (submitting.value) return
  const target = url.value.trim()
  if (!target) {
    error.value = '请输入网址'
    return
  }
  if (hasUnsupportedProtocol(target)) {
    error.value = '仅支持 http/https 网址'
    return
  }
  if (!looksLikeUrl(target)) {
    error.value = '网址格式不正确，请输入完整网址（如 example.com）'
    return
  }

  submitting.value = true
  error.value = ''
  try {
    await shortcutsMod.add({ name: name.value.trim(), url: target })
    emit('saved')
    close()
  } catch (err) {
    error.value = extractError(err)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="dialog-mask" @click.self="close">
      <div class="dialog">
        <h3 class="dialog-title">添加快捷方式</h3>

        <label class="field">
          <span class="field-label">名称</span>
          <input
            v-model="name"
            class="field-input"
            type="text"
            placeholder="留空则用网址"
            maxlength="32"
            @keyup.enter="submit"
          />
        </label>

        <label class="field">
          <span class="field-label">网址</span>
          <input
            v-model="url"
            class="field-input"
            type="text"
            placeholder="https://example.com"
            maxlength="2048"
            @keyup.enter="submit"
          />
        </label>

        <p v-if="error" class="dialog-error">{{ error }}</p>

        <div class="dialog-actions">
          <button class="dialog-btn" @click="close">取消</button>
          <button class="dialog-btn primary" :disabled="submitting" @click="submit">
            {{ submitting ? '添加中...' : '添加' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.dialog-mask {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--modal-overlay);
  z-index: 1000;
}

.dialog {
  width: 360px;
  padding: 24px;
  border-radius: 12px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  backdrop-filter: blur(20px);
  box-sizing: border-box;
}

.dialog-title {
  margin: 0 0 20px;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.field {
  display: block;
  margin-bottom: 16px;
}

.field-label {
  display: block;
  margin-bottom: 6px;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.field-input {
  width: 100%;
  height: 38px;
  padding: 0 12px;
  border-radius: var(--radius-md, 8px);
  border: 1px solid var(--input-border);
  background: var(--input-bg);
  color: var(--color-text-primary);
  font-size: 14px;
  outline: none;
  box-sizing: border-box;
}

.field-input:focus {
  border-color: var(--input-border-focus);
}

.field-input::placeholder {
  color: var(--color-text-tertiary);
}

.dialog-error {
  margin: -4px 0 12px;
  font-size: 12px;
  color: #e5484d;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.dialog-btn {
  height: 34px;
  padding: 0 16px;
  border: none;
  border-radius: var(--radius-md, 8px);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 13px;
  cursor: pointer;
}

.dialog-btn:hover {
  background: var(--card-hover-bg);
}

.dialog-btn.primary {
  background: var(--btn-primary-bg);
  color: var(--btn-primary-text);
}

.dialog-btn.primary:disabled {
  opacity: 0.6;
  cursor: default;
}
</style>
