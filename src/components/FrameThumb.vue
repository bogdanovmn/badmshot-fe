<template>
  <component :is="linkComponent" :to="to" class="thumb" :aria-label="thumbAlt">
    <div class="thumb-media">
      <ScreenshotImage :id="card.id" :width="1200" :alt="thumbAlt" />

      <div class="bottom-scrim" aria-hidden="true"></div>

      <div v-if="hasStats" class="stats">
        <span v-if="statVisible(card.likes)" class="stat" :title="`Лайков: ${formatCount(card.likes)}`">
          <svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          <span>{{ formatCount(card.likes) }}</span>
        </span>
        <span v-if="statVisible(card.shares)" class="stat" :title="`Поделились: ${formatCount(card.shares)}`">
          <svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="10.51" x2="15.42" y2="6.49" />
            <line x1="8.59" y1="13.49" x2="15.42" y2="17.51" />
          </svg>
          <span>{{ formatCount(card.shares) }}</span>
        </span>
        <span v-if="statVisible(card.comments)" class="stat" :title="`Комментариев: ${formatCount(card.comments)}`">
          <svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span>{{ formatCount(card.comments) }}</span>
        </span>
        <span v-if="statVisible(card.views)" class="stat" :title="`Просмотров: ${formatCount(card.views)}`">
          <svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <span>{{ formatCount(card.views) }}</span>
        </span>
        <span v-if="shareViews !== undefined && statVisible(shareViews)" class="stat" :title="`Просмотров по ссылке: ${formatCount(shareViews)}`">
          <svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="10.51" x2="15.42" y2="6.49" />
            <line x1="8.59" y1="13.49" x2="15.42" y2="17.51" />
          </svg>
          <span>{{ formatCount(shareViews) }}</span>
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
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import type { RouteLocationRaw } from 'vue-router'
import type { ScreenshotCard } from '@/api'
import { formatDateRu } from '@/common'
import ScreenshotImage from '@/components/ScreenshotImage.vue'

const props = defineProps<{
  card: Omit<ScreenshotCard, 'liked'>
  to?: RouteLocationRaw
  shareViews?: number
  hideEmptyStats?: boolean
}>()

const linkComponent = computed(() => props.to ? RouterLink : 'div')

const hasStats = computed(() => {
  if (!props.hideEmptyStats) {
    return true
  }
  return props.card.likes > 0
    || props.card.shares > 0
    || props.card.comments > 0
    || props.card.views > 0
    || (props.shareViews !== undefined && props.shareViews > 0)
})

function statVisible(value: number): boolean {
  return !props.hideEmptyStats || value > 0
}

const thumbAlt = computed(() => props.card.players.length
  ? `Кадр: ${props.card.players.join(', ')}`
  : 'Кадр из матча')

function formatCount(value: number): string {
  return value.toLocaleString('ru-RU')
}

function formatDate(value: string): string {
  return formatDateRu(value)
}
</script>

<style scoped>
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
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 0.55rem 0.9rem;
  max-width: calc(100% - 1.6rem);
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
