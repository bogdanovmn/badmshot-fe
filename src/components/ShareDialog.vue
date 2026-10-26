<template>
  <Teleport to="body">
    <div class="backdrop" @click.self="emit('close')">
      <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="share-title">
        <header class="dialog-header">
          <div>
            <h2 id="share-title">Поделиться кадром</h2>
            <p class="dialog-subtitle">Ссылка откроет только этот кадр, остальной архив останется закрытым.</p>
          </div>
          <button class="close-btn" type="button" aria-label="Закрыть" @click="emit('close')">×</button>
        </header>

        <div class="dialog-body">
          <div v-if="loading" class="state">Создаём ссылку...</div>
          <div v-else-if="error" class="state state--error">{{ error }}</div>
          <template v-else>
            <label class="field-label" for="share-link">Ссылка</label>
            <div class="link-row">
              <input id="share-link" ref="linkInput" class="link-input" type="text" :value="link" readonly />
              <button class="btn-primary" type="button" @click="copy">{{ copied ? 'Скопировано' : 'Копировать' }}</button>
            </div>
            <p class="hint">
              При переходе по ссылке кадр увидят все. Просмотры по ссылке учитываются отдельно.
            </p>
          </template>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { createScreenshotShare, getErrorMessage } from '@/api'

const props = defineProps<{ screenshotId: string }>()

const emit = defineEmits<{ close: [] }>()

const router = useRouter()
const token = ref<string | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const copied = ref(false)
const linkInput = ref<HTMLInputElement | null>(null)

const link = computed(() => {
  if (!token.value) {
    return ''
  }
  return new URL(
    router.resolve({ name: 'share', params: { token: token.value } }).href,
    window.location.origin
  ).toString()
})

async function create() {
  loading.value = true
  error.value = null
  try {
    const share = await createScreenshotShare(props.screenshotId)
    token.value = share.token
  } catch (e) {
    error.value = getErrorMessage(e, 'Не удалось создать ссылку')
  } finally {
    loading.value = false
  }
}

async function copy() {
  if (!link.value) {
    return
  }
  try {
    await navigator.clipboard.writeText(link.value)
    copied.value = true
  } catch {
    linkInput.value?.select()
  }
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    emit('close')
  }
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
  document.body.style.overflow = 'hidden'
  void create()
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 1100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: var(--overlay-backdrop);
  backdrop-filter: blur(3px);
}

.dialog {
  display: flex;
  flex-direction: column;
  width: min(540px, 100%);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  background: var(--color-surface);
  box-shadow: var(--shadow-strong);
  overflow: hidden;
}

.dialog-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--color-border);
}

.dialog-header h2 {
  font-size: 1.1rem;
}

.dialog-subtitle {
  margin-top: 0.15rem;
  color: var(--text-secondary);
  font-size: 0.8rem;
}

.close-btn {
  flex: 0 0 auto;
  width: 36px;
  height: 36px;
  border: 1px solid var(--color-border);
  border-radius: 50%;
  background: transparent;
  color: var(--text-primary);
  font-size: 1.4rem;
  line-height: 1;
  cursor: pointer;
}

.close-btn:hover {
  background: var(--text-primary);
  color: var(--accent-dark);
}

.dialog-body {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1.25rem;
}

.state {
  padding: 1rem 0;
  color: var(--text-secondary);
  text-align: center;
  font-size: 0.9rem;
}

.state--error {
  color: var(--color-danger);
}

.field-label {
  color: var(--text-secondary);
  font-size: 0.8rem;
}

.link-row {
  display: flex;
  gap: 0.5rem;
}

.link-input {
  flex: 1;
  min-width: 0;
  min-height: 42px;
  padding: 0.45rem 0.7rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg);
  color: var(--text-primary);
  font-size: 0.85rem;
}

.link-input:focus {
  outline: 2px solid var(--text-muted);
  border-color: var(--text-secondary);
}

.btn-primary {
  flex: 0 0 auto;
  min-height: 42px;
  padding: 0.4rem 1rem;
  border: 1px solid var(--btn-primary-bg);
  border-radius: 6px;
  background: var(--btn-primary-bg);
  color: var(--btn-primary-text);
  font-weight: 600;
  cursor: pointer;
}

.btn-primary:hover {
  border-color: var(--btn-primary-bg-hover);
  background: var(--btn-primary-bg-hover);
  color: var(--btn-primary-text-hover);
}

.hint {
  color: var(--text-secondary);
  font-size: 0.78rem;
  line-height: 1.4;
}

@media (max-width: 479px) {
  .link-row {
    flex-direction: column;
  }
}
</style>
