<template>
  <div class="error-page">
    <div class="error-container">
      <h1 class="error-title">无法访问此网站</h1>
      <p class="error-message">{{ errorMessage }}</p>
      <button class="btn" @click="retry">重新加载</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'

document.title = '无法访问此网站'

const route = useRoute()
const failedUrl = ref('')
const errorCode = ref('')
const errorMessage = ref('')

const errorMessages: Record<string, string> = {
  'ERR_NAME_NOT_RESOLVED': '无法解析服务器的 DNS 地址',
  'ERR_CONNECTION_REFUSED': '拒绝连接',
  'ERR_CONNECTION_TIMED_OUT': '连接超时',
  'ERR_CONNECTION_RESET': '连接被重置',
  'ERR_NETWORK_CHANGED': '网络连接已更改',
  'ERR_INTERNET_DISCONNECTED': '未连接到互联网',
  'ERR_SSL_PROTOCOL_ERROR': 'SSL 协议错误',
  'ERR_CERT_DATE_INVALID': '服务器证书已过期',
  'ERR_CERT_AUTHORITY_INVALID': '服务器证书不受信任',
  'ERR_FILE_NOT_FOUND': '找不到该文件',
  'ERR_FILE_ACCESS_DENIED': '无法访问该文件',
  'ERR_ABORTED': '操作已中止',
}

function updateErrorInfo() {
  const params = new URLSearchParams(route.fullPath.split('?')[1] || '')
  failedUrl.value = params.get('url') || ''
  errorCode.value = params.get('code') || ''
  const errorKey = params.get('error') || ''
  errorMessage.value = errorMessages[errorKey] || errorKey || '连接超时或网站无法响应'
}

onMounted(updateErrorInfo)

// 监听路由参数变化，后退/前进时更新数据
watch(() => route.fullPath, updateErrorInfo)

function retry() {
  window.bridge.getModules(['tabs']).tabs.refresh()
}

function goHome() {
  window.bridge.getModules(['tabs']).tabs.create({ title: '首页', url: 'lsqapp://internal-app' })
}
</script>

<style scoped>
.error-page {
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: var(--page-bg);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.error-container {
  text-align: center;
}

.error-title {
  font-size: 1rem;
  font-weight: 500;
  margin: 0 0 8px;
  color: var(--color-text-primary);
}

.error-message {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  margin: 0 0 16px;
}

.btn {
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 0.8125rem;
  cursor: pointer;
  border: 1px solid var(--card-border, rgba(0, 0, 0, 0.1));
  background: var(--card-bg);
  color: var(--color-text-primary);
}

.btn:hover {
  background: var(--card-hover-bg);
}
</style>
