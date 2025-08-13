<template>
  <div
    class="w-full rounded-md border border-slate-800 p-2.5 flex flex-col gap-1 cursor-pointer hover:bg-slate-800/30 overflow-hidden"
    @click="$emit('click')"
    @mouseenter="onHoverEnter"
    @mouseleave="onHoverLeave"
  >
    <!-- Title and Class Code -->
    <div class="border-b border-slate-800 border-dashed flex flex-col gap-1 pb-2">
      <div class="flex items-center gap-2">
        <span class="text-sm truncate block flex-1 min-w-0 max-w-full">{{ title }}</span>
        <span class="text-xs text-slate-600 font-semibold shrink-0 ml-auto">{{ code }}</span>
      </div>

      <!-- Attributes -->
      <div class="flex items-center gap-2 justify-between">
        <div class="flex items-center gap-1">
          <Icon name="uil:graduation-cap" class="h-4 w-4 text-slate-500" />
          <span class="text-xs text-slate-600 font-semibold">{{ instructor }}</span>
        </div>

        <div class="flex items-center gap-1">
          <Icon name="uil:user" class="h-4 w-4" :class="occupancyIconClass" />
          <span class="text-xs font-semibold" :class="occupancyTextClass">{{ enrolled }} / {{ capacity }}</span>
        </div>
      </div>

      <div class="flex items-center gap-2 justify-between">
        <div class="flex items-center gap-1">
          <Icon name="uil:clock" class="h-4 w-4 text-slate-500" />
          <span class="text-xs text-slate-600 font-semibold">{{ schedule }}</span>
        </div>

        <div class="flex items-center gap-1">
          <Icon name="uil:location-point" class="h-4 w-4 text-slate-500" />
          <span class="text-xs text-slate-600 font-semibold">{{ location }}</span>
        </div>
      </div>
    </div>

    <!-- Description -->
    <span class="text-xs text-slate-600 line-clamp-2">{{ description }}</span>

    <!-- Tags -->
    <div v-if="tagsToRender.length > 0" class="flex items-center gap-1.5">
      <span
        v-for="(tag, index) in tagsToRender"
        :key="index"
        class="text-[10px] text-slate-200 px-1 py-0.5 rounded-md"
        :class="tagClass(tag)"
      >
        {{ tag.text }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useSchedule } from '~/composables/useSchedule'
defineEmits(['click'])

type TagVariant = 'green' | 'rose' | 'yellow' | 'blue'

type Tag = {
  text: string
  variant?: TagVariant
}

const props = defineProps<{
  title: string
  code: string
  instructor: string
  enrolled: number
  capacity: number
  schedule: string
  location: string
  description: string
  tags?: Tag[]
}>()

const isFull = computed(() => props.enrolled >= props.capacity)
const occupancyIconClass = computed(() => (isFull.value ? 'text-red-800' : 'text-slate-500'))
const occupancyTextClass = computed(() => (isFull.value ? 'text-red-900' : 'text-slate-600'))

const tagsToRender = computed(() => props.tags ?? [])

const tagClass = (tag: Tag) => {
  switch (tag.variant) {
    case 'green':
      return 'bg-green-950'
    case 'rose':
      return 'bg-rose-950'
    case 'yellow':
      return 'bg-yellow-950'
    case 'blue':
      return 'bg-blue-950'
    default:
      return 'bg-slate-800'
  }
}

// Hover preview handlers (ephemeral)
const { setHoverPreviewFromString, clearHoverPreview } = useSchedule()
const onHoverEnter = () => {
  if (!props.schedule) return
  setHoverPreviewFromString(props.schedule, props.title, props.code)
}
const onHoverLeave = () => {
  clearHoverPreview()
}
</script>

<style scoped>
</style>

