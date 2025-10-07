import type { UICourseSection } from '@/composables/api/types'
import { parseBlocksFromApiSpec, parseBlocksFromString } from '@/composables/scheduleUtils'

export function sectionMatchesScheduleFilters(
  section: UICourseSection,
  days: number[],
  start: number | null,
  end: number | null
): boolean {
  if ((!days || days.length === 0) && start == null && end == null) return true
  const spec = (section.schedule || '').toString()
  if (!spec) return false
  let blocks = parseBlocksFromApiSpec(spec)
  if (!blocks || blocks.length === 0) blocks = parseBlocksFromString(spec)
  if (!blocks || blocks.length === 0) return false

  const daySet = new Set(days || [])
  if (daySet.size > 0) {
    const isSubsetOfSelectedDays = blocks.every((b) => daySet.has(b.dayIndex))
    if (!isSubsetOfSelectedDays) return false
  }

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

export function sectionMatchesTriState(flag: boolean, state: 'any' | 'only' | 'exclude'): boolean {
  if (state === 'any') return true
  if (state === 'only') return !!flag
  return !flag
}
