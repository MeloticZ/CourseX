<template>
  <div
    class="w-full rounded-md border border-cx-border p-2.5 flex flex-col gap-2 overflow-hidden"
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
      <div
        v-for="section in sections"
        :key="section.sectionId"
        class="flex gap-2 w-full border-t border-cx-border border-dashed cursor-pointer hover:bg-cx-surface-800/30 py-0.5"
        @mouseenter="onSectionHoverEnter(section)"
        @mouseleave="onSectionHoverLeave"
        @click="$emit('section-click', section.sectionId)"
      >
        <!-- Tags Display -->
        <div class="flex flex-col text-center">
          <span
            class="w-3.5 h-3.5 text-xs font-semibold line-clamp-1 leading-none grid place-items-center"
            :class="section.hasDClearance ? 'bg-zebra-sm-rose text-rose-500' : 'bg-zebra-sm text-cx-text-weak-shimmer'"
          >
            D
          </span>
          <span
            class="w-3.5 h-3.5 text-xs font-semibold line-clamp-1 leading-none grid place-items-center"
            :class="section.hasPrerequisites ? 'bg-zebra-sm-yellow text-yellow-500' : 'bg-zebra-sm text-cx-text-weak-shimmer'"
          >
            R
          </span>
          <span
            class="w-3.5 h-3.5 text-xs font-semibold line-clamp-1 leading-none grid place-items-center"
            :class="section.hasDuplicatedCredit ? 'bg-zebra-sm-green text-green-500' : 'bg-zebra-sm text-cx-text-weak-shimmer'"
          >
            C
          </span> 
        </div>
        
        <!-- Section Attributes -->
        <div class="flex flex-col gap-1 w-full justify-center">
          <div class="flex items-center gap-2 justify-between">
            <div class="flex items-center gap-1">
              <Icon name="uil:graduation-cap" class="h-4 w-4 text-cx-text-muted" />
              <span class="text-xs text-cx-text-secondary font-semibold line-clamp-1">{{ section.instructor }}</span>
            </div>

            <div class="flex items-center gap-1">
              <Icon name="uil:user" class="h-4 w-4" :class="occupancyIconClassFor(section)" />
              <span class="text-xs font-semibold line-clamp-1" :class="occupancyTextClassFor(section)">{{ section.enrolled }} / {{ section.capacity }}</span>
            </div>
          </div>

          <div class="flex items-center gap-2 justify-between">
            <div class="flex items-center gap-1">
              <Icon name="uil:clock" class="h-4 w-4 text-cx-text-muted" />
              <span class="text-xs text-cx-text-secondary font-semibold line-clamp-1">{{ section.schedule }}</span>
            </div>

            <div class="flex items-center gap-1">
              <Icon name="uil:location-point" class="h-4 w-4 text-cx-text-muted" />
              <span class="text-xs text-cx-text-secondary font-semibold line-clamp-1">{{ section.location }}</span>
            </div>
          </div>
        </div>

        <!-- Unit / Type Display -->
        <div class="flex flex-col text-center justify-center">
          <span
            class="text-sideways w-3.5 h-10.5 text-xs font-semibold line-clamp-1 leading-none grid place-items-center"
            :class="sectionTypeMetaClass(section)"
          >
            {{ sectionTypeLabel(section) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getCourseTypeMeta } from '~/composables/useCourseTypeMeta'
import type { UICourseSection } from '~/composables/useAPI'
import { useSchedule } from '~/composables/useSchedule'

defineEmits(['section-click'])

const props = defineProps<{
  title: string
  code: string
  description: string
  sections: UICourseSection[]
}>()

function occupancyIconClassFor(section: UICourseSection) {
  const isFull = (section.enrolled || 0) >= (section.capacity || 0)
  return isFull ? 'text-red-800' : 'text-cx-text-muted'
}

function occupancyTextClassFor(section: UICourseSection) {
  const isFull = (section.enrolled || 0) >= (section.capacity || 0)
  return isFull ? 'text-red-900' : 'text-cx-text-secondary'
}

function sectionUnitsToRender(section: UICourseSection) {
  const value = section.units
  if (value == null || value === '') return ''
  return String(value)
}

function sectionMeta(section: UICourseSection) {
  return getCourseTypeMeta(section.type)
}

function sectionTypeMetaClass(section: UICourseSection) {
  const meta = sectionMeta(section)
  return meta ? `${meta.cardZebraClass} ${meta.cardTextClass}` : 'bg-zebra-sm text-cx-text-secondary'
}

function sectionTypeLabel(section: UICourseSection) {
  const meta = sectionMeta(section)
  return meta ? meta.cardLabel : sectionUnitsToRender(section)
}

// Hover preview per section
const { setHoverPreviewFromString, clearHoverPreview } = useSchedule()
function onSectionHoverEnter(section: UICourseSection) {
  if (!section.schedule) return
  setHoverPreviewFromString(section.schedule, props.title, props.code)
}
function onSectionHoverLeave() {
  clearHoverPreview()
}
</script>

<style scoped>
</style>

