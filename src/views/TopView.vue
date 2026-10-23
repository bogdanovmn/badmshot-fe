<template>
  <div class="page">
    <header class="page-head">
      <h1>ТОП кадров</h1>
      <p class="subtitle">Сначала по лайкам, затем по просмотрам</p>
    </header>

    <ErrorNotice v-if="error" :message="error" />
    <div v-else-if="loading" class="loading">Загрузка...</div>
    <div v-else-if="cards.length === 0" class="stage">
      <TvPlaceholder
        title="В ТОПе пока пусто"
        text="Здесь появятся кадры, которые лайкнули или посмотрели. Загляните в раздел «Кадры» и поставьте лайк понравившемуся."
      >
        <router-link class="stage-link" to="/explore">Перейти к кадрам</router-link>
      </TvPlaceholder>
    </div>
    <div v-else class="list">
      <router-link
        v-for="card in cards"
        :key="card.id"
        :to="{ name: 'top-frame', params: { id: card.id } }"
        class="thumb"
        :aria-label="thumbAlt(card)"
      >
        <div class="thumb-media">
          <ScreenshotImage :id="card.id" :width="1200" :alt="thumbAlt(card)" />

          <div class="bottom-scrim" aria-hidden="true"></div>

          <div class="stats">
            <span class="stat" :title="`Лайков: ${formatCount(card.likes)}`">
              <svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              <span>{{ formatCount(card.likes) }}</span>
            </span>
            <span class="stat" :title="`Просмотров: ${formatCount(card.views)}`">
              <svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <span>{{ formatCount(card.views) }}</span>
            </span>
          </div>

          <div class="caption">
            <div v-if="card.players.length" class="players">{{ card.players.join(' · ') }}</div>
            <div v-if="card.matchDate || card.clubName" class="meta-row">
              <span v-if="card.matchDate" class="date">{{ formatDate(card.matchDate) }}</span>
              <span v-if="card.clubName" class="club">{{ card.clubName }}</span>
            </div>
          </div>
        </div>
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getErrorMessage, getTopScreenshots } from '@/api'
import type { ScreenshotCard } from '@/api'
import { formatDateRu } from '@/common'
import ErrorNotice from '@/components/ErrorNotice.vue'
import ScreenshotImage from '@/components/ScreenshotImage.vue'
import TvPlaceholder from '@/components/TvPlaceholder.vue'

const cards = ref<ScreenshotCard[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

async function load() {
  loading.value = true
  error.value = null
  try {
    cards.value = await getTopScreenshots()
  } catch (e) {
    error.value = getErrorMessage(e, 'Не удалось загрузить ТОП')
  } finally {
    loading.value = false
  }
}

function formatCount(value: number): string {
  return value.toLocaleString('ru-RU')
}

function formatDate(value: string): string {
  return formatDateRu(value)
}

function thumbAlt(card: ScreenshotCard): string {
  return card.players.length
    ? `Кадр: ${card.players.join(', ')}`
    : 'Кадр из матча'
}

onMounted(load)
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.page-head {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

h1 {
  font-size: 1.4rem;
}

.subtitle {
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.list {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
}

.thumb {
  display: block;
  width: 100%;
  max-width: 900px;
  color: inherit;
  text-decoration: none;
}

.thumb:hover {
  color: inherit;
  text-decoration: none;
}

.thumb-media {
  position: relative;
  width: 100%;
  overflow: hidden;
  aspect-ratio: 18 / 5;
  border-radius: 10px;
  background: var(--color-primary-soft);
  isolation: isolate;
}

.thumb-media :deep(img) {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 59%;
  filter: grayscale(0.62) sepia(0.14) saturate(0.72) brightness(0.78);
  opacity: 0.9;
  transition: filter 0.45s ease, opacity 0.45s ease;
}

.thumb:hover .thumb-media :deep(img),
.thumb:focus-visible .thumb-media :deep(img) {
  filter: none;
  opacity: 1;
}

.bottom-scrim {
  position: absolute;
  inset: auto 0 0 0;
  height: 55%;
  z-index: 1;
  pointer-events: none;
  background: linear-gradient(
    to top,
    var(--overlay-scrim-strong),
    var(--overlay-scrim-soft) 55%,
    transparent
  );
}

.stats {
  position: absolute;
  top: 0.75rem;
  right: 0.85rem;
  z-index: 3;
  display: inline-flex;
  align-items: center;
  gap: 0.9rem;
  color: var(--text-primary);
  font-size: 0.85rem;
  font-weight: 600;
  opacity: 0.62;
  pointer-events: none;
  text-shadow: 0 1px 4px var(--accent-dark);
  transition: opacity 0.45s ease;
}

.thumb:hover .stats,
.thumb:focus-visible .stats {
  opacity: 0.9;
}

.stat {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}

.stat-icon {
  width: 15px;
  height: 15px;
}

.caption {
  position: absolute;
  left: 1rem;
  bottom: 0.9rem;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  max-width: min(80%, 720px);
  color: var(--text-primary);
  text-shadow: 0 1px 4px var(--accent-dark);
}

.caption .players {
  font-size: clamp(0.9rem, 0.5vw + 0.75rem, 1.2rem);
  font-weight: 600;
  overflow-wrap: anywhere;
}

.meta-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  font-size: clamp(0.72rem, 0.3vw + 0.6rem, 0.9rem);
  color: var(--text-secondary);
}

.date {
  font-weight: 600;
  color: var(--text-primary);
}

.club {
  color: var(--text-secondary);
}

.stage {
  position: relative;
  min-height: min(60vh, 460px);
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: 12px;
}

.stage-link {
  margin-top: 0.4rem;
  min-height: 44px;
  padding: 0.6rem 1.5rem;
  border: 1px solid var(--btn-ghost-border);
  border-radius: 8px;
  background: transparent;
  color: var(--text-primary);
  font-weight: 600;
  text-decoration: none;
}

.stage-link:hover {
  background: var(--text-primary);
  color: var(--accent-dark);
  text-decoration: none;
}

.loading {
  padding: 2.5rem 1rem;
  color: var(--color-muted);
  text-align: center;
}

@media (min-width: 900px) {
  .stats {
    top: 1rem;
    right: 1.1rem;
    font-size: 0.95rem;
  }

  .stat-icon {
    width: 17px;
    height: 17px;
  }

  .caption {
    left: 1.5rem;
    bottom: 1.25rem;
  }
}
</style>
