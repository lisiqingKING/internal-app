<template>
  <div class="about-settings">
    <div class="section-header">
      <h2>关于</h2>
      <p>应用信息</p>
    </div>

    <div class="about-card">
      <div class="about-logo">
        <svg viewBox="0 0 24 24" width="40" height="40" fill="none">
          <defs>
            <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:var(--color-accent)" />
              <stop offset="100%" style="stop-color:#6ee7b7" />
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
  </div>
</template>

<script setup lang="ts">
</script>

<style lang="scss" scoped>
.about-settings {
  display: flex;
  flex-direction: column;
  gap: 32px;
  max-width: 560px;
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

.about-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
}

.about-logo {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-primary);
  border-radius: 14px;
  flex-shrink: 0;
}

.about-info h3 {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 4px;
}

.about-info p {
  font-size: 0.82rem;
  color: var(--color-text-secondary);
  margin: 0 0 10px;
}

.about-version {
  font-size: 0.72rem;
  color: var(--color-text-tertiary);
  background: var(--color-bg-primary);
  padding: 3px 8px;
  border-radius: 4px;
}
</style>
