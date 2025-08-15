<template>
  <div class="w-full h-full border-x border-cx-border flex flex-col min-w-0 p-4">
    <div class="w-full flex flex-col gap-2 pb-3 border-cx-border">
      <span class="text-sm text-cx-text-subtle">Available Courses</span>
      <input v-model="filters.searchText" type="text" placeholder="Search Courses" class="w-full p-2 text-sm rounded-md border border-cx-border focus:outline-none focus:ring-1 focus:ring-cx-text-muted" />

      <!-- Filters -->
      <div class="w-full flex justify-center py-1">
        <div class="flex gap-4">
          <!-- All the filters can be reset to their default state via right clicking -->
          <div class="flex grid grid-cols-7 grid-rows-2 gap-1">
            <!-- The user can select to toggle days of the week (default none is selected) and if time is not specified, show only course sections on the specified dates (Do not allow courses with schedule partially on the specified days)
             They can also specify start and/or end times to filter all the days. If they specify both, the schedule must match the specified time on the specified days. -->
            <button class="w-8 h-8 text-xl font-semibold leading-none grid place-items-center bg-zebra-sm text-cx-text-weak-shimmer" title="Filter by Sunday">S</button>
            <button class="w-8 h-8 text-xl font-semibold leading-none grid place-items-center bg-zebra-sm text-cx-text-weak-shimmer" title="Filter by Monday">M</button>
            <button class="w-8 h-8 text-xl font-semibold leading-none grid place-items-center bg-zebra-sm text-cx-text-weak-shimmer" title="Filter by Tuesday">T</button>
            <button class="w-8 h-8 text-xl font-semibold leading-none grid place-items-center bg-zebra-sm text-cx-text-weak-shimmer" title="Filter by Wednesday">W</button>
            <button class="w-8 h-8 text-xl font-semibold leading-none grid place-items-center bg-zebra-sm text-cx-text-weak-shimmer" title="Filter by Thursday">H</button>
            <button class="w-8 h-8 text-xl font-semibold leading-none grid place-items-center bg-zebra-sm text-cx-text-weak-shimmer" title="Filter by Friday">F</button>
            <button class="w-8 h-8 text-xl font-semibold leading-none grid place-items-center bg-zebra-sm text-cx-text-weak-shimmer" title="Filter by Saturday">S</button>
            <input type="text" placeholder="00:00" maxlength="5" class="w-26 h-8 text-center text-xl line-clamp-1 font-semibold leading-none grid place-items-center bg-zebra-sm text-cx-text-weak-shimmer col-span-3" title="Filter by Start Time" />
            <div class="w-8 h-8 text-xl font-semibold leading-none grid place-items-center text-cx-text-weak-shimmer" title="Schedule Filter">—</div>
            <input type="text" placeholder="23:59" maxlength="5" class="w-26 h-8 text-center text-xl line-clamp-1 font-semibold leading-none grid place-items-center bg-zebra-sm text-cx-text-weak-shimmer col-span-3" title="Filter by End Time" />
          </div>
          
          <div class="flex grid grid-cols-2 grid-rows-2 grid-flow-col gap-1">
            <!-- The user can specify a minimum and/or maximum number of units for filtering -->
            <input type="text" placeholder="0" maxlength="2" class="w-8 h-8 text-center text-xl line-clamp-1 font-semibold leading-none grid place-items-center bg-zebra-sm text-cx-text-weak-shimmer" title="Filter by Minimum Units" />
            <input type="text" placeholder="16" maxlength="2" class="w-8 h-8 text-center text-xl line-clamp-1 font-semibold leading-none grid place-items-center bg-zebra-sm text-cx-text-weak-shimmer" title="Filter by Maximum Units" />
            <!-- The user can input a course level to filter by. Even though it's 3 digit input, we only look at the first one digit to determine the level (0/1/2/3/4/5/6/7/8/9)-->
            <input type="text" placeholder="5XX" maxlength="3" class="w-8 h-17 text-center text-xl text-sideways line-clamp-1 font-semibold leading-none grid place-items-center bg-zebra-sm text-cx-text-weak-shimmer row-span-2" title="Filter by Course Level" />
          </div>

          <div class="flex grid grid-cols-3 grid-rows-2 gap-1">
            <!-- You should emit visible UI indicators when the filter is toggled -->
            <!-- For these two filters, they have three filter modes, any -> only -> exclude -->
            <button class="w-8 h-8 text-xl font-semibold line-clamp-1 leading-none grid place-items-center bg-zebra-sm-rose text-rose-400" title="Showing Courses requiring D-Clearance">D</button>
            <button class="w-8 h-8 text-xl font-semibold line-clamp-1 leading-none grid place-items-center bg-zebra-sm-yellow text-yellow-400" title="Showing Courses with Prerequisites">R</button>
            <!-- The user can reset all filters to their default state -->
            <button class="w-8 h-full text-xl text-sideways font-semibold line-clamp-1 leading-none grid place-items-center bg-zebra-sm text-cx-text-weak-shimmer row-span-2" title="Reset Filters">Reset</button>
            <!-- These two filters can only be toggled on or off (any -> exclude) -->
            <button class="w-8 h-8 text-xl font-semibold line-clamp-1 leading-none grid place-items-center bg-zebra-sm text-cx-text-weak-shimmer" title="Showing Courses with Schedule Conflicts"><Icon name="uil:clock" class="h-5 w-5 text-cx-text-weak-shimmer" /></button>
            <button class="w-8 h-8 text-xl font-semibold line-clamp-1 leading-none grid place-items-center bg-zebra-sm text-cx-text-weak-shimmer" title="Showing Courses with Full Enrollment"><Icon name="uil:user" class="h-5 w-5 text-cx-text-weak-shimmer" /></button>
          </div>
        </div>
      </div>

      <div class="w-full flex justify-between items-center px-2">
        <div class="flex gap-1">
          <Icon name="uil:filter" class="rotate-180 h-4 w-4 text-cx-text-weak-muted" />
          <span class="text-xs text-cx-text-secondary">Filters</span>
        </div>
        <span class="text-xs text-cx-text-secondary">{{ filteredCourses.length }} courses found</span>
      </div>
    </div>

    <div ref="scrollContainerRef" class="w-full grow overflow-y-auto overflow-x-hidden min-w-0">
      <div class="w-full flex flex-col gap-3 min-w-0">
        <template v-for="(course, i) in visibleCourses" :key="visibleKey(course, i)">
          <div :ref="(el) => onRowRef(el, startIndex + i)" :data-row-index="startIndex + i">
            <CourseCard
              data-card
              :title="course.title"
              :code="course.code"
              :description="course.description"
              :sections="course.sections"
              @section-click="(sid) => onSectionClick(course.code, sid)"
            />
          </div>
        </template>
        <div :style="{ height: bottomPadding + 'px' }"></div>
      </div>
    </div>
    
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch, nextTick, onBeforeUnmount } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import { listAllCourses, getSchoolCourses, type UICourse } from '~/composables/useAPI'
import { useStore } from '~/composables/useStore'
import { useCourseFilters } from '~/composables/useCourseFilters'

const route = useRoute()
const router = useRouter()
const { scheduledCourses } = useStore()

// Persist scroll position per program scope across remounts
const middleScrollTopMap = useState<Record<string, number>>('ui:scroll:middle', () => ({}))

const currentScopeKey = () => {
  const parts = (route.params.slug as string[] | undefined) || []
  if (parts[0] === 'all') return 'all'
  if ((parts?.length || 0) >= 2) return `${parts[0]}/${parts[1]}`
  return 'unknown'
}

const courses = ref<UICourse[]>([])
const { filters, filteredCourses } = useCourseFilters(courses)

// Route-aware data loading
type ModeAll = { mode: 'all'; courseCode: string | null; sectionId: string | null }
type ModeScheduled = { mode: 'scheduled'; courseCode: string | null; sectionId: string | null }
type ModeProgram = { mode: 'program'; school: string; program: string; courseCode: string | null; sectionId: string | null }
type ModeUnknown = { mode: 'unknown' }
type RouteMode = ModeAll | ModeScheduled | ModeProgram | ModeUnknown

const parseSlug = (): RouteMode => {
  const parts = (route.params.slug as string[] | undefined) || []
  if (parts.length === 0) return { mode: 'unknown' }
  if (parts[0] === 'all') {
    return { mode: 'all', courseCode: parts[1] || null, sectionId: parts[2] || null }
  }
  if (parts[0] === 'scheduled') {
    return { mode: 'scheduled', courseCode: parts[1] || null, sectionId: parts[2] || null }
  }
  if (parts.length >= 2) {
    return { mode: 'program', school: parts[0] as string, program: parts[1] as string, courseCode: parts[2] || null, sectionId: parts[3] || null }
  }
  return { mode: 'unknown' }
}

const loadCourses = async () => {
  const parsed = parseSlug()
  if (parsed.mode === 'all' || parsed.mode === 'unknown') {
    courses.value = await listAllCourses()
  } else if (parsed.mode === 'scheduled') {
    courses.value = [...scheduledCourses.value]
  } else if (parsed.mode === 'program') {
    courses.value = await getSchoolCourses(parsed.school, parsed.program)
  }
}

watch(
  () => route.fullPath,
  () => {
    loadCourses().then(() => {
      // Recompute viewport after data changes
      nextTick(updateViewport)
    })
  },
  { immediate: true }
)

// Keep scheduled list in sync when on the scheduled route
watch(scheduledCourses, () => {
  const parsed = parseSlug()
  if (parsed.mode === 'scheduled') {
    courses.value = [...scheduledCourses.value]
    nextTick(updateViewport)
  }
})

// Filtering handled by useCourseFilters

// Variable-height virtualization
const scrollContainerRef = ref<HTMLElement | null>(null)
const defaultItemHeight = 120
const itemHeights = ref<number[]>([])
const startIndex = ref(0)
const endIndex = ref(0)
const bufferPx = 3 * defaultItemHeight

const ensureHeightsArray = () => {
  const n = filteredCourses.value.length
  if (itemHeights.value.length !== n) {
    const next: number[] = new Array(n)
    for (let i = 0; i < n; i++) next[i] = itemHeights.value[i] || defaultItemHeight
    itemHeights.value = next
  }
}

const sumHeights = (from: number, toExclusive: number) => {
  let total = 0
  for (let i = from; i < toExclusive; i++) total += itemHeights.value[i] || defaultItemHeight
  return total
}

const totalContentHeight = computed(() => {
  ensureHeightsArray()
  return sumHeights(0, itemHeights.value.length)
})

const topPadding = computed(() => sumHeights(0, startIndex.value))

const bottomPadding = computed(() => {
  const visibleCount = Math.max(endIndex.value - startIndex.value, 0)
  const visibleHeight = sumHeights(startIndex.value, startIndex.value + visibleCount)
  const remaining = Math.max(totalContentHeight.value - topPadding.value - visibleHeight, 0)
  return remaining
})

const visibleCourses = computed(() => filteredCourses.value.slice(startIndex.value, endIndex.value))

function findStartIndexForScroll(scrollTop: number): number {
  ensureHeightsArray()
  const n = itemHeights.value.length
  let acc = 0
  const target = Math.max(scrollTop - bufferPx, 0)
  for (let i = 0; i < n; i++) {
    const h = itemHeights.value[i] || defaultItemHeight
    if (acc + h > target) return i
    acc += h
  }
  return n
}

function findEndIndexForViewport(start: number, viewportHeight: number, initialOffsetPx: number): number {
  ensureHeightsArray()
  const n = itemHeights.value.length
  let acc = 0
  // We need to cover the viewport height PLUS our overscan buffer, starting from the
  // current scroll position which may be inside the first rendered item. Account for
  // the intra-item offset so we render enough rows to visually fill the viewport.
  const extra = Math.max(initialOffsetPx, 0)
  const target = viewportHeight + bufferPx + extra
  let i = start
  while (i < n && acc < target) {
    acc += itemHeights.value[i] || defaultItemHeight
    i++
  }
  return i
}

const updateViewport = () => {
  const container = scrollContainerRef.value
  if (!container) return
  const height = container.clientHeight || 0
  const scrollTop = container.scrollTop || 0
  // Track scroll position for persistence scoped to current program
  const key = currentScopeKey()
  middleScrollTopMap.value = {
    ...middleScrollTopMap.value,
    [key]: scrollTop,
  }
  const first = Math.max(findStartIndexForScroll(scrollTop), 0)
  // How far into the first rendered item the current scrollTop is positioned.
  const prefixBeforeFirst = sumHeights(0, first)
  const intraFirstOffset = Math.max(scrollTop - prefixBeforeFirst, 0)
  const lastExclusive = Math.min(
    findEndIndexForViewport(first, height, intraFirstOffset),
    filteredCourses.value.length
  )
  startIndex.value = first
  endIndex.value = lastExclusive
}

function onRowRef(el: Element | ComponentPublicInstance | null, globalIndex: number) {
  if (!el || globalIndex == null) return
  // Measure on next tick to ensure layout has settled
  nextTick(() => {
    const rootEl = (el as any)?.$el ? ((el as any).$el as HTMLElement) : (el as HTMLElement)
    if (!rootEl || !(rootEl instanceof HTMLElement)) return
    const rect = rootEl.getBoundingClientRect()
    const h = Math.max(Math.ceil(rect.height), 1)
    if (!Number.isFinite(h) || h <= 0) return
    if (itemHeights.value[globalIndex] !== h) {
      itemHeights.value[globalIndex] = h
      updateViewport()
    }
  })
}

onMounted(() => {
  const container = scrollContainerRef.value
  if (container) {
    container.addEventListener('scroll', updateViewport, { passive: true })
    // Restore previous scroll position if available for current scope
    const key = currentScopeKey()
    const saved = middleScrollTopMap.value[key] || 0
    if (saved > 0) container.scrollTop = saved
  }
  updateViewport()
  // Initial measurement happens via onRowRef as rows render
})

onBeforeUnmount(() => {
  const container = scrollContainerRef.value
  if (container) {
    // Save the latest scroll position
    const key = currentScopeKey()
    const scrollTop = container.scrollTop || 0
    middleScrollTopMap.value = {
      ...middleScrollTopMap.value,
      [key]: scrollTop,
    }
    container.removeEventListener('scroll', updateViewport)
  }
})

watch(filteredCourses, () => {
  // Reset heights array to match new list length while preserving any existing measurements
  ensureHeightsArray()
  nextTick(() => {
    updateViewport()
  })
})

// Click to navigate
const { selectCourse } = useCourseSelection()

const onSectionClick = (courseCode: string, sectionId: string) => {
  const parsed = parseSlug()
  selectCourse(courseCode, sectionId || null)
  if (parsed.mode === 'all' || parsed.mode === 'unknown') {
    router.push(`/course/all/${encodeURIComponent(courseCode)}/${encodeURIComponent(sectionId || 'section')}`)
  } else if (parsed.mode === 'scheduled') {
    router.push(`/course/scheduled/${encodeURIComponent(courseCode)}/${encodeURIComponent(sectionId || 'section')}`)
  } else {
    router.push(`/course/${encodeURIComponent(parsed.school)}/${encodeURIComponent(parsed.program)}/${encodeURIComponent(courseCode)}/${encodeURIComponent(sectionId || 'section')}`)
  }
}

const visibleKey = (course: UICourse, i: number) => `${startIndex.value + i}-${course.code}`
</script>

<style scoped>
</style>