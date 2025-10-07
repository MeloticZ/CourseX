import programs from '@/assets/data/programs.json'
import coursesBySchool from '@/assets/data/courses.json'
import type { CourseDetails, RawGroupedCourse, UICourse } from '../api/types'
import { mapGroupedToUICourse, mergeSectionsById } from '../api/mappers'
import { ensureIndex, getAggregatedCourseDetails, getSectionDetailsIndexed } from '../api/indexer'
import { normalizeCourseCode } from '@/utils/normalize'

export async function listSchoolAndPrograms() {
  return programs
}

export async function listAllCourses(): Promise<UICourse[]> {
  return ensureIndex().allUICourses
}

export async function getSchoolCourses(schoolPrefix: string, programPrefix: string): Promise<UICourse[]> {
  const byCode: Record<string, UICourse> = {}
  if (!schoolPrefix || !programPrefix) return []
  try {
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
  return getAggregatedCourseDetails(courseCode)
}

export async function getSectionDetails(courseCode: string, sectionId: string): Promise<CourseDetails | null> {
  if (!courseCode || !sectionId) return null
  return getSectionDetailsIndexed(courseCode, sectionId)
}
