import { computed, watch } from 'vue'
import type { UICourse, UICourseSection } from '~/composables/useAPI'

type Initializer<T> = () => T

export function useStore() {
  const initFlags = useState<Record<string, boolean>>('ui:store:initFlags', () => ({}))

  function usePersistentState<T>(nuxtKey: string, storageKey: string, initialize: Initializer<T>) {
    const state = useState<T>(nuxtKey, initialize)
    const flags = initFlags.value

    if (process.client && !flags[nuxtKey]) {
      try {
        const raw = localStorage.getItem(storageKey)
        if (raw != null) {
          const parsed = JSON.parse(raw) as T
          state.value = parsed as T
        }
      } catch (e) {
        // ignore
      }

      watch(
        state,
        (val) => {
          try {
            localStorage.setItem(storageKey, JSON.stringify(val))
          } catch (e) {
            // ignore
          }
        },
        { deep: true }
      )

      flags[nuxtKey] = true
      initFlags.value = { ...flags }
    }

    return state
  }

  // Common app states
  const selectedCourseCode = usePersistentState<string | null>(
    'ui:selectedCourseCode',
    'ui:selectedCourseCode:v1',
    () => null
  )
  const selectedSectionId = usePersistentState<string | null>(
    'ui:selectedSectionId',
    'ui:selectedSectionId:v1',
    () => null
  )

  // Scheduled courses (persisted)
  // Stored as a map keyed by course code for easy updates
  const scheduledCoursesMap = usePersistentState<Record<string, UICourse>>(
    'ui:scheduled:courses',
    'ui:scheduled:courses:v1',
    () => ({})
  )

  const scheduledCourses = computed<UICourse[]>(() => Object.values(scheduledCoursesMap.value || {}))

  // Total scheduled units/credits across all scheduled sections
  const totalScheduledUnits = computed<number>(() => {
    try {
      const courses = Object.values(scheduledCoursesMap.value || {})
      let sum = 0
      const parseUnits = (units: number | string | null | undefined): number => {
        if (units == null) return 0
        if (typeof units === 'number') return isFinite(units) ? units : 0
        const m = (units || '').toString().match(/-?\d+(?:\.\d+)?/)
        return m ? parseFloat(m[0]) : 0
      }
      for (const course of courses) {
        for (const section of course.sections || []) {
          sum += parseUnits(section.units)
        }
      }
      return Number.isFinite(sum) ? sum : 0
    } catch (e) {
      return 0
    }
  })

  const totalScheduledUnitsLabel = computed<string>(() => `${totalScheduledUnits.value.toFixed(1)} credits`)

  function upsertScheduledSection(course: { code: string; title: string; description: string }, section: UICourseSection) {
    const code = (course.code || '').toString().trim().toUpperCase()
    if (!code) return
    const existing = scheduledCoursesMap.value[code] || {
      title: course.title,
      code,
      description: course.description || '',
      sections: [],
    }
    // replace any existing section with same sectionId
    const nextSections = (existing.sections || []).filter((s) => s.sectionId !== section.sectionId)
    nextSections.push({ ...section })
    scheduledCoursesMap.value = {
      ...scheduledCoursesMap.value,
      [code]: { ...existing, title: course.title, description: course.description || '', sections: nextSections },
    }
  }

  function hasScheduled(courseCode?: string | null, sectionId?: string | null): boolean {
    const code = (courseCode || '').toString().trim().toUpperCase()
    if (!code) return false
    const course = scheduledCoursesMap.value[code]
    if (!course) return false
    const sid = (sectionId || '').toString().trim().toUpperCase()
    if (!sid) return (course.sections || []).length > 0
    return (course.sections || []).some((s) => (s.sectionId || '').toString().trim().toUpperCase() === sid)
  }

  function removeScheduledSection(courseCode?: string | null, sectionId?: string | null) {
    const code = (courseCode || '').toString().trim().toUpperCase()
    if (!code) return
    const course = scheduledCoursesMap.value[code]
    if (!course) return
    if (!sectionId) {
      const map = { ...scheduledCoursesMap.value }
      delete map[code]
      scheduledCoursesMap.value = map
      return
    }
    const sid = (sectionId || '').toString().trim().toUpperCase()
    const nextSections = (course.sections || []).filter((s) => (s.sectionId || '').toString().trim().toUpperCase() !== sid)
    if (nextSections.length === 0) {
      const map = { ...scheduledCoursesMap.value }
      delete map[code]
      scheduledCoursesMap.value = map
    } else {
      scheduledCoursesMap.value = { ...scheduledCoursesMap.value, [code]: { ...course, sections: nextSections } }
    }
  }

  return {
    usePersistentState,
    selectedCourseCode,
    selectedSectionId,
    // scheduled API
    scheduledCourses,
    upsertScheduledSection,
    hasScheduled,
    removeScheduledSection,
    totalScheduledUnits,
    totalScheduledUnitsLabel,
  }
}

