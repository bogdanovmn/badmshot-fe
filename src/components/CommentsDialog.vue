<template>
  <Teleport to="body">
    <div class="backdrop" @click.self="emit('close')">
      <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="comments-title">
        <header class="dialog-header">
          <div>
            <h2 id="comments-title">Комментарии</h2>
            <p class="dialog-subtitle">{{ comments.length ? `${comments.length} ${commentsWord(comments.length)}` : 'Пока без комментариев' }}</p>
          </div>
          <button class="close-btn" type="button" aria-label="Закрыть" @click="emit('close')">×</button>
        </header>

        <div class="dialog-body">
          <div v-if="loading" class="state">Загрузка...</div>
          <div v-else-if="error" class="state state--error">{{ error }}</div>
          <div v-else-if="comments.length === 0" class="state">
            Будьте первым, кто оставит комментарий к этому кадру.
          </div>
          <ul v-else class="comments">
            <li v-for="comment in comments" :key="comment.id" class="comment">
              <div class="comment-head">
                <span class="author">{{ comment.author }}</span>
                <time class="date" :datetime="comment.createdAt">{{ formatDate(comment.createdAt) }}</time>
              </div>
              <p class="text">{{ comment.text }}</p>
            </li>
          </ul>
        </div>

        <form class="dialog-footer" @submit.prevent="submit">
          <textarea
            v-model="text"
            class="comment-input"
            rows="2"
            maxlength="1000"
            placeholder="Написать комментарий..."
            :disabled="sending"
          ></textarea>
          <p v-if="submitError" class="submit-error">{{ submitError }}</p>
          <div class="submit-row">
            <span class="counter">{{ text.length }} / 1000</span>
            <button class="btn-primary" type="submit" :disabled="sending || !text.trim()">
              {{ sending ? 'Отправка...' : 'Отправить' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { addScreenshotComment, getErrorMessage, getScreenshotComments } from '@/api'
import type { ScreenshotComment } from '@/api'

const props = defineProps<{ screenshotId: string }>()

const emit = defineEmits<{
  close: []
  created: [comment: ScreenshotComment]
}>()

const comments = ref<ScreenshotComment[]>([])
const loading = ref(true)
const sending = ref(false)
const error = ref<string | null>(null)
const submitError = ref<string | null>(null)
const text = ref('')

function commentsWord(count: number): string {
  const last = count % 10
  const lastTwo = count % 100
  if (last === 1 && lastTwo !== 11) {
    return 'комментарий'
  }
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) {
    return 'комментария'
  }
  return 'комментариев'
}

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

async function load() {
  loading.value = true
  error.value = null
  try {
    comments.value = await getScreenshotComments(props.screenshotId)
  } catch (e) {
    error.value = getErrorMessage(e, 'Не удалось загрузить комментарии')
  } finally {
    loading.value = false
  }
}

async function submit() {
  const value = text.value.trim()
  if (!value || sending.value) {
    return
  }
  sending.value = true
  submitError.value = null
  try {
    const comment = await addScreenshotComment(props.screenshotId, value)
    comments.value = [...comments.value, comment]
    text.value = ''
    emit('created', comment)
  } catch (e) {
    submitError.value = getErrorMessage(e, 'Не удалось отправить комментарий')
  } finally {
    sending.value = false
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
  void load()
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
  width: min(560px, 100%);
  max-height: min(88vh, 760px);
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
  flex: 1;
  min-height: 120px;
  padding: 1rem 1.25rem;
  overflow-y: auto;
}

.state {
  padding: 1.5rem 0.5rem;
  color: var(--text-secondary);
  text-align: center;
  font-size: 0.9rem;
}

.state--error {
  color: var(--color-danger);
}

.comments {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  list-style: none;
}

.comment {
  padding: 0.7rem 0.8rem;
  border: 1px solid var(--color-row-border);
  border-radius: 10px;
  background: var(--color-bg);
}

.comment-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.3rem;
}

.author {
  font-size: 0.85rem;
  font-weight: 600;
}

.date {
  flex: 0 0 auto;
  color: var(--text-secondary);
  font-size: 0.72rem;
}

.text {
  color: var(--text-primary);
  font-size: 0.9rem;
  line-height: 1.45;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.dialog-footer {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem 1.25rem;
  border-top: 1px solid var(--color-border);
}

.comment-input {
  width: 100%;
  min-height: 58px;
  padding: 0.55rem 0.7rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg);
  color: var(--text-primary);
  font-size: 0.9rem;
  line-height: 1.4;
  resize: vertical;
}

.comment-input:focus {
  outline: 2px solid var(--text-muted);
  border-color: var(--text-secondary);
}

.comment-input:disabled {
  opacity: 0.6;
}

.submit-error {
  color: var(--color-danger);
  font-size: 0.8rem;
}

.submit-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.counter {
  color: var(--text-secondary);
  font-size: 0.75rem;
}

.btn-primary {
  min-height: 38px;
  padding: 0.4rem 1.1rem;
  border: 1px solid var(--btn-primary-bg);
  border-radius: 6px;
  background: var(--btn-primary-bg);
  color: var(--btn-primary-text);
  font-weight: 600;
  cursor: pointer;
}

.btn-primary:hover:not(:disabled) {
  border-color: var(--btn-primary-bg-hover);
  background: var(--btn-primary-bg-hover);
  color: var(--btn-primary-text-hover);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: default;
}
</style>
