import { computed, reactive } from 'vue'
import type { Ref } from 'vue'
import type { UICourse, UICourseSection } from '~/composables/useAPI'
import { parseBlocksFromApiSpec, parseBlocksFromString } from '~/composables/scheduleUtils'
import { useStore } from '~/composables/useStore'

export type TriState = 'any' | 'only' | 'exclude'

export type EnrollmentFilter = 'any' | 'only-full' | 'only-open'

export type CourseFiltersState = {
  searchText: string
  days: number[]
  timeStartMinutes: number | null
  timeEndMinutes: number | null
  unitsMin: number | null
  unitsMax: number | null
  courseLevelMin: number | null
  courseLevelMax: number | null
  dClearance: TriState
  prerequisites: TriState
  duplicatedCredit: TriState
  conflicts: TriState
  enrollment: EnrollmentFilter
  sectionTypes: string[]
}

function parseUnitsToNumber(units: number | string | null | undefined): number {
  if (units == null) return 0
  if (typeof units === 'number') return Number.isFinite(units) ? units : 0
  const m = (units || '').toString().match(/-?\d+(?:\.\d+)?/)
  return m ? parseFloat(m[0]) : 0
}

function normalizeString(value: string | null | undefined): string {
  return (value || '').toString().toLowerCase().trim()
}

function extractCourseLevel(code: string | null | undefined): number | null {
  const m = (code || '').toString().match(/(\d{3})/)
  const levelStr = (m && m[1]) ? m[1].toString() : ''
  if (!levelStr) return null
  return parseInt(levelStr, 10)
}

function normalizeSectionType(raw: string | null | undefined): string {
  const t = normalizeString(raw)
  if (!t) return ''
  if (t === 'disc' || t === 'dis' || t === 'discussion') return 'discussion'
  if (t === 'lec' || t === 'lecture') return 'lecture'
  if (t === 'lab') return 'lab'
  return t
}

function sectionConflictsWithSchedule(section: UICourseSection, hasCollision: (spec: string) => string[]): boolean {
  const spec = (section.schedule || '').toString()
  if (!spec) return false
  const collisions = hasCollision(spec)
  return Array.isArray(collisions) && collisions.length > 0
}

function sectionMatchesScheduleFilters(section: UICourseSection, days: number[], start: number | null, end: number | null): boolean {
  // No filters provided
  if ((!days || days.length === 0) && start == null && end == null) return true
  const spec = (section.schedule || '').toString()
  if (!spec) return false
  let blocks = parseBlocksFromApiSpec(spec)
  if (!blocks || blocks.length === 0) {
    blocks = parseBlocksFromString(spec)
  }
  if (!blocks || blocks.length === 0) return false

  const daySet = new Set(days || [])

  // If any days are selected, the section must be entirely on those days
  if (daySet.size > 0) {
    const isSubsetOfSelectedDays = blocks.every((b) => daySet.has(b.dayIndex))
    if (!isSubsetOfSelectedDays) return false
  }

  // If a time window is set, ALL meeting blocks must fully fit within the window
  if (start != null) {
    const allStartAfter = blocks.every((b) => b.startMinutes >= start)
    if (!allStartAfter) return false
  }
  if (end != null) {
    const allEndBefore = blocks.every((b) => b.endMinutes <= end)
    if (!allEndBefore) return false
  }

  return true
}

function sectionMatchesTriState(flag: boolean, state: TriState): boolean {
  if (state === 'any') return true
  if (state === 'only') return !!flag
  return !flag
}

function sectionMatchesEnrollment(section: UICourseSection, mode: EnrollmentFilter): boolean {
  if (mode === 'any') return true
  const cap = Number(section.capacity || 0)
  const enrolled = Number(section.enrolled || 0)
  const isFull = cap > 0 ? enrolled >= cap : false
  if (mode === 'only-full') return isFull
  return !isFull
}

function sectionMatchesUnits(section: UICourseSection, min: number | null, max: number | null): boolean {
  if (min == null && max == null) return true
  const u = parseUnitsToNumber(section.units)
  if (min != null && u < min) return false
  if (max != null && u > max) return false
  return true
}

function courseMatchesLevel(course: UICourse, min: number | null, max: number | null): boolean {
  if (min == null && max == null) return true
  const lvl = extractCourseLevel(course.code)
  if (lvl == null) return false
  if (min != null && lvl < min) return false
  if (max != null && lvl > max) return false
  return true
}

function courseMatchesSearch(course: UICourse, search: string): boolean {
  const s = normalizeString(search)
  if (!s) return true
  const sectionStrings = (course.sections || [])
    .flatMap((sec) => [
      sec.sectionId,
      sec.instructor,
      sec.schedule,
      sec.location,
      String(sec.units ?? ''),
      sec.type ?? '',
    ])
    .filter(Boolean)
  const haystack = [course.title, course.code, course.description, ...sectionStrings]
    .join(' ')
    .toLowerCase()
  return haystack.includes(s)
}

function sectionMatchesTypes(section: UICourseSection, types: string[]): boolean {
  if (!types || types.length === 0) return true
  const normalized = normalizeSectionType(section.type)
  if (!normalized) return false
  const target = new Set(types.map((t) => normalizeSectionType(t)))
  return target.has(normalized)
}

function someSectionMatches(
  course: UICourse,
  predicate: (section: UICourseSection) => boolean
): boolean {
  for (const s of course.sections || []) {
    if (predicate(s)) return true
  }
  return false
}

export function useCourseFilters(courses?: Ref<UICourse[]>) {
  const { checkScheduleCollision } = useStore()

  const filters = reactive<CourseFiltersState>({
    searchText: '',
    days: [],
    timeStartMinutes: null,
    timeEndMinutes: null,
    unitsMin: null,
    unitsMax: null,
    courseLevelMin: null,
    courseLevelMax: null,
    dClearance: 'any',
    prerequisites: 'any',
    duplicatedCredit: 'any',
    conflicts: 'any',
    enrollment: 'any',
    sectionTypes: [],
  })

  const isSpecialType = (sec: UICourseSection): boolean => {
    const t = normalizeSectionType(sec.type)
    return t === 'lab' || t === 'discussion'
  }

  const sectionMatchesOtherFilters = (sec: UICourseSection): boolean => {
    if (!sectionMatchesScheduleFilters(sec, filters.days, filters.timeStartMinutes, filters.timeEndMinutes)) return false
    if (!sectionMatchesTypes(sec, filters.sectionTypes)) return false
    if (!sectionMatchesTriState(sec.hasDClearance, filters.dClearance)) return false
    if (!sectionMatchesTriState(sec.hasPrerequisites, filters.prerequisites)) return false
    if (!sectionMatchesTriState(sec.hasDuplicatedCredit, filters.duplicatedCredit)) return false
    if (!sectionMatchesEnrollment(sec, filters.enrollment)) return false
    if (filters.conflicts !== 'any') {
      const conf = sectionConflictsWithSchedule(sec, checkScheduleCollision)
      if (filters.conflicts === 'only' && !conf) return false
      if (filters.conflicts === 'exclude' && conf) return false
    }
    return true
  }

  const filterSectionsForCourse = (course: UICourse): UICourseSection[] => {
    const sections = course.sections || []
    const hasUnitsFilter = filters.unitsMin != null || filters.unitsMax != null

    // If units filter is active, require at least one section to satisfy it
    if (hasUnitsFilter) {
      const anyUnitMatch = sections.some((s) => sectionMatchesUnits(s, filters.unitsMin, filters.unitsMax))
      if (!anyUnitMatch) return []
    }

    const isLecture = (s: UICourseSection) => normalizeSectionType(s.type) === 'lecture'

    // Base included sections: only non-special, must satisfy other filters, and units when applicable
    const baseIncluded: UICourseSection[] = []
    for (const s of sections) {
      if (isSpecialType(s)) continue
      if (!sectionMatchesOtherFilters(s)) continue
      if (hasUnitsFilter && !sectionMatchesUnits(s, filters.unitsMin, filters.unitsMax)) continue
      baseIncluded.push(s)
    }

    const hasLectureIncluded = baseIncluded.some((s) => isLecture(s))

    // If a lecture is included, include ALL special sections ignoring ALL filters
    const specialsIncluded: UICourseSection[] = hasLectureIncluded
      ? sections.filter((s) => isSpecialType(s))
      : []

    const finalSections = [...baseIncluded, ...specialsIncluded]
    return finalSections
  }

  const apply = (list: UICourse[]): UICourse[] => {
    if (!list || list.length === 0) return []
    const out: UICourse[] = []
    for (const course of list) {
      if (!courseMatchesSearch(course, filters.searchText)) continue
      if (!courseMatchesLevel(course, filters.courseLevelMin, filters.courseLevelMax)) continue
      const passingSections = filterSectionsForCourse(course)
      if (passingSections.length === 0) continue
      out.push({ ...course, sections: passingSections })
    }
    return out
  }

  const filteredCourses = computed<UICourse[]>(() => {
    if (!courses) return []
    return apply(courses.value || [])
  })

  const reset = () => {
    filters.searchText = ''
    filters.days = []
    filters.timeStartMinutes = null
    filters.timeEndMinutes = null
    filters.unitsMin = null
    filters.unitsMax = null
    filters.courseLevelMin = null
    filters.courseLevelMax = null
    filters.dClearance = 'any'
    filters.prerequisites = 'any'
    filters.duplicatedCredit = 'any'
    filters.conflicts = 'any'
    filters.enrollment = 'any'
    filters.sectionTypes = []
  }

  return {
    filters,
    filteredCourses,
    applyFilters: apply,
    reset,
  }
}


