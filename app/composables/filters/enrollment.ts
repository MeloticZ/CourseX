import type { UICourseSection } from '@/composables/api/types'

export type EnrollmentFilter = 'any' | 'only-full' | 'only-open'

export function sectionMatchesEnrollment(section: UICourseSection, mode: EnrollmentFilter): boolean {
  if (mode === 'any') return true
  const cap = Number(section.capacity || 0)
  const enrolled = Number(section.enrolled || 0)
  const isFull = cap > 0 ? enrolled >= cap : false
  if (mode === 'only-full') return isFull
  return !isFull
}
