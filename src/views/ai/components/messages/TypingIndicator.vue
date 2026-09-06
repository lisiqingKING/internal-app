<template>
  <div class="message-bubble assistant">
    <div class="bubble-content">
      <div class="thinking-dots">
        <span></span><span></span><span></span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.message-bubble {
  display: flex;
  padding: 3px 0;
}

.message-bubble.assistant {
  justify-content: flex-start;
}

.bubble-content {
  max-width: 78%;
  padding: 10px 16px;
  border-radius: 12px;
  font-size: 15px;
  line-height: 1.65;
  background: var(--color-bg-primary);
  border-bottom-left-radius: 4px;
}

.thinking-dots {
  display: inline-flex;
  gap: 6px;
  padding: 4px 0;
  align-items: center;
}

.thinking-dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-accent);
  animation: thinkingPulse 1.2s ease-in-out infinite;
}

.thinking-dots span:nth-child(1) { animation-delay: 0ms; }
.thinking-dots span:nth-child(2) { animation-delay: 150ms; }
.thinking-dots span:nth-child(3) { animation-delay: 300ms; }

@keyframes thinkingPulse {
  0%, 100% {
    transform: scale(0.6);
    opacity: 0.3;
  }
  50% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
