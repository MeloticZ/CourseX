import { ref, computed, watch } from 'vue'
import type { Ref } from 'vue'
import { listAllCourses, getSchoolCourses, type UICourse } from '~/composables/useAPI'
import { useStore } from '~/composables/useStore'

type ModeAll = { mode: 'all'; courseCode: string | null; sectionId: string | null }
type ModeScheduled = { mode: 'scheduled'; courseCode: string | null; sectionId: string | null }
type ModeProgram = { mode: 'program'; school: string; program: string; courseCode: string | null; sectionId: string | null }
type ModeUnknown = { mode: 'unknown' }
export type RouteMode = ModeAll | ModeScheduled | ModeProgram | ModeUnknown

export function useCourseListSource() {
  const route = useRoute()
  const { scheduledCourses } = useStore()

  const courses: Ref<UICourse[]> = ref([])

  const mode = computed<RouteMode>(() => {
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
  })

  const scopeKey = computed<string>(() => {
    const parts = (route.params.slug as string[] | undefined) || []
    if (parts[0] === 'all') return 'all'
    if (parts[0] === 'scheduled') return 'scheduled'
    if ((parts?.length || 0) >= 2) return `${parts[0]}/${parts[1]}`
    return 'unknown'
  })

  const reload = async () => {
    const m = mode.value
    if (m.mode === 'all' || m.mode === 'unknown') {
      courses.value = await listAllCourses()
      return
    }
    if (m.mode === 'scheduled') {
      courses.value = [...scheduledCourses.value]
      return
    }
    if (m.mode === 'program') {
      courses.value = await getSchoolCourses(m.school, m.program)
      return
    }
  }

  watch(
    () => route.fullPath,
    () => {
      reload()
    },
    { immediate: true }
  )

  watch(scheduledCourses, () => {
    const m = mode.value
    if (m.mode === 'scheduled') {
      courses.value = [...scheduledCourses.value]
    }
  })

  return {
    courses,
    reload,
    mode,
    scopeKey,
  }
}


