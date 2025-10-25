import { useTermId } from '@/composables/useTermId'
import type { CourseDetails, RawGroupedCourse, RawSection, UICourse, UICourseSection } from '../api/types'
import { mapGroupedToUICourse, mergeSectionsById } from '../api/mappers'
import { normalizeCourseCode, normalizeSectionId } from '@/utils/normalize'

type SectionEntry = { course: RawGroupedCourse; section: RawSection }

type CourseIndex = {
  allUICourses: UICourse[]
  byCodeToSections: Map<string, SectionEntry[]>
  byCodeSection: Map<string, SectionEntry>
  aggregatedByCode: Map<string, CourseDetails>
}

const cachedByTerm = new Map<string, CourseIndex>()

async function loadCoursesBySchool(termId: string): Promise<Record<string, any>> {
  const data = await $fetch(`/data/${termId}/courses.json`)
  if (!data) {
    throw createError({ statusCode: 404, statusMessage: 'Courses not found for term' })
  }
  return (data || {}) as any
}

async function buildIndex(termId: string): Promise<CourseIndex> {
  const byKeyMerged = new Map<string, UICourse>()
  const byCodeToSections = new Map<string, SectionEntry[]>()
  const byCodeSection = new Map<string, SectionEntry>()

  const coursesBySchool = await loadCoursesBySchool(termId)
  const schools = Object.keys(coursesBySchool as Record<string, unknown>)
  for (const schoolPrefix of schools) {
    const byProgram = (coursesBySchool as Record<string, any>)[schoolPrefix] as Record<string, RawGroupedCourse[]>
    if (!byProgram) continue
    const programs = Object.keys(byProgram)
    for (const programPrefix of programs) {
      const list = byProgram[programPrefix] || []
      for (const raw of list) {
        const mapped = mapGroupedToUICourse(raw)
        if (mapped) {
          const key = `${normalizeCourseCode(mapped.code)}::${mapped.title.toString().trim().toUpperCase()}`
          const existing = byKeyMerged.get(key)
          if (!existing) {
            byKeyMerged.set(key, mapped)
          } else {
            const mergedSections = mergeSectionsById(existing.sections || [], mapped.sections || [])
            const mergedGe = Array.from(new Set([...(existing.ge || []), ...(mapped.ge || [])]))
            byKeyMerged.set(key, { ...existing, sections: mergedSections, ge: mergedGe })
          }
        }

        const code = normalizeCourseCode(raw.courseCode || '')
        const sections = raw.sections || []
        for (const s of sections) {
          const sid = normalizeSectionId((s.sectionCode || '') as string)
          if (!sid || !code) continue
          const entry: SectionEntry = { course: raw, section: s }
          const arr = byCodeToSections.get(code) || []
          arr.push(entry)
          byCodeToSections.set(code, arr)
          const k = `${code}#${sid}`
          if (!byCodeSection.has(k)) byCodeSection.set(k, entry)
        }
      }
    }
  }

  const allUICourses = Array.from(byKeyMerged.values())

  const aggregatedByCode = new Map<string, CourseDetails>()
  for (const [code, entries] of byCodeToSections) {
    if (!entries || entries.length === 0) continue
    const first = entries[0]
    if (!first) continue
    const firstCourse = first.course
    const firstSection = first.section
    const details: CourseDetails = {
      title: (firstCourse.title || '').toString().trim(),
      code: (firstCourse.courseCode || '').toString().trim(),
      description: (firstCourse.description || '').toString().trim(),
      instructors: Array.from(new Set((firstSection.instructors || []))).map((s) => (s || '').toString().trim()).filter(Boolean),
      units: (() => {
        const u = firstSection.units as any
        if (u == null || u === '') return null
        const n = typeof u === 'number' ? u : parseFloat((u || '').toString())
        return Number.isFinite(n) ? n : null
      })(),
      enrolled: Number(firstSection.registered || 0),
      capacity: Number(firstSection.total || 0),
      times: firstSection.time ? [firstSection.time] : [],
      locations: firstSection.location ? [firstSection.location] : [],
      duplicatedCredits: Array.from(new Set(firstSection.duplicatedCredits || [])),
      prerequisites: Array.from(new Set(firstSection.prerequisites || [])),
      dClearance: !!firstSection.dClearance,
      type: firstSection.type ?? null,
    }
    for (const { section } of entries) {
      details.instructors = Array.from(new Set([...(details.instructors || []), ...((section.instructors || []))]))
      details.enrolled += Number(section.registered || 0)
      details.capacity += Number(section.total || 0)
      if (section.time) details.times.push(section.time)
      if (section.location) details.locations.push(section.location)
      details.duplicatedCredits = Array.from(new Set([...(details.duplicatedCredits || []), ...((section.duplicatedCredits || []))]))
      details.prerequisites = Array.from(new Set([...(details.prerequisites || []), ...((section.prerequisites || []))]))
      details.dClearance = details.dClearance || !!section.dClearance
      if (details.units == null && section.units != null) {
        const u = section.units as any
        const n = typeof u === 'number' ? u : parseFloat((u || '').toString())
        details.units = Number.isFinite(n) ? n : details.units
      }
      if (details.type == null && section.type != null) details.type = section.type
    }
    details.times = Array.from(new Set(details.times))
    details.locations = Array.from(new Set(details.locations))
    aggregatedByCode.set(code, details)
  }

  return {
    allUICourses,
    byCodeToSections,
    byCodeSection,
    aggregatedByCode,
  }
}

export function ensureIndex(termId?: string): CourseIndex {
  const id = termId || '20261'
  const existing = cachedByTerm.get(id)
  if (!existing) throw new Error('Index not built yet for term: ' + id)
  return existing
}

export async function ensureIndexAsync(termId?: string): Promise<CourseIndex> {
  const id = termId || '20261'
  const existing = cachedByTerm.get(id)
  if (existing) return existing
  const built = await buildIndex(id)
  cachedByTerm.set(id, built)
  return built
}

export function getAggregatedCourseDetails(code: string, termId?: string): CourseDetails | null {
  const idx = ensureIndex(termId)
  const key = normalizeCourseCode(code)
  return idx.aggregatedByCode.get(key) || null
}

export function getSectionDetailsIndexed(code: string, sectionId: string, termId?: string): CourseDetails | null {
  const idx = ensureIndex(termId)
  const c = normalizeCourseCode(code)
  const s = normalizeSectionId(sectionId)
  const entry = idx.byCodeSection.get(`${c}#${s}`)
  if (!entry) return null
  const course = entry.course
  const sec = entry.section
  return {
    title: (course.title || '').toString().trim(),
    code: (course.courseCode || '').toString().trim(),
    description: (course.description || '').toString().trim(),
    instructors: Array.from(new Set(sec.instructors || [])),
    units: (() => {
      const u = sec.units as any
      if (u == null || u === '') return null
      const n = typeof u === 'number' ? u : parseFloat((u || '').toString())
      return Number.isFinite(n) ? n : null
    })(),
    enrolled: Number(sec.registered || 0),
    capacity: Number(sec.total || 0),
    times: sec.time ? [sec.time] : [],
    locations: sec.location ? [sec.location] : [],
    duplicatedCredits: Array.from(new Set(sec.duplicatedCredits || [])),
    prerequisites: Array.from(new Set(sec.prerequisites || [])),
    dClearance: !!sec.dClearance,
    type: sec.type ?? null,
  }
}
