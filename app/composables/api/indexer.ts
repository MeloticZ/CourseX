import coursesBySchool from '@/assets/data/courses.json'
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

let cached: CourseIndex | null = null

function buildIndex(): CourseIndex {
  const byKeyMerged = new Map<string, UICourse>()
  const byCodeToSections = new Map<string, SectionEntry[]>()
  const byCodeSection = new Map<string, SectionEntry>()

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
            byKeyMerged.set(key, { ...existing, sections: mergedSections })
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
      units: firstSection.units ?? null,
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
      if (details.units == null && section.units != null) details.units = section.units
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

export function ensureIndex(): CourseIndex {
  if (!cached) cached = buildIndex()
  return cached
}

export function getAggregatedCourseDetails(code: string): CourseDetails | null {
  const idx = ensureIndex()
  const key = normalizeCourseCode(code)
  return idx.aggregatedByCode.get(key) || null
}

export function getSectionDetailsIndexed(code: string, sectionId: string): CourseDetails | null {
  const idx = ensureIndex()
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
    units: sec.units ?? null,
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
