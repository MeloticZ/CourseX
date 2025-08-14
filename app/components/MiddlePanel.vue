<template>
  <div class="w-full h-full border-x border-cx-border flex flex-col min-w-0">

    <div class="w-full flex flex-col gap-2 p-4 pb-2 border-b border-cx-border">
      <span class="text-sm text-cx-text-subtle">Available Courses</span>
      <input v-model="query" type="text" placeholder="Search Courses" class="w-full p-2 text-sm rounded-md border border-cx-border focus:outline-none focus:ring-1 focus:ring-cx-text-muted" />

      <div class="w-full flex flex-col justify-center items-center">
        <span class="text-xs text-cx-text-secondary">{{ filteredCourses.length }} courses found</span>
      </div>
    </div>

    <div ref="scrollContainerRef" class="w-full p-4 grow overflow-y-auto overflow-x-hidden min-w-0">
      <div class="w-full flex flex-col gap-4 min-w-0">
        <div :style="{ height: topPadding + 'px' }"></div>
        <template v-for="(course, i) in visibleCourses" :key="visibleKey(course, i)">
          <CourseCard
            data-card
            :title="course.title"
            :code="course.code"
            :instructor="course.instructor"
            :enrolled="course.enrolled"
            :capacity="course.capacity"
            :schedule="course.schedule"
            :location="course.location"
            :description="course.description"
            :tags="course.tags"
            @click="onCourseClick(course)"
          />
        </template>
        <div :style="{ height: bottomPadding + 'px' }"></div>
      </div>
    </div>
    
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch, nextTick, onBeforeUnmount } from 'vue'
import { listAllCourses, getSchoolCourses, type UICourse, type Tag } from '~/composables/useAPI'

const route = useRoute()
const router = useRouter()

// Persist scroll position per program scope across remounts
const middleScrollTopMap = useState<Record<string, number>>('ui:scroll:middle', () => ({}))

const currentScopeKey = () => {
  const parts = (route.params.slug as string[] | undefined) || []
  if (parts[0] === 'all') return 'all'
  if ((parts?.length || 0) >= 2) return `${parts[0]}/${parts[1]}`
  return 'unknown'
}

const query = ref('')
const courses = ref<UICourse[]>([])

// Route-aware data loading
type ModeAll = { mode: 'all'; courseCode: string | null; sectionId: string | null }
type ModeProgram = { mode: 'program'; school: string; program: string; courseCode: string | null; sectionId: string | null }
type ModeUnknown = { mode: 'unknown' }
type RouteMode = ModeAll | ModeProgram | ModeUnknown

const parseSlug = (): RouteMode => {
  const parts = (route.params.slug as string[] | undefined) || []
  if (parts.length === 0) return { mode: 'unknown' }
  if (parts[0] === 'all') {
    return { mode: 'all', courseCode: parts[1] || null, sectionId: parts[2] || null }
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

// Text search
const normalize = (value: string) => value.toLowerCase().trim()

const filteredCourses = computed(() => {
  const search = normalize(query.value)
  if (!search) return courses.value
  return courses.value.filter((c) => {
    const haystack = [
      c.title,
      c.code,
      c.instructor,
      c.schedule,
      c.location,
      c.description,
      (c.tags || []).map((t: Tag) => t.text).join(' '),
    ]
      .join(' ')
      .toLowerCase()
    return haystack.includes(search)
  })
})

// Simple list virtualization
const scrollContainerRef = ref<HTMLElement | null>(null)
const itemHeight = ref(104) // estimated per-item height; updated after measure
const containerHeight = ref(600)
const startIndex = ref(0)
const endIndex = ref(0)
const buffer = 6

const totalContentHeight = computed(() => filteredCourses.value.length * itemHeight.value)
const topPadding = computed(() => startIndex.value * itemHeight.value)
const bottomPadding = computed(() => {
  const renderedCount = endIndex.value - startIndex.value
  const remainingCount = filteredCourses.value.length - (startIndex.value + renderedCount)
  return Math.max(remainingCount * itemHeight.value, 0)
})

const visibleCourses = computed(() => filteredCourses.value.slice(startIndex.value, endIndex.value))

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
  containerHeight.value = height
  const first = Math.max(Math.floor(scrollTop / itemHeight.value) - buffer, 0)
  const visibleCount = Math.ceil(height / itemHeight.value) + buffer * 2
  const lastExclusive = Math.min(first + visibleCount, filteredCourses.value.length)
  startIndex.value = first
  endIndex.value = lastExclusive
}

const measureItemHeight = () => {
  // Try to measure a card after render for better accuracy
  nextTick(() => {
    const container = scrollContainerRef.value
    if (!container) return
    const firstCard = container.querySelector('[data-card]') as HTMLElement | null
    if (firstCard) {
      const rect = firstCard.getBoundingClientRect()
      if (rect.height > 0) itemHeight.value = Math.ceil(rect.height + 16)
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
  measureItemHeight()
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
  updateViewport()
  measureItemHeight()
})

// Click to navigate
const { selectCourse } = useCourseSelection()

const onCourseClick = (course: UICourse) => {
  const parsed = parseSlug()
  selectCourse(course.code, course.sectionId || null)
  if (parsed.mode === 'all' || parsed.mode === 'unknown') {
    router.push(`/course/all/${encodeURIComponent(course.code)}/${encodeURIComponent(course.sectionId || 'section')}`)
  } else {
    router.push(`/course/${encodeURIComponent(parsed.school)}/${encodeURIComponent(parsed.program)}/${encodeURIComponent(course.code)}/${encodeURIComponent(course.sectionId || 'section')}`)
  }
}

const visibleKey = (course: UICourse, i: number) => `${startIndex.value + i}-${course.code}-${course.sectionId || ''}`
</script>

<style scoped>
</style>