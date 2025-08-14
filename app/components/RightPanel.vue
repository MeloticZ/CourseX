<template>
  <div class="w-full h-full flex flex-col justify-between">

    <div class="gap-2 flex flex-col p-4 h-full overflow-y-hidden">
      <div v-if="details">
        <div class="flex items-center gap-2">
          <span class="text-sm text-cx-text-subtle">Course Details</span>
          <span class="text-sm text-cx-text-subtle">{{ details.code }}</span>
        </div>
        <h1 class="text-2xl font-semibold">{{ details.title }}</h1>
      </div>

      <div class="flex flex-col gap-2 overflow-y-scroll h-full">
        <span v-if="details" class="text-sm text-cx-text-muted">
          {{ details.description || 'No description available.' }}
        </span>

        <button v-if="details" class="text-sm w-fit p-2 rounded-md mt-1 mb-2 bg-cx-surface-800 hover:bg-cx-surface-700" :class="{ 'text-cx-rose-500/80 border-cx-rose-700/50 border-1': isInSchedule, 'text-cx-text-subtle': !isInSchedule }" @click="onAddOrRemove">
          {{ isInSchedule ? 'Remove from Schedule' : 'Add to Schedule' }}
        </button>

        <div v-if="details" class="flex flex-col gap-1.5 border-y border-cx-border py-4">
          <div class="flex items-center gap-2">
            <Icon name="uil:graduation-cap" class="h-5 w-5 text-cx-text-muted"/>
            <span class="text-sm text-cx-text-subtle">{{ instructors }}</span>
          </div>
          <div class="flex items-center gap-2">
            <Icon name="uil:user" class="h-5 w-5" :class="{ 'text-cx-rose-800': details.enrolled === details.capacity, 'text-cx-text-muted': details.enrolled !== details.capacity }" />
            <span class="text-sm" :class="{ 'text-cx-rose-700': details.enrolled === details.capacity, 'text-cx-text-subtle': details.enrolled !== details.capacity }">{{ details.enrolled }} / {{ details.capacity }} Students</span>
          </div>
          <div v-if="details.times.length > 0" class="flex items-center gap-2">
            <Icon name="uil:clock" class="h-5 w-5 text-cx-text-muted" />
            <span class="text-sm text-cx-text-subtle">{{ details.times[0] }}</span>
          </div>
          <div v-if="details.locations.length > 0" class="flex items-center gap-2">
            <Icon name="uil:location-point" class="h-5 w-5 text-cx-text-muted" />
            <span class="text-sm text-cx-text-subtle">{{ details.locations[0] }}</span>
          </div>
        </div>

        <div v-if="details" class="flex flex-col gap-2">
          <div v-if="details.duplicatedCredits.length > 0" class="flex items-center gap-2">
            <Icon name="uil:pathfinder" class="h-5 w-5 text-cx-yellow-500" />
            <span class="text-sm text-cx-yellow-400">Dupe credit: </span>
            <div class="flex items-center gap-1">
              <span v-for="dc in details.duplicatedCredits" :key="dc" class="text-xs bg-cx-yellow-800 text-cx-yellow-200 px-1 py-0.5 rounded-md">{{ dc }}</span>
            </div>
          </div>

          <div v-if="details.prerequisites.length > 0" class="flex items-center gap-2">
            <Icon name="uil:link" class="h-5 w-5 text-cx-rose-500" />
            <span class="text-sm text-cx-rose-400">Pre-requisite: </span>
            <div class="flex items-center gap-1">
              <span v-for="pr in details.prerequisites" :key="pr" class="text-xs bg-cx-rose-800 text-cx-rose-200 px-1 py-0.5 rounded-md">{{ pr }}</span>
            </div>
          </div>

          <div v-if="details.dClearance" class="flex items-center gap-2">
            <Icon name="uil:bell" class="h-5 w-5 text-cx-rose-500" />
            <span class="text-sm text-cx-rose-400">D-Clearance</span>
          </div>

          <div v-if="details.units != null && details.units !== ''" class="flex items-center gap-2">
            <Icon name="uil:bill" class="h-5 w-5 text-cx-green-500" />
            <span class="text-sm text-cx-green-400">{{ details.units }} units</span>
          </div>

          <div v-if="details.type === 'Lab'" class="flex items-center gap-2">
            <Icon name="uil:flask-potion" class="h-5 w-5 text-cx-blue-500" />
            <span class="text-sm text-cx-blue-400">Lab</span>
          </div>
        </div>

        <div v-else class="h-full flex-1 flex flex-col items-center justify-center text-center border border-dashed border-cx-border rounded-md">
          <Icon name="uil:apps" class="h-14 w-14 text-cx-surface-800 mb-2" />
          <h2 class="text-lg text-cx-text-subtle">No course selected</h2>
          <p class="text-sm text-cx-text-muted max-w-xs">Choose a program from the left or search all courses in the middle panel to view details here.</p>
        </div>
      </div>

    </div>

    <div class="w-full h-full max-h-2/5 min-h-56 border-t border-cx-border pt-2">
      <div class="w-full h-full flex flex-col gap-2 overflow-hidden">
        <div class="w-full grid grid-cols-7 text-xs text-cx-text-muted select-none">
          <div v-for="(d, di) in displayDayLabels" :key="di" class="text-center">{{ d }}</div>
        </div>
        <div class="w-full grow grid grid-cols-7 overflow-hidden">
          <div
            v-for="(dayIndex, colIdx) in displayDayIndices"
            :key="`col-` + dayIndex"
            :class="['relative border-r last:border-r-0 border-cx-border bg-cx-surface-950/20 overflow-hidden', { 'pl-8': colIdx === 0 }]"
            :data-day-column="dayIndex"
            @mousedown="(e) => onDayMouseDown(e, dayIndex)"
          >
            <!-- hour grid lines -->
            <div v-for="(tick, i) in hourTicks" :key="i" class="absolute left-0 right-0 border-t border-cx-border" :style="{ top: tick.topPct + '%' }"></div>

            <!-- time gutter inside Sunday column -->
            <div v-if="colIdx === 0" class="absolute inset-0 pointer-events-none">
              <div v-for="(tick, i) in hourTicks" :key="i" class="absolute left-1/2 -translate-x-1/2" :style="{ top: tick.topPct + '%' }">
                <div class="text-[10px] text-cx-text-weak-muted -translate-y-1/2">{{ tick.label }}</div>
              </div>
            </div>

            <!-- blocks -->
            <div
              v-for="block in blocksByDay(dayIndex)"
              :key="block.id"
              class="absolute left-0 right-0 mx-1 rounded-md text-[10px] leading-tight px-1 py-0.5 cursor-pointer flex flex-col justify-between"
              :style="styleForBlock(block)"
              @click.stop="() => onBlockClick(block.id)"
            >
              <div class="truncate">{{ block.label || 'Block' }}</div>
              <div v-if="block.courseCode" class="text-[8px] opacity-70">{{ block.courseCode }}</div>
            </div>

            <!-- preview blocks (ephemeral, orange) -->
            <div
              v-for="p in previewBlocksByDay(dayIndex)"
              :key="'preview-' + p.id"
              class="absolute left-0 right-0 mx-1 rounded-md text-[10px] leading-tight px-1 py-0.5 pointer-events-none"
              :style="styleForPreviewBlock(p)"
            >
              <div class="truncate">{{ p.label || 'Preview' }}</div>
              <div v-if="p.courseCode" class="text-[8px] opacity-70">{{ p.courseCode }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { getCourseDetails, getSectionDetails, type CourseDetails } from '~/composables/useAPI'
import { useSchedule, type ScheduleBlock } from '~/composables/useSchedule'

const { selectedCourseCode, selectedSectionId } = useCourseSelection()

const details = ref<CourseDetails | null>(null)

const loadDetails = async () => {
  const code = selectedCourseCode.value
  const section = selectedSectionId.value
  if (!code) {
    details.value = null
    return
  }
  if (section) {
    const bySection = await getSectionDetails(code, section)
    if (bySection) {
      details.value = bySection
      return
    }
  }
  details.value = await getCourseDetails(code)
}

watch(
  () => [selectedCourseCode.value, selectedSectionId.value],
  () => {
    loadDetails()
  },
  { immediate: true }
)

const instructors = computed(() =>
  details.value && details.value.instructors && details.value.instructors.length > 0
    ? details.value.instructors.join(', ')
    : 'TBA'
)

// Calendar state/hooks
const {
  blocks,
  previewBlocks,
  DAY_LABELS,
  START_MINUTES,
  END_MINUTES,
  SLOT_MINUTES,
  addBlock,
  updateBlock,
  removeBlock,
  geometryFor,
  minutesToTime,
    parseBlocksFromApiSpec,
    hasCourseSection,
    removeCourseSection,
} = useSchedule()

const dayLabels = DAY_LABELS

const totalRange = END_MINUTES - START_MINUTES
const hourTicks = computed(() => {
  const ticks: { topPct: number; label: string }[] = []
  for (let m = START_MINUTES; m <= END_MINUTES; m += 60) {
    const topPct = ((m - START_MINUTES) / totalRange) * 100
    const h = Math.floor(m / 60)
    const label = `${h.toString().padStart(2, '0')}:00`
    ticks.push({ topPct, label })
  }
  return ticks
})

const blocksByDay = (dayIndex: number) => blocks.value.filter((b) => b.dayIndex === dayIndex)
const previewBlocksByDay = (dayIndex: number) => previewBlocks.value.filter((b) => b.dayIndex === dayIndex)

const styleForBlock = (block: ScheduleBlock) => {
  const g = geometryFor(block)
  const color = block.color || 'rgb(var(--color-cx-blue-500-rgb) / 0.25)'
  const border = block.color || 'rgb(var(--color-cx-blue-500-rgb) / 0.65)'
  return {
    top: `${g.topPct}%`,
    height: `${g.heightPct}%`,
    background: color,
    border: `1px solid ${border}`,
  }
}

const styleForPreviewBlock = (block: ScheduleBlock) => {
  const g = geometryFor(block)
  const color = block.color || 'rgb(var(--color-cx-orange-500-rgb) / 0.25)'
  const border = 'rgb(var(--color-cx-orange-500-rgb) / 0.7)'
  return {
    top: `${g.topPct}%`,
    height: `${g.heightPct}%`,
    background: color,
    border: `1px dashed ${border}`,
  }
}

const formatRange = (start: number, end: number) => `${minutesToTime(start)}–${minutesToTime(end)}`

// Display order: start week on Sunday
const displayDayIndices = computed(() => [0, 1, 2, 3, 4, 5, 6])
const displayDayLabels = computed(() => dayLabels)

// Interaction: click-drag to create a block (snapped to 5 minutes)
const enableManualCalendarSlotCreation = ref(false)
const isDragging = ref(false)
const dragDayIndex = ref<number | null>(null)
const dragStart = ref(START_MINUTES)
const dragCurrent = ref(START_MINUTES)
const draftBlockId = ref<string | null>(null)
const dragColumnEl = ref<HTMLElement | null>(null)

function eventMinutesInColumn(e: MouseEvent, columnEl: HTMLElement): number {
  const rect = columnEl.getBoundingClientRect()
  const y = e.clientY - rect.top
  const frac = Math.max(0, Math.min(1, y / Math.max(rect.height, 1)))
  const minutes = START_MINUTES + Math.round((frac * totalRange) / SLOT_MINUTES) * SLOT_MINUTES
  return Math.max(START_MINUTES, Math.min(END_MINUTES, minutes))
}

function onDayMouseDown(e: MouseEvent, dayIndex: number) {
  if (!enableManualCalendarSlotCreation.value) return
  const el = e.currentTarget as HTMLElement
  const start = eventMinutesInColumn(e, el)
  isDragging.value = true
  dragDayIndex.value = dayIndex
  dragStart.value = start
  dragCurrent.value = start
  dragColumnEl.value = el
  const id = addBlock({
    dayIndex,
    startMinutes: start,
    endMinutes: start + 5,
    label: 'New',
    color: 'rgb(var(--color-cx-green-500-rgb) / 0.25)',
  })
  draftBlockId.value = id
  window.addEventListener('mousemove', onWindowMouseMove)
  window.addEventListener('mouseup', onWindowMouseUp)
}

function onWindowMouseMove(e: MouseEvent) {
  if (!isDragging.value) return
  const dayIndex = dragDayIndex.value
  if (dayIndex == null) return
  const columnEl = dragColumnEl.value
  if (!columnEl) return
  const minutes = eventMinutesInColumn(e, columnEl)
  dragCurrent.value = minutes
  const id = draftBlockId.value
  if (id) {
    updateBlock(id, {
      startMinutes: Math.min(dragStart.value, dragCurrent.value),
      endMinutes: Math.max(dragStart.value, dragCurrent.value),
    })
  }
}

function onWindowMouseUp() {
  if (!isDragging.value) return
  isDragging.value = false
  window.removeEventListener('mousemove', onWindowMouseMove)
  window.removeEventListener('mouseup', onWindowMouseUp)
  // Ensure minimum 5 minutes length
  const id = draftBlockId.value
  if (id) {
    const b = blocks.value.find((x) => x.id === id)
    if (b && b.endMinutes - b.startMinutes < SLOT_MINUTES) {
      updateBlock(id, { endMinutes: b.startMinutes + SLOT_MINUTES })
    }
  }
  draftBlockId.value = null
  dragColumnEl.value = null
}

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onWindowMouseMove)
  window.removeEventListener('mouseup', onWindowMouseUp)
})

function onBlockClick(id: string) {
  const target = blocks.value.find((b) => b.id === id)
  if (!target) return
  // remove all blocks linked to the same course/section
  removeCourseSection(target.courseCode || null, target.sectionId || null)
}

function hashColorFromCode(code: string): string {
  const s = (code || '').toUpperCase()
  let hash = 0
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0
  const hue = hash % 360
  const color = `hsla(${hue}, 85%, 60%, 0.25)`
  return color
}

const isInSchedule = computed(() => {
  if (!details.value) return false
  const courseCode = details.value.code
  const sectionId = selectedSectionId.value || null
  return hasCourseSection(courseCode, sectionId)
})

function onAddOrRemove() {
  if (!details.value) return
  const courseCode = details.value.code
  const sectionId = selectedSectionId.value || undefined
  if (isInSchedule.value) {
    removeCourseSection(courseCode, sectionId)
    return
  }
  const color = hashColorFromCode(courseCode)
  const timeSpecs = details.value.times || []
  for (const spec of timeSpecs) {
    const parsed = parseBlocksFromApiSpec(spec, details.value.title, color, courseCode, sectionId)
    for (const b of parsed) addBlock(b)
  }
}
</script>