// API calls

import programs from '~/assets/data/programs.json'
import coursesBySchool from '~/assets/data/courses.json'

// listSchoolAndPrograms
export async function listSchoolAndPrograms() {
  return programs
}

// New grouped UI types
export type UICourseSection = {
  sectionId: string
  instructor: string
  enrolled: number
  capacity: number
  schedule: string
  location: string
  hasDClearance: boolean
  hasPrerequisites: boolean
  hasDuplicatedCredit: boolean
  units?: number | string | null
  type?: string | null
}

export type UICourse = {
  title: string
  code: string
  description: string
  sections: UICourseSection[]
}

// Source JSON (generator output) types
type RawSection = {
  sectionCode?: string | null
  instructors?: string[]
  units?: number | string | null
  total?: number | null
  registered?: number | null
  location?: string | null
  time?: string | null
  duplicatedCredits?: string[]
  prerequisites?: string[]
  dClearance?: boolean
  type?: string | null
}

type RawGroupedCourse = {
  title?: string
  description?: string
  courseCode?: string
  sections?: RawSection[]
}

function mapSection(raw: RawSection): UICourseSection | null {
  const sectionId = (raw.sectionCode || '')?.toString().trim()
  if (!sectionId) return null
  return {
    sectionId,
    instructor: (raw.instructors?.join(', ') || 'TBA').trim(),
    enrolled: Number(raw.registered || 0),
    capacity: Number(raw.total || 0),
    schedule: (raw.time || '').trim(),
    location: (raw.location || '').trim(),
    hasDClearance: !!raw.dClearance,
    hasPrerequisites: !!(raw.prerequisites && raw.prerequisites.length > 0),
    hasDuplicatedCredit: !!(raw.duplicatedCredits && raw.duplicatedCredits.length > 0),
    units: raw.units ?? null,
    type: raw.type ?? null,
  }
}

function mapGroupedToUICourse(raw: RawGroupedCourse): UICourse | null {
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
  }
}

// listAllCourses
export async function listAllCourses(): Promise<UICourse[]> {
  const results: UICourse[] = []
  try {
    const schoolPrefixes = Object.keys(coursesBySchool as Record<string, unknown>)
    for (const schoolPrefix of schoolPrefixes) {
      const byProgram = (coursesBySchool as Record<string, any>)[schoolPrefix] as Record<string, RawGroupedCourse[]>
      if (!byProgram) continue
      const programPrefixes = Object.keys(byProgram)
      for (const programPrefix of programPrefixes) {
        const list = byProgram[programPrefix] || []
        for (const raw of list) {
          const mapped = mapGroupedToUICourse(raw)
          if (mapped) results.push(mapped)
        }
      }
    }
  } catch (e) {
    // swallow and return what we have
  }
  return results
}

// getCourseDetails
export type CourseDetails = {
  title: string
  code: string
  description: string
  instructors: string[]
  units?: number | string | null
  enrolled: number
  capacity: number
  times: string[]
  locations: string[]
  duplicatedCredits: string[]
  prerequisites: string[]
  dClearance: boolean
  type: string | null
}

export async function getCourseDetails(courseCode: string): Promise<CourseDetails | null> {
  if (!courseCode) return null
  const normalize = (s: string) => (s || '').trim().toUpperCase()
  const target = normalize(courseCode)

  let aggregated: CourseDetails | null = null

  try {
    const schoolPrefixes = Object.keys(coursesBySchool as Record<string, unknown>)
    for (const schoolPrefix of schoolPrefixes) {
      const byProgram = (coursesBySchool as Record<string, any>)[schoolPrefix] as Record<string, RawGroupedCourse[]>
      if (!byProgram) continue
      const programPrefixes = Object.keys(byProgram)
      for (const programPrefix of programPrefixes) {
        const list = byProgram[programPrefix] || []
        for (const course of list) {
          if (normalize(course.courseCode || '') !== target) continue
          const sections = course.sections || []
          if (!aggregated) {
            // seed from first section if present, else from course
            const first = sections[0] || {}
            aggregated = {
              title: (course.title || '').trim(),
              code: (course.courseCode || '').trim(),
              description: (course.description || '').trim(),
              instructors: Array.from(new Set(first.instructors || [])),
              units: first.units ?? null,
              enrolled: Number(first.registered || 0),
              capacity: Number(first.total || 0),
              times: first.time ? [first.time] : [],
              locations: first.location ? [first.location] : [],
              duplicatedCredits: Array.from(new Set(first.duplicatedCredits || [])),
              prerequisites: Array.from(new Set(first.prerequisites || [])),
              dClearance: !!first.dClearance,
              type: first.type ?? null,
            }
          }
          // aggregate across sections
          for (const s of sections) {
            aggregated.instructors = Array.from(new Set([...(aggregated.instructors || []), ...((s.instructors || []))]))
            aggregated.enrolled += Number(s.registered || 0)
            aggregated.capacity += Number(s.total || 0)
            if (s.time) aggregated.times.push(s.time)
            if (s.location) aggregated.locations.push(s.location)
            aggregated.duplicatedCredits = Array.from(new Set([...(aggregated.duplicatedCredits || []), ...((s.duplicatedCredits || []))]))
            aggregated.prerequisites = Array.from(new Set([...(aggregated.prerequisites || []), ...((s.prerequisites || []))]))
            aggregated.dClearance = aggregated.dClearance || !!s.dClearance
            if (aggregated.units == null && s.units != null) aggregated.units = s.units
            if (aggregated.type == null && s.type != null) aggregated.type = s.type
          }
        }
      }
    }
  } catch (e) {
    return null
  }

  if (!aggregated) return null

  // dedupe and normalize lists
  aggregated.times = Array.from(new Set(aggregated.times))
  aggregated.locations = Array.from(new Set(aggregated.locations))
  return aggregated
}

// getSectionDetails
export async function getSectionDetails(courseCode: string, sectionId: string): Promise<CourseDetails | null> {
  if (!courseCode || !sectionId) return null
  const normalize = (s: string) => (s || '').toString().trim().toUpperCase()
  const targetCode = normalize(courseCode)
  const targetSection = normalize(sectionId)

  try {
    const schoolPrefixes = Object.keys(coursesBySchool as Record<string, unknown>)
    for (const schoolPrefix of schoolPrefixes) {
      const byProgram = (coursesBySchool as Record<string, any>)[schoolPrefix] as Record<string, RawGroupedCourse[]>
      if (!byProgram) continue
      const programPrefixes = Object.keys(byProgram)
      for (const programPrefix of programPrefixes) {
        const list = byProgram[programPrefix] || []
        for (const course of list) {
          const rawCode = normalize(course.courseCode || '')
          if (rawCode !== targetCode) continue
          for (const s of course.sections || []) {
            const rawSection = normalize((s.sectionCode || '') as string)
            if (!rawSection || rawSection !== targetSection) continue
            return {
              title: (course.title || '').trim(),
              code: (course.courseCode || '').trim(),
              description: (course.description || '').trim(),
              instructors: Array.from(new Set(s.instructors || [])),
              units: s.units ?? null,
              enrolled: Number(s.registered || 0),
              capacity: Number(s.total || 0),
              times: s.time ? [s.time] : [],
              locations: s.location ? [s.location] : [],
              duplicatedCredits: Array.from(new Set(s.duplicatedCredits || [])),
              prerequisites: Array.from(new Set(s.prerequisites || [])),
              dClearance: !!s.dClearance,
              type: s.type ?? null,
            }
          }
        }
      }
    }
  } catch (e) {
    return null
  }

  return null
}

// getSchoolCourses
export async function getSchoolCourses(schoolPrefix: string, programPrefix: string): Promise<UICourse[]> {
  const results: UICourse[] = []
  if (!schoolPrefix || !programPrefix) return results
  try {
    const byProgram = (coursesBySchool as Record<string, any>)[schoolPrefix]
    if (!byProgram) return results
    const list: RawGroupedCourse[] = (byProgram as Record<string, RawGroupedCourse[]>)[programPrefix] || []
    for (const raw of list) {
      const mapped = mapGroupedToUICourse(raw)
      if (mapped) results.push(mapped)
    }
  } catch (e) {
    // ignore
  }
  return results
}