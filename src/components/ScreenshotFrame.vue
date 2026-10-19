<template>
  <figure class="frame">
    <div class="image-wrap" :style="{ aspectRatio: aspectRatio }">
      <div v-if="!loaded" class="placeholder">Загрузка кадра...</div>
      <img
        :src="url"
        :alt="altText"
        loading="lazy"
        @load="loaded = true"
        @error="loaded = true"
      />
      <button
        v-if="actionable"
        class="like-btn"
        :class="{ active: card.liked }"
        :disabled="busy"
        :title="card.liked ? 'Убрать из любимых' : 'В любимые'"
        :aria-label="card.liked ? 'Убрать из любимых' : 'В любимые'"
        @click="emit('toggle-like')"
      >
        <svg viewBox="0 0 24 24" :fill="card.liked ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
        <span class="like-count">{{ card.likes }}</span>
      </button>
    </div>
    <figcaption v-if="showMeta" class="meta">
      <div class="meta-row">
        <span v-if="card.matchDate" class="date">{{ formatDate(card.matchDate) }}</span>
        <span v-if="card.clubName" class="club">{{ card.clubName }}</span>
        <span v-if="card.tournament" class="badge">турнир</span>
      </div>
      <div v-if="card.players.length" class="players">
        {{ card.players.join(' · ') }}
      </div>
    </figcaption>
  </figure>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ScreenshotCard } from '@/api'
import { screenshotUrl } from '@/api'
import { formatDateRu } from '@/common'

const props = withDefaults(defineProps<{
  card: ScreenshotCard
  width?: number
  showMeta?: boolean
  actionable?: boolean
  busy?: boolean
}>(), {
  width: 640,
  showMeta: true,
  actionable: false,
  busy: false
})

const emit = defineEmits<{ 'toggle-like': [] }>()

const loaded = ref(false)

const url = computed(() => screenshotUrl(props.card.id, props.width))
const aspectRatio = computed(() => `${props.card.width} / ${props.card.height}`)
const altText = computed(() => props.card.players.join(', ') || 'Кадр из матча')

function formatDate(value: string): string {
  return formatDateRu(value)
}
</script>

<style scoped>
.frame {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin: 0;
}

.image-wrap {
  position: relative;
  width: 100%;
  overflow: hidden;
  border-radius: 10px;
  background: var(--color-primary-soft);
}

.image-wrap img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-muted);
  font-size: 0.9rem;
}

.like-btn {
  position: absolute;
  right: 0.6rem;
  bottom: 0.6rem;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  min-height: 40px;
  padding: 0.3rem 0.75rem;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  background: var(--color-overlay);
  color: #fff;
  font-weight: 600;
  transition: background-color 0.2s, color 0.2s;
}

.like-btn:hover:not(:disabled) {
  background: var(--color-primary);
}

.like-btn.active {
  background: var(--color-primary);
  color: var(--color-gold);
}

.like-btn:disabled {
  opacity: 0.6;
  cursor: default;
}

.like-btn svg {
  width: 18px;
  height: 18px;
}

.like-count {
  font-size: 0.85rem;
}

.meta {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.meta-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.date {
  font-weight: 600;
}

.club {
  color: var(--color-muted);
}

.badge {
  font-size: 0.7rem;
  font-weight: 500;
  color: var(--color-primary);
  border: 1px solid var(--color-primary);
  border-radius: 4px;
  padding: 0.05rem 0.4rem;
}

.players {
  color: var(--color-muted);
  font-size: 0.85rem;
  overflow-wrap: anywhere;
}
</style>
