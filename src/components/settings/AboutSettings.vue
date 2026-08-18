<template>
  <div class="content-header">
    <h2>关于</h2>
    <p>应用信息</p>
  </div>

  <div class="about-card">
    <div class="about-logo">
      <svg viewBox="0 0 24 24" width="48" height="48" fill="none">
        <defs>
          <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:var(--color-accent)" />
            <stop offset="100%" style="stop-color:var(--color-indigo-400)" />
          </linearGradient>
        </defs>
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="url(#logo-grad)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
    <div class="about-info">
      <h3>lsqapp</h3>
      <p>Electron + Vite + Vue 3 桌面浏览器</p>
      <span class="about-version">版本 1.0.0</span>
    </div>
  </div>
</template>

<script setup lang="ts">
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

.about-card {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 24px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 12px;
  max-width: 400px;
}

.about-logo {
  width: 72px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--card-hover-bg);
  border-radius: 16px;
  flex-shrink: 0;
}

.about-info h3 {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 4px;
}

.about-info p {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  margin: 0 0 8px;
}

.about-version {
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
  background: var(--card-hover-bg);
  padding: 3px 8px;
  border-radius: 4px;
}
</style>
