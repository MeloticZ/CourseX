<template>
  <div
    class="w-full rounded-md border border-cx-border p-2.5 flex flex-col gap-2 cursor-pointer hover:bg-cx-surface-800/30 overflow-hidden"
    @click="$emit('click')"
    @mouseenter="onHoverEnter"
    @mouseleave="onHoverLeave"
  >
    <!-- Title, Class Code and Description -->
    <div class="flex flex-col gap-1">
      <div class="flex items-center gap-2">
        <span class="text-sm truncate block flex-1 min-w-0 max-w-full">{{ title }}</span>
        <span class="text-xs text-cx-text-secondary font-semibold shrink-0 ml-auto">{{ code }}</span>
      </div>
      <span class="text-xs text-cx-text-secondary line-clamp-2">{{ description }}</span>
    </div>

    <div class="flex flex-col w-full">
      <div class="flex gap-1 w-full border-t border-cx-border border-dashed">
        <!-- Tags Display -->
        <div class="flex flex-col text-center">
          <span
            class="w-3.5 h-3.5 text-xs font-semibold line-clamp-1 leading-none grid place-items-center"
            :class="hasDClearance ? 'bg-zebra-sm-rose text-rose-500' : 'bg-zebra-sm text-cx-text-weak-muted'"
          >
            D
          </span>
          <span
            class="w-3.5 h-3.5 text-xs font-semibold line-clamp-1 leading-none grid place-items-center"
            :class="hasPrerequisites ? 'bg-zebra-sm-yellow text-yellow-500' : 'bg-zebra-sm text-cx-text-weak-muted'"
          >
            R
          </span>
          <span
            class="w-3.5 h-3.5 text-xs font-semibold line-clamp-1 leading-none grid place-items-center"
            :class="hasDuplicatedCredit ? 'bg-zebra-sm-green text-green-500' : 'bg-zebra-sm text-cx-text-weak-muted'"
          >
            C
          </span> 
        </div>
        
        <!-- Section Attributes -->
        <div class="flex flex-col gap-1 w-full justify-center">
          <div class="flex items-center gap-2 justify-between">
            <div class="flex items-center gap-1">
              <Icon name="uil:graduation-cap" class="h-4 w-4 text-cx-text-muted" />
              <span class="text-xs text-cx-text-secondary font-semibold line-clamp-1">{{ instructor }}</span>
            </div>

            <div class="flex items-center gap-1">
              <Icon name="uil:user" class="h-4 w-4" :class="occupancyIconClass" />
              <span class="text-xs font-semibold line-clamp-1" :class="occupancyTextClass">{{ enrolled }} / {{ capacity }}</span>
            </div>
          </div>

          <div class="flex items-center gap-2 justify-between">
            <div class="flex items-center gap-1">
              <Icon name="uil:clock" class="h-4 w-4 text-cx-text-muted" />
              <span class="text-xs text-cx-text-secondary font-semibold line-clamp-1">{{ schedule }}</span>
            </div>

            <div class="flex items-center gap-1">
              <Icon name="uil:location-point" class="h-4 w-4 text-cx-text-muted" />
              <span class="text-xs text-cx-text-secondary font-semibold line-clamp-1">{{ location }}</span>
            </div>
          </div>
        </div>

        <!-- Unit / Type Display -->
        <div class="flex flex-col text-center justify-center">
          <span
            class="text-sideways w-3.5 h-10.5 text-xs font-semibold line-clamp-1 leading-none"
            :class="typeMeta
              ? `${typeMeta.cardZebraClass} ${typeMeta.cardTextClass}`
              : 'bg-zebra-sm text-cx-text-secondary'"
          >
            {{ typeMeta ? typeMeta.cardLabel : unitsToRender }}
          </span>
        </div>
      </div>


    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useSchedule } from '~/composables/useSchedule'
import { getCourseTypeMeta } from '~/composables/useCourseTypeMeta'
defineEmits(['click'])

const props = defineProps<{
  title: string
  code: string
  instructor: string
  enrolled: number
  capacity: number
  schedule: string
  location: string
  description: string
  hasDClearance?: boolean
  hasPrerequisites?: boolean
  hasDuplicatedCredit?: boolean
  units?: number | string | null
  type?: string | null
}>()

const isFull = computed(() => props.enrolled >= props.capacity)
const occupancyIconClass = computed(() => (isFull.value ? 'text-red-800' : 'text-cx-text-muted'))
const occupancyTextClass = computed(() => (isFull.value ? 'text-red-900' : 'text-cx-text-secondary'))

// Hover preview handlers (ephemeral)
const { setHoverPreviewFromString, clearHoverPreview } = useSchedule()
const onHoverEnter = () => {
  if (!props.schedule) return
  setHoverPreviewFromString(props.schedule, props.title, props.code)
}
const onHoverLeave = () => {
  clearHoverPreview()
}

const unitsToRender = computed(() => {
  const value = props.units
  if (value == null || value === '') return ''
  return String(value)
})

const typeMeta = computed(() => getCourseTypeMeta(props.type))
</script>

<style scoped>
</style>

