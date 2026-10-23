<template>
  <div class="tv-placeholder">
    <div class="tv-bars" aria-hidden="true">
      <div class="tv-bars-main"></div>
      <div class="tv-bars-mid"></div>
      <div class="tv-bars-bottom"></div>
      <div class="tv-scanlines"></div>
    </div>
    <div class="tv-message">
      <span v-if="caption" class="tv-caption">{{ caption }}</span>
      <h2>{{ title }}</h2>
      <p v-if="text">{{ text }}</p>
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  title: string
  text?: string
  caption?: string
}>(), {
  text: '',
  caption: 'Нет сигнала'
})
</script>

<style scoped>
.tv-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.tv-bars {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  filter: saturate(0.9) contrast(1.05);
}

.tv-bars-main {
  flex: 0 0 62%;
  background: linear-gradient(
    90deg,
    var(--text-primary) 0 14.285%,
    var(--color-success) 14.285% 28.571%,
    var(--text-secondary) 28.571% 42.857%,
    var(--color-primary-soft) 42.857% 57.143%,
    var(--color-danger) 57.143% 71.429%,
    var(--text-muted) 71.429% 85.714%,
    var(--bg-surface) 85.714% 100%
  );
}

.tv-bars-mid {
  flex: 0 0 10%;
  background: linear-gradient(
    90deg,
    var(--accent-dark) 0 14.285%,
    var(--color-primary-soft) 14.285% 28.571%,
    var(--text-muted) 28.571% 42.857%,
    var(--accent-dark) 42.857% 57.143%,
    var(--text-secondary) 57.143% 71.429%,
    var(--color-primary-soft) 71.429% 85.714%,
    var(--text-primary) 85.714% 100%
  );
}

.tv-bars-bottom {
  flex: 1;
  background: linear-gradient(
    90deg,
    var(--accent-dark) 0 12.5%,
    var(--text-primary) 12.5% 25%,
    var(--color-primary-soft) 25% 37.5%,
    var(--bg-main) 37.5% 50%,
    var(--accent-dark) 50% 62.5%,
    var(--bg-main) 62.5% 75%,
    var(--color-primary-soft) 75% 87.5%,
    var(--accent-dark) 87.5% 100%
  );
}

.tv-scanlines {
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    to bottom,
    rgba(10, 10, 10, 0.2) 0 1px,
    transparent 1px 3px
  );
  mix-blend-mode: multiply;
  opacity: 0.4;
  pointer-events: none;
}

.tv-scanlines::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at center, transparent 45%, var(--vignette-color) 100%);
}

.tv-message {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  max-width: min(90%, 480px);
  padding: 1.5rem 1.75rem;
  border: 1px solid var(--overlay-divider);
  border-radius: 12px;
  background: var(--overlay-panel);
  color: var(--text-primary);
  text-align: center;
  box-shadow: var(--shadow-strong);
  backdrop-filter: blur(6px);
}

.tv-caption {
  color: var(--text-secondary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.75rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
}

.tv-message h2 {
  margin: 0;
  font-size: clamp(1.25rem, 3vw, 1.8rem);
}

.tv-message p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.92rem;
  line-height: 1.45;
}
</style>
