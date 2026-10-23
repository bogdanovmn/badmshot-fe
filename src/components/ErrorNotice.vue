<template>
  <div class="error-notice" role="alert">
    <span class="icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
           stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="9" />
        <line x1="12" y1="8" x2="12" y2="13" />
        <line x1="12" y1="16.5" x2="12" y2="16.6" />
      </svg>
    </span>
    <p class="message">{{ message }}</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{ message: string }>()
</script>

<style scoped>
.error-notice {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  padding: 0.8rem 0.95rem;
  border: 1px solid var(--color-danger);
  border-left-width: 3px;
  border-radius: 8px;
  background: var(--color-danger-soft);
  color: var(--text-primary);
  text-align: left;
}

.icon {
  flex: 0 0 auto;
  width: 20px;
  height: 20px;
  margin-top: 1px;
  color: var(--color-danger);
}

.icon svg {
  width: 100%;
  height: 100%;
}

.message {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.45;
  overflow-wrap: anywhere;
  white-space: pre-line;
}
</style>
