<template>
  <div class="tag-cloud">
    <button
      v-for="tag in tags"
      :key="tag.id"
      type="button"
      class="tag"
      :style="tagStyle(tag)"
      :disabled="!interactive"
      :aria-label="`${tag.label}: ${tag.matches} ${unit}`"
      @click="emit('select', tag)"
    >
      <span class="tag-label">{{ tag.label }}</span>
      <span class="tag-weight" aria-hidden="true">{{ tag.matches }} {{ unit }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CatalogTag } from '@/api'

const props = withDefaults(defineProps<{
  tags: CatalogTag[]
  unit?: string
  interactive?: boolean
}>(), {
  unit: 'матчей',
  interactive: true
})

const emit = defineEmits<{ select: [tag: CatalogTag] }>()

/** Минимальный размер тэга (N) и максимальный — ровно в 2 раза больше. */
const MIN_SIZE_REM = 0.7
const MAX_SIZE_REM = 3
/** Доля от максимального веса, ниже которой размер уже не уменьшается, а гаснет цвет. */
const FADE_THRESHOLD = 0.32
const MIN_OPACITY = 0.38
const MIN_FONT_WEIGHT = 500
const MAX_FONT_WEIGHT = 700

const maxMatches = computed(() => Math.max(1, ...props.tags.map(tag => tag.matches)))

function tagStyle(tag: CatalogTag): Record<string, string> {
  const ratio = Math.min(1, Math.max(0, tag.matches / maxMatches.value))
  const size = ratio >= FADE_THRESHOLD
    ? MIN_SIZE_REM + (MAX_SIZE_REM - MIN_SIZE_REM)
      * ((ratio - FADE_THRESHOLD) / (1 - FADE_THRESHOLD))
    : MIN_SIZE_REM
  const opacity = ratio >= FADE_THRESHOLD
    ? 1
    : MIN_OPACITY + (1 - MIN_OPACITY) * (ratio / FADE_THRESHOLD)

  return {
    fontSize: `${size.toFixed(2)}rem`,
    fontWeight: `${MIN_FONT_WEIGHT + Math.round(ratio * (MAX_FONT_WEIGHT - MIN_FONT_WEIGHT))}`,
    '--tag-opacity': opacity.toFixed(2)
  }
}
</script>

<style scoped>
.tag-cloud {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.4rem 0.9rem;
  padding: 1.5rem 0 0.75rem;
  line-height: 1.1;
}

.tag {
  position: relative;
  display: inline-flex;
  align-items: baseline;
  padding: 0.12rem 0.4rem;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: var(--color-primary);
  opacity: var(--tag-opacity, 1);
  line-height: 1.1;
  cursor: pointer;
  transition: opacity 0.18s ease, color 0.18s ease, background-color 0.18s ease;
}

.tag:hover:not(:disabled),
.tag:focus-visible {
  color: var(--text-primary);
  opacity: 1;
  background: var(--color-primary-soft);
}

.tag:disabled {
  cursor: default;
}

.tag-weight {
  position: absolute;
  left: 50%;
  bottom: calc(100% + 0.1rem);
  z-index: 2;
  transform: translate(-50%, 0.25rem);
  padding: 0.1rem 0.45rem;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: var(--bg-main);
  color: var(--text-secondary);
  font-size: 0.7rem;
  font-weight: 500;
  line-height: 1.3;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.tag:hover .tag-weight,
.tag:focus-visible .tag-weight {
  transform: translate(-50%, 0);
  opacity: 1;
}
</style>
