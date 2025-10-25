import type { RawGroupedCourse, RawSection, UICourse, UICourseSection } from '../api/types'
import { normalizeSectionType, normalizeSectionId } from '@/utils/normalize'

export function mapSection(raw: RawSection): UICourseSection | null {
  const sectionId = (raw.sectionCode || '')?.toString().trim()
  if (!sectionId) return null
  return {
    sectionId,
    instructors: Array.from(new Set((raw.instructors || []).map((s) => (s || '').toString().trim()).filter(Boolean))),
    enrolled: Number(raw.registered || 0),
    capacity: Number(raw.total || 0),
    schedule: (raw.time || '').trim(),
    location: (raw.location || '').trim(),
    hasDClearance: !!raw.dClearance,
    hasPrerequisites: !!(raw.prerequisites && raw.prerequisites.length > 0),
    hasDuplicatedCredit: !!(raw.duplicatedCredits && raw.duplicatedCredits.length > 0),
    units: (() => {
      const u = raw.units as any
      if (u == null || u === '') return null
      const n = typeof u === 'number' ? u : parseFloat((u || '').toString())
      return Number.isFinite(n) ? n : null
    })(),
    type: raw.type ?? null,
  }
}

export function mapGroupedToUICourse(raw: RawGroupedCourse): UICourse | null {
  const code = (raw.courseCode || '').trim()
  const title = (raw.title || '').trim()
  if (!code || !title) return null
  const sections: UICourseSection[] = (raw.sections || [])
    .map(mapSection)
    .filter(Boolean) as UICourseSection[]
  return {
    title,
    code,
    description: (raw.description || '').trim(),
    sections,
    ge: (raw as any).GE || [],
  }
}

export function mergeSectionsById(existing: UICourseSection[], incoming: UICourseSection[]): UICourseSection[] {
  const byId = new Map<string, UICourseSection>()
  for (const s of existing || []) {
    const sid = normalizeSectionId(s.sectionId)
    if (sid) byId.set(sid, s)
  }
  for (const s of incoming || []) {
    const sid = normalizeSectionId(s.sectionId)
    if (sid && !byId.has(sid)) byId.set(sid, s)
  }
  return Array.from(byId.values())
}
