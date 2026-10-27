<template>
    <div class="tag-cloud">
        <button v-for="tag in tags" :key="tag.id" type="button" class="tag" :style="tagStyle(tag)"
            :disabled="!interactive" :aria-label="`${tag.label}: ${tag.matches} ${unit}`" @click="emit('select', tag)">
            <span class="tag-label">{{ tag.label }}</span>
            <span class="tag-weight" aria-hidden="true">{{ tag.matches }} {{ unit }}</span>
        </button>
    </div>
</template>

<script setup lang="ts">
    import { computed } from 'vue'
    import type { CatalogTag } from '@/api'

    const props = withDefaults(defineProps < {
        tags: CatalogTag[]
  unit?: string
  interactive?: boolean
    } > (), {
        unit: 'матчей',
        interactive: true
    })

    const emit = defineEmits < { select: [tag: CatalogTag] } > ()

    const MIN_SIZE_REM = 0.7
    const MAX_SIZE_REM = 4.0
    /** Количество групп, на которое делится первая (размерная) половина. */
    const TAG_SIZE_STEPS = 3
    /** Всего групп: первая половина меняет размер, вторая — бледность и жирность. */
    const TAG_GROUPS = TAG_SIZE_STEPS * 2
    const GROUP_SPAN = Math.max(1, TAG_SIZE_STEPS - 1)

    const MAX_FONT_WEIGHT = 700
    const PALE_FONT_WEIGHT_START = 600
    const PALE_FONT_WEIGHT_END = 400
    const PALE_OPACITY_START = 0.85
    const PALE_OPACITY_END = 0.16

    /** Вклад абсолютного веса (в лог-шкале) и ранга в итоговый балл тэга. */
    const MAGNITUDE_SHARE = 0.7
    const RANK_SHARE = 0.3

    /**
     * Квантование в 2*TAG_SIZE_STEPS групп по смешанному баллу:
     * 70% — абсолютный вес в лог-шкале, 30% — позиция в отсортированном списке.
     *
     * Лог-шкала не даёт одному выбросу «схлопнуть» остальные тэги, но при этом
     * сохраняет разницу в разы: тэг с весом в 10 раз меньше лидера заметно
     * меньше него. Ранг добавляет разрешение между близкими по весу тэгами.
     */
    const groupByTagId = computed<Map<string, number>>(() => {
        const sorted = [...props.tags].sort((left, right) => right.matches - left.matches)
        const total = sorted.length
        const groups = new Map<string, number>()
        if (total === 0) {
            return groups
        }

        const maxMatches = sorted[0].matches
        const maxMagnitude = Math.log1p(maxMatches)
        let start = 0
        while (start < total) {
            let end = start + 1
            while (end < total && sorted[end].matches === sorted[start].matches) {
                end++
            }

            let group: number
            if (sorted[start].matches === maxMatches) {
                group = 1
            } else {
                const averagePosition = (start + end - 1) / 2
                const rankScore = total > 1 ? 1 - averagePosition / (total - 1) : 1
                const magnitude = maxMagnitude > 0
                    ? Math.log1p(sorted[start].matches) / maxMagnitude
                    : 1
                const score = MAGNITUDE_SHARE * magnitude + RANK_SHARE * rankScore
                const bucket = Math.min(
                    TAG_GROUPS,
                    Math.max(1, Math.floor(score * TAG_GROUPS) + 1)
                )
                group = TAG_GROUPS - bucket + 1
            }

            for (let position = start; position < end; position++) {
                groups.set(sorted[position].id, group)
            }
            start = end
        }

        return groups
    })

    function tagStyle(tag: CatalogTag): Record<string, string> {
        const group = groupByTagId.value.get(tag.id) ?? 1

        if (group <= TAG_SIZE_STEPS) {
            const step = (group - 1) / GROUP_SPAN
            const size = MAX_SIZE_REM - (MAX_SIZE_REM - MIN_SIZE_REM) * step
            return {
                fontSize: `${size.toFixed(2)}rem`,
                fontWeight: `${MAX_FONT_WEIGHT}`,
                '--tag-opacity': '1'
            }
        }

        const step = (group - TAG_SIZE_STEPS - 1) / GROUP_SPAN
        const opacity = PALE_OPACITY_START - (PALE_OPACITY_START - PALE_OPACITY_END) * step
        const fontWeight = Math.round(
            PALE_FONT_WEIGHT_START - (PALE_FONT_WEIGHT_START - PALE_FONT_WEIGHT_END) * step
        )

        return {
            fontSize: `${MIN_SIZE_REM}rem`,
            fontWeight: `${fontWeight}`,
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