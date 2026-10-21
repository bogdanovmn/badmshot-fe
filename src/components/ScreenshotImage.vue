<template>
  <img v-if="url" :src="url" :alt="alt" :loading="loading" />
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { screenshotImageUrl } from '@/api'

const props = withDefaults(defineProps<{
  id: string
  width: number
  alt?: string
  loading?: 'eager' | 'lazy'
}>(), {
  alt: 'Кадр',
  loading: 'lazy'
})

const url = ref('')
let objectUrl: string | null = null
let version = 0

async function load() {
  const current = ++version
  try {
    const next = await screenshotImageUrl(props.id, props.width)
    if (current !== version) {
      if (next.startsWith('blob:')) {
        URL.revokeObjectURL(next)
      }
      return
    }
    const previous = objectUrl
    objectUrl = next.startsWith('blob:') ? next : null
    url.value = next
    if (previous && previous !== next) {
      await nextTick()
      URL.revokeObjectURL(previous)
    }
  } catch {
    if (current === version) {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
        objectUrl = null
      }
      url.value = ''
    }
  }
}

watch(
  () => [props.id, props.width],
  () => {
    void load()
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  version++
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl)
  }
})
</script>
