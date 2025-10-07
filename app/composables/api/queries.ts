// Dynamic term-aware data loaded from public folder at runtime
import { useTermId } from '@/composables/useTermId'
import { ensureIndexAsync, getAggregatedCourseDetails, getSectionDetailsIndexed } from './indexer'
import type { CourseDetails, RawGroupedCourse, UICourse } from '../api/types'
import { mapGroupedToUICourse, mergeSectionsById } from '../api/mappers'
// removed duplicate imports from indexer
import { normalizeCourseCode } from '@/utils/normalize'

export async function listSchoolAndPrograms() {
  const { termId } = useTermId()
  try {
    const data = await $fetch(`/data/${termId.value}/programs.json`)
    return data as any
  } catch {
    throw createError({ statusCode: 404, statusMessage: 'Programs not found for term' })
  }
}

export async function listAllCourses(): Promise<UICourse[]> {
  const { termId } = useTermId()
  const idx = await ensureIndexAsync(termId.value)
  return idx.allUICourses
}

export async function getSchoolCourses(schoolPrefix: string, programPrefix: string): Promise<UICourse[]> {
  const byCode: Record<string, UICourse> = {}
  if (!schoolPrefix || !programPrefix) return []
  try {
    const { termId } = useTermId()
    const coursesBySchool = await fetchCoursesBySchool(termId.value)
    const byProgram = (coursesBySchool as Record<string, any>)[schoolPrefix]
    if (!byProgram) return []
    const list: RawGroupedCourse[] = (byProgram as Record<string, RawGroupedCourse[]>)[programPrefix] || []
    for (const raw of list) {
      const mapped = mapGroupedToUICourse(raw)
      if (!mapped) continue
      const key = `${normalizeCourseCode(mapped.code)}::${mapped.title.toString().trim().toUpperCase()}`
      const existing = byCode[key]
      if (!existing) {
        byCode[key] = mapped
      } else {
        const sections = mergeSectionsById(existing.sections || [], mapped.sections || [])
        byCode[key] = {
          title: existing.title || mapped.title,
          code: existing.code || mapped.code,
          description: existing.description || mapped.description,
          sections,
        }
      }
    }
  } catch (e) {
    // ignore
  }
  return Object.values(byCode)
}

export async function getCourseDetails(courseCode: string): Promise<CourseDetails | null> {
  if (!courseCode) return null
  const { termId } = useTermId()
  // Ensure the index for the current term is built before accessing details
  await ensureIndexAsync(termId.value)
  return getAggregatedCourseDetails(courseCode, termId.value)
}

export async function getSectionDetails(courseCode: string, sectionId: string): Promise<CourseDetails | null> {
  if (!courseCode || !sectionId) return null
  const { termId } = useTermId()
  // Ensure the index for the current term is built before accessing details
  await ensureIndexAsync(termId.value)
  return getSectionDetailsIndexed(courseCode, sectionId, termId.value)
}

async function fetchCoursesBySchool(termId: string): Promise<Record<string, any>> {
  try {
    const data = await $fetch(`/data/${termId}/courses.json`)
    return (data || {}) as any
  } catch {
    throw createError({ statusCode: 404, statusMessage: 'Courses not found for term' })
  }
}
