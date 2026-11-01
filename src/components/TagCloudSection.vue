<template>
  <div class="tag-cloud-section" :class="{ 'tag-cloud-section--narrow': narrow }">
    <TagCloud
      v-if="sortedTags.length"
      :tags="sortedTags"
      :unit="unit"
      :interactive="interactive"
      @select="tag => emit('select', tag)"
    />
    <div v-else class="empty">{{ emptyText }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CatalogTag } from '@/api'
import TagCloud from '@/components/TagCloud.vue'

const props = withDefaults(defineProps<{
  tags: CatalogTag[]
  unit?: string
  interactive?: boolean
  narrow?: boolean
  emptyText?: string
}>(), {
  unit: 'матчей',
  interactive: true,
  narrow: false,
  emptyText: 'Тэги не найдены.'
})

const emit = defineEmits<{ select: [tag: CatalogTag] }>()

/** Облако всегда идёт по алфавиту, размер и насыщенность считает TagCloud по весу. */
const sortedTags = computed(() =>
  [...props.tags].sort((left, right) => left.label.localeCompare(right.label, 'ru'))
)
</script>

<style scoped>
.tag-cloud-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.tag-cloud-section--narrow {
  width: 75%;
  margin: 0 auto;
}

@media (max-width: 600px) {
  .tag-cloud-section--narrow {
    width: 100%;
  }
}

.empty {
  text-align: center;
  padding: 2rem 1rem;
  color: var(--color-muted);
  border: 1px dashed var(--color-border);
  border-radius: 8px;
}
</style>
