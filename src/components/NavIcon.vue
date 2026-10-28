<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <template v-if="name === 'top'">
      <path d="M8 21h8" />
      <path d="M12 17v4" />
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
      <path d="M7 6H4a2 2 0 0 0 2 4h1" />
      <path d="M17 6h3a2 2 0 0 1-2 4h-1" />
    </template>
    <template v-else-if="name === 'stats'">
      <path d="M3 3v18h18" />
      <path d="M7 16v-4" />
      <path d="M12 16V8" />
      <path d="M17 16V5" />
    </template>
    <template v-else-if="name === 'explore'">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="m21 15-5-5L5 21" />
    </template>
    <template v-else-if="name === 'liked'">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </template>
    <template v-else-if="name === 'archive'">
      <rect x="2" y="3" width="20" height="5" rx="1" />
      <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
      <path d="M10 12h4" />
    </template>
    <template v-else-if="name === 'comments'">
      <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <line x1="8" y1="9" x2="16" y2="9" />
      <line x1="8" y1="13" x2="13" y2="13" />
    </template>
    <template v-else-if="name === 'faq'">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </template>
    <template v-else-if="name === 'share'">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="10.51" x2="15.42" y2="6.49" />
      <line x1="8.59" y1="13.49" x2="15.42" y2="17.51" />
    </template>
    <template v-else-if="name === 'filters'">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </template>
    <template v-else-if="name === 'menu'">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </template>
    <template v-else-if="name === 'close'">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </template>
  </svg>
</template>

<script setup lang="ts">
type NavIconName = 'top' | 'stats' | 'explore' | 'liked' | 'archive' | 'comments' | 'faq' | 'share' | 'filters' | 'menu' | 'close'

defineProps<{ name: NavIconName }>()
</script>
