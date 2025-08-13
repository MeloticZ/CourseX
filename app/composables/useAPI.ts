// API calls

import programs from '~/assets/data/programs.json'
import coursesBySchool from '~/assets/data/courses.json'

// listSchoolAndPrograms
export async function listSchoolAndPrograms() {
  return programs
}

// listAllCourses
export type TagVariant = 'green' | 'rose' | 'yellow' | 'blue'
export type Tag = { text: string; variant?: TagVariant }

export type UICourse = {
  title: string
  code: string
  instructor: string
  enrolled: number
  capacity: number
  schedule: string
  location: string
  description: string
  tags: Tag[]
  // Optional: default/first section identifier for routing deep links
  sectionId?: string
}

type RawCourse = {
  title?: string
  description?: string
  courseCode?: string
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
  // Section identifier fields (generator may use one of these)
  sectionId?: string | null
  section?: string | null
  sectionCode?: string | null
}

function buildTags(raw: RawCourse): Tag[] {
  const tags: Tag[] = []
  if (raw.units != null && raw.units !== '') {
    tags.push({ text: `${raw.units} units`, variant: 'green' })
  }
  if (raw.dClearance) {
    tags.push({ text: 'D-Clearance', variant: 'rose' })
  }
  if (raw.prerequisites && raw.prerequisites.length > 0) {
    tags.push({ text: 'Pre-Req', variant: 'rose' })
  }
  if (raw.duplicatedCredits && raw.duplicatedCredits.length > 0) {
    tags.push({ text: 'Dupe-Credit', variant: 'yellow' })
  }
  if (raw.type === 'Lab') {
    tags.push({ text: 'Lab', variant: 'blue' })
  }
  return tags
}

function mapToUICourse(raw: RawCourse): UICourse | null {
  const code = (raw.courseCode || '').trim()
  const title = (raw.title || '').trim()
  if (!code || !title) return null
  const instructor = (raw.instructors?.join(', ') || 'TBA').trim()
  return {
    title,
    code,
    instructor,
    enrolled: Number(raw.registered || 0),
    capacity: Number(raw.total || 0),
    schedule: (raw.time || '').trim(),
    location: (raw.location || '').trim(),
    description: (raw.description || '').trim(),
    tags: buildTags(raw),
    sectionId: (raw.sectionCode || raw.sectionId || raw.section || '')?.toString().trim() || undefined,
  }
}

export async function listAllCourses(): Promise<UICourse[]> {
  const results: UICourse[] = []
  try {
    const schoolPrefixes = Object.keys(coursesBySchool as Record<string, unknown>)
    for (const schoolPrefix of schoolPrefixes) {
      const byProgram = (coursesBySchool as Record<string, any>)[schoolPrefix] as Record<string, RawCourse[]>
      if (!byProgram) continue
      const programPrefixes = Object.keys(byProgram)
      for (const programPrefix of programPrefixes) {
        const list = byProgram[programPrefix] || []
        for (const raw of list) {
          const mapped = mapToUICourse(raw)
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
      const byProgram = (coursesBySchool as Record<string, any>)[schoolPrefix] as Record<string, RawCourse[]>
      if (!byProgram) continue
      const programPrefixes = Object.keys(byProgram)
      for (const programPrefix of programPrefixes) {
        const list = byProgram[programPrefix] || []
        for (const raw of list) {
          if (normalize(raw.courseCode || '') !== target) continue
          if (!aggregated) {
            aggregated = {
              title: (raw.title || '').trim(),
              code: (raw.courseCode || '').trim(),
              description: (raw.description || '').trim(),
              instructors: Array.from(new Set(raw.instructors || [])),
              units: raw.units ?? null,
              enrolled: Number(raw.registered || 0),
              capacity: Number(raw.total || 0),
              times: raw.time ? [raw.time] : [],
              locations: raw.location ? [raw.location] : [],
              duplicatedCredits: Array.from(new Set(raw.duplicatedCredits || [])),
              prerequisites: Array.from(new Set(raw.prerequisites || [])),
              dClearance: !!raw.dClearance,
              type: raw.type ?? null,
            }
          } else {
            // aggregate across sections
            aggregated.instructors = Array.from(new Set([...(aggregated.instructors || []), ...((raw.instructors || []))]))
            aggregated.enrolled += Number(raw.registered || 0)
            aggregated.capacity += Number(raw.total || 0)
            if (raw.time) aggregated.times.push(raw.time)
            if (raw.location) aggregated.locations.push(raw.location)
            aggregated.duplicatedCredits = Array.from(new Set([...(aggregated.duplicatedCredits || []), ...((raw.duplicatedCredits || []))]))
            aggregated.prerequisites = Array.from(new Set([...(aggregated.prerequisites || []), ...((raw.prerequisites || []))]))
            aggregated.dClearance = aggregated.dClearance || !!raw.dClearance
            // keep first non-null units
            if (aggregated.units == null && raw.units != null) aggregated.units = raw.units
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
      const byProgram = (coursesBySchool as Record<string, any>)[schoolPrefix] as Record<string, RawCourse[]>
      if (!byProgram) continue
      const programPrefixes = Object.keys(byProgram)
      for (const programPrefix of programPrefixes) {
        const list = byProgram[programPrefix] || []
        for (const raw of list) {
          const rawCode = normalize(raw.courseCode || '')
          if (rawCode !== targetCode) continue
          const rawSection = normalize((raw as any).sectionCode || raw.sectionId || raw.section || '')
          if (!rawSection || rawSection !== targetSection) continue

          return {
            title: (raw.title || '').trim(),
            code: (raw.courseCode || '').trim(),
            description: (raw.description || '').trim(),
            instructors: Array.from(new Set(raw.instructors || [])),
            units: raw.units ?? null,
            enrolled: Number(raw.registered || 0),
            capacity: Number(raw.total || 0),
            times: raw.time ? [raw.time] : [],
            locations: raw.location ? [raw.location] : [],
            duplicatedCredits: Array.from(new Set(raw.duplicatedCredits || [])),
            prerequisites: Array.from(new Set(raw.prerequisites || [])),
            dClearance: !!raw.dClearance,   
            type: raw.type ?? null,
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
    const list: RawCourse[] = (byProgram as Record<string, RawCourse[]>)[programPrefix] || []
    for (const raw of list) {
      const mapped = mapToUICourse(raw)
      if (mapped) results.push(mapped)
    }
  } catch (e) {
    // ignore
  }
  return results
}