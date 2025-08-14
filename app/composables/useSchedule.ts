import { computed } from 'vue'
import { useStore } from '~/composables/useStore'

export type DayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun'

export type ScheduleBlock = {
  id: string
  dayIndex: number // 0=Sun .. 6=Sat
  startMinutes: number // minutes from 00:00, e.g. 8:30 => 510
  endMinutes: number
  label?: string
  color?: string
  courseCode?: string
  sectionId?: string
  meta?: Record<string, unknown>
}

export const DAY_LABELS: DayOfWeek[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export const START_MINUTES = 8 * 60 // 08:00
export const END_MINUTES = 22 * 60 // 22:00
export const SLOT_MINUTES = 5

const STORAGE_KEY_MANUAL = 'ui:schedule:manualBlocks:v1'

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function roundToFiveMinutes(minutes: number): number {
  return Math.round(minutes / SLOT_MINUTES) * SLOT_MINUTES
}

export function timeToMinutes(time: string): number {
  // Supports "H:MM" or "HH:MM" (24h)
  const m = /^\s*(\d{1,2}):(\d{2})\s*$/.exec(time)
  if (!m) return 0
  const h = Number(m[1])
  const mm = Number(m[2])
  return h * 60 + mm
}

export function minutesToTime(total: number): string {
  const h = Math.floor(total / 60)
  const m = total % 60
  const hh = h.toString().padStart(2, '0')
  const mm = m.toString().padStart(2, '0')
  return `${hh}:${mm}`
}

export function useSchedule() {
  const { usePersistentState, selectedCourseCode, selectedSectionId, scheduledCourses, hasScheduled, removeScheduledSection } = useStore()
  // Manual blocks created by user interactions (dragging). Persisted separately.
  const manualBlocks = usePersistentState<ScheduleBlock[]>('ui:schedule:manualBlocks', STORAGE_KEY_MANUAL, () => [])
  const persistenceInitialized = useState<boolean>('ui:schedule:persist:init', () => true)
  // Ephemeral preview blocks that should never be persisted
  const previewBlocks = useState<ScheduleBlock[]>('ui:schedule:preview', () => [])

  const totalRangeMinutes = END_MINUTES - START_MINUTES

  // listBlocks is computed from scheduled courses + any manual blocks
  const listBlocks = computed(() => {
    return [...scheduledComputedBlocks.value, ...manualBlocks.value]
  })

  const normalizeId = (value?: string | null): string | undefined => {
    const s = (value ?? '').toString().trim()
    return s ? s.toUpperCase() : undefined
  }

  const addBlock = (input: Omit<ScheduleBlock, 'id'> & { id?: string }) => {
    const id = input.id || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const start = roundToFiveMinutes(input.startMinutes)
    const end = roundToFiveMinutes(input.endMinutes)
    const startClamped = clamp(start, START_MINUTES, END_MINUTES)
    const endClamped = clamp(end, START_MINUTES, END_MINUTES)
    const normalized: ScheduleBlock = {
      id,
      dayIndex: clamp(input.dayIndex, 0, 6),
      startMinutes: Math.min(startClamped, endClamped),
      endMinutes: Math.max(startClamped, endClamped),
      label: input.label,
      color: input.color,
      courseCode: normalizeId(input.courseCode),
      sectionId: normalizeId(input.sectionId),
      meta: input.meta,
    }
    manualBlocks.value = [...manualBlocks.value, normalized]
    return normalized.id
  }

  const updateBlock = (id: string, patch: Partial<Omit<ScheduleBlock, 'id'>>) => {
    manualBlocks.value = manualBlocks.value.map((b) => {
      if (b.id !== id) return b
      const next: ScheduleBlock = { ...b, ...patch }
      next.dayIndex = clamp(next.dayIndex, 0, 6)
      next.startMinutes = roundToFiveMinutes(clamp(next.startMinutes, START_MINUTES, END_MINUTES))
      next.endMinutes = roundToFiveMinutes(clamp(next.endMinutes, START_MINUTES, END_MINUTES))
      if (next.startMinutes > next.endMinutes) {
        const t = next.startMinutes
        next.startMinutes = next.endMinutes
        next.endMinutes = t
      }
      return next
    })
  }

  const removeBlock = (id: string) => {
    manualBlocks.value = manualBlocks.value.filter((b) => b.id !== id)
  }

  const clearBlocks = () => {
    manualBlocks.value = []
  }

  const setBlocks = (next: ScheduleBlock[]) => {
    manualBlocks.value = next.map((b) => ({
      ...b,
      dayIndex: clamp(b.dayIndex, 0, 6),
      startMinutes: roundToFiveMinutes(clamp(b.startMinutes, START_MINUTES, END_MINUTES)),
      endMinutes: roundToFiveMinutes(clamp(b.endMinutes, START_MINUTES, END_MINUTES)),
      courseCode: normalizeId((b as any).courseCode),
      sectionId: normalizeId((b as any).sectionId),
    }))
  }

  // Ephemeral preview setters (not persisted)
  const setPreviewBlocks = (next: ScheduleBlock[]) => {
    previewBlocks.value = next.map((b) => ({
      ...b,
      id: b.id || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      dayIndex: clamp(b.dayIndex, 0, 6),
      startMinutes: roundToFiveMinutes(clamp(b.startMinutes, START_MINUTES, END_MINUTES)),
      endMinutes: roundToFiveMinutes(clamp(b.endMinutes, START_MINUTES, END_MINUTES)),
      courseCode: normalizeId((b as any).courseCode),
      sectionId: normalizeId((b as any).sectionId),
    }))
  }

  const clearPreviewBlocks = () => {
    previewBlocks.value = []
  }

  // Persistence now handled via useStore.usePersistentState

  const geometryFor = (block: ScheduleBlock) => {
    const topPct = ((block.startMinutes - START_MINUTES) / totalRangeMinutes) * 100
    const heightPct = ((block.endMinutes - block.startMinutes) / totalRangeMinutes) * 100
    return {
      topPct,
      heightPct,
      columnIndex: block.dayIndex, // 0=Sun .. 6=Sat
    }
  }

  // Convenience: parse like "Mon/Wed 09:00-10:50" or "Tue 13:00-14:15"
  const dayIndexFromToken = (token: string): number | null => {
    const map: Record<string, number> = {
      sun: 0,
      mon: 1,
      tue: 2,
      wed: 3,
      thu: 4,
      fri: 5,
      sat: 6,
      u: 0, // often used for Sun
      m: 1,
      t: 2,
      w: 3,
      th: 4, // often used for Thu
      f: 5,
      s: 6, // often used for Sat
    }
    const key = token.trim().toLowerCase()
    const value = map[key]
    return typeof value === 'number' ? value : null
  }

  const parseBlocksFromString = (spec: string, label?: string, color?: string, courseCode?: string): ScheduleBlock[] => {
    if (!spec) return []
    // Split days and time range
    // Examples: "Mon/Wed 09:00-10:50", "Tue 13:00-14:15"
    const match = spec.match(/(.*)\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/i)
    if (!match) return []
    const [, dayPart, startStr, endStr] = match
    if (!dayPart || !startStr || !endStr) return []
    const start = timeToMinutes(startStr)
    const end = timeToMinutes(endStr)
    const dayTokens = dayPart.split(/[\s,/]+/).filter(Boolean)
    const indices: number[] = []
    for (const tok of dayTokens) {
      const idx = dayIndexFromToken(tok)
      if (idx != null) indices.push(idx)
    }
    return indices.map((dayIndex) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      dayIndex,
      startMinutes: start,
      endMinutes: end,
      label,
      color,
      courseCode,
    }))
  }

  // Parse API format like: "MWF 10:00 - 12:00" or "TTh 09:00-10:15"; multiple parts can be separated by ';'
  const parseBlocksFromApiSpec = (spec: string, label?: string, color?: string, courseCode?: string, sectionId?: string): ScheduleBlock[] => {
    if (!spec) return []
    const chunks = spec.split(/;+/).map((s) => s.trim()).filter(Boolean)
    const out: ScheduleBlock[] = []
    for (const chunk of chunks) {
      const m = /^([A-Za-z]+)\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/.exec(chunk.replace(/\s+/g, ' '))
      if (!m) continue
      const dayToken = m[1] ?? ''
      const startStr = m[2] ?? ''
      const endStr = m[3] ?? ''
      const start = timeToMinutes(startStr)
      const end = timeToMinutes(endStr)
      const indices = decodeApiDaysToken(dayToken)
      for (const dayIndex of indices) {
        out.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          dayIndex,
          startMinutes: start,
          endMinutes: end,
          label,
          color,
          courseCode,
          sectionId,
        })
      }
    }
    return out
  }

  function decodeApiDaysToken(token: string): number[] {
    const s = (token || '').toUpperCase()
    const indices: number[] = []
    let i = 0
    while (i < s.length) {
      if (s.startsWith('TH', i)) {
        indices.push(4) // Thu
        i += 2
        continue
      }
      const ch = s[i]
      switch (ch) {
        case 'M': indices.push(1); break
        case 'T': indices.push(2); break
        case 'W': indices.push(3); break
        case 'F': indices.push(5); break
        case 'S': indices.push(6); break
        default: break
      }
      i += 1
    }
    return Array.from(new Set(indices)).sort((a, b) => a - b)
  }

  function hashColorFromCourse(code: string): string {
    const s = (code || '').toUpperCase()
    let hash = 0
    for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0
    const hue = hash % 360
    const color = `hsla(${hue}, 85%, 60%, 0.25)`
    return color
  }

  // Compute schedule blocks from scheduled courses in the store
  const scheduledComputedBlocks = computed<ScheduleBlock[]>(() => {
    const out: ScheduleBlock[] = []
    for (const course of scheduledCourses.value || []) {
      const color = hashColorFromCourse(course.code)
      for (const section of course.sections || []) {
        const spec = (section.schedule || '').toString()
        const blocks = parseBlocksFromApiSpec(spec, course.title, color, course.code, section.sectionId)
        out.push(...blocks)
      }
    }
    return out
  })

  const hasCourseSection = (courseCode?: string | null, sectionId?: string | null) => {
    return hasScheduled(courseCode || null, sectionId || null)
  }

  const removeCourseSection = (courseCode?: string | null, sectionId?: string | null) => {
    removeScheduledSection(courseCode || null, sectionId || null)
  }

  // Public helpers to control preview from components
  const setHoverPreviewFromString = (spec: string, label?: string, courseCode?: string) => {
    const color = 'rgba(249, 115, 22, 0.25)' // orange, translucent
    let parsed = parseBlocksFromString(spec, label, color, courseCode)
    if (!parsed || parsed.length === 0) {
      // try API-style
      parsed = parseBlocksFromApiSpec(spec, label, color, courseCode)
    }
    setPreviewBlocks(parsed)
  }

  const clearHoverPreview = () => {
    clearPreviewBlocks()
  }

  return {
    // state
    blocks: listBlocks,
    previewBlocks,
    selectedCourseCode,
    selectedSectionId,
    // constants
    DAY_LABELS,
    START_MINUTES,
    END_MINUTES,
    SLOT_MINUTES,
    // crud
    addBlock,
    updateBlock,
    removeBlock,
    clearBlocks,
    setBlocks,
    setPreviewBlocks,
    clearPreviewBlocks,
    // helpers
    geometryFor,
    timeToMinutes,
    minutesToTime,
    parseBlocksFromString,
    parseBlocksFromApiSpec,
    hasCourseSection,
    removeCourseSection,
    setHoverPreviewFromString,
    clearHoverPreview,
  }
}

