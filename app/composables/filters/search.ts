import type { UICourse } from '@/composables/api/types'
import { normalizeString } from './normalize'

export function courseMatchesSearch(course: UICourse, search: string): boolean {
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
