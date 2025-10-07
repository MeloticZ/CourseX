import { defineStore } from 'pinia'
import { computed, ref, watch, onMounted } from 'vue'
import { useTermId } from '@/composables/useTermId'
import type { UICourse, UICourseSection } from '@/composables/api/types'
import { parseBlocksFromApiSpec, parseBlocksFromString, type ScheduleBlock } from '@/composables/scheduleUtils'

export const useScheduleStore = defineStore('schedule', () => {
  const byTerm = ref<Record<string, Record<string, UICourse>>>({})
  const { termId } = useTermId()

  function keyFor(term: string) { return `cx:schedule:${term}` }

  function normalizeCourseMapRaw(raw: unknown, term: string): Record<string, UICourse> {
    try {
      const obj: any = raw || {}
      // Unwrap { schedulesByTerm: { [term]: { ...courses } } }
      let map: any = (obj && obj.schedulesByTerm && obj.schedulesByTerm[term]) ? obj.schedulesByTerm[term] : obj
      // If the map itself accidentally contains a nested schedulesByTerm, unwrap again
      if (map && map.schedulesByTerm && map.schedulesByTerm[term]) {
        map = map.schedulesByTerm[term]
      }
      // Defensive: strip accidental wrapper key from course map
      if (map && typeof map === 'object' && 'schedulesByTerm' in map) {
        const cloned = { ...(map as any) }
        delete (cloned as any).schedulesByTerm
        map = cloned
      }
      return (map && typeof map === 'object') ? map as Record<string, UICourse> : {}
    } catch {
      return {}
    }
  }

  function currentMap(): Record<string, UICourse> {
    return byTerm.value[termId.value] || {}
  }

  function setCurrentMap(next: Record<string, UICourse>) {
    byTerm.value = { ...byTerm.value, [termId.value]: next }
  }

  if (process.client) {
    onMounted(() => {
      const loadFromStorageForCurrentTerm = () => {
        try {
          const raw = localStorage.getItem(keyFor(termId.value))
          if (raw != null) {
            const parsed = JSON.parse(raw)
            byTerm.value[termId.value] = normalizeCourseMapRaw(parsed, termId.value)
          }
        } catch {}
      }

      loadFromStorageForCurrentTerm()

      // Reload from storage whenever the term changes (client-side navigation)
      watch(termId, () => {
        loadFromStorageForCurrentTerm()
      })
      watch(() => byTerm.value[termId.value], (v) => {
        // Ensure we never persist nested wrappers
        const normalized = normalizeCourseMapRaw(v as any, termId.value)
        try { localStorage.setItem(keyFor(termId.value), JSON.stringify({ schedulesByTerm: normalized ? { [termId.value]: normalized } : {} })) } catch {}
      }, { deep: true })
    })
  }

  const scheduledCourses = computed<UICourse[]>(() => Object.values(currentMap() || {}))

  const totalScheduledUnits = computed<number>(() => {
    try {
      let sum = 0
      for (const course of Object.values(currentMap() || {})) {
        for (const section of course.sections || []) {
          const u = typeof section.units === 'number' ? section.units : parseFloat(((section.units as any) || '0').toString())
          sum += Number.isFinite(u) ? u : 0
        }
      }
      return Number.isFinite(sum) ? sum : 0
    } catch {
      return 0
    }
  })

  const totalScheduledUnitsLabel = computed<string>(() => `${totalScheduledUnits.value.toFixed(1)} credits`)

  function upsertScheduledSection(course: { code: string; title: string; description: string }, section: UICourseSection) {
    const code = (course.code || '').toString().trim().toUpperCase()
    if (!code) return
    const existing = currentMap()[code] || {
      title: course.title,
      code,
      description: course.description || '',
      sections: [],
    }
    const nextSections = (existing.sections || []).filter((s) => s.sectionId !== section.sectionId)
    nextSections.push({ ...section })
    setCurrentMap({ ...currentMap(), [code]: { ...existing, title: course.title, description: course.description || '', sections: nextSections } })
  }

  function hasScheduled(courseCode?: string | null, sectionId?: string | null): boolean {
    const code = (courseCode || '').toString().trim().toUpperCase()
    if (!code) return false
    const course = currentMap()[code]
    if (!course) return false
    const sid = (sectionId || '').toString().trim().toUpperCase()
    if (!sid) return (course.sections || []).length > 0
    return (course.sections || []).some((s) => (s.sectionId || '').toString().trim().toUpperCase() === sid)
  }

  function removeScheduledSection(courseCode?: string | null, sectionId?: string | null) {
    const code = (courseCode || '').toString().trim().toUpperCase()
    if (!code) return
    const course = currentMap()[code]
    if (!course) return
    if (!sectionId) {
      const next = { ...currentMap() }
      delete next[code]
      setCurrentMap(next)
      return
    }
    const sid = (sectionId || '').toString().trim().toUpperCase()
    const nextSections = (course.sections || []).filter((s) => (s.sectionId || '').toString().trim().toUpperCase() !== sid)
    if (nextSections.length === 0) {
      const next = { ...currentMap() }
      delete next[code]
      setCurrentMap(next)
    } else {
      setCurrentMap({ ...currentMap(), [code]: { ...course, sections: nextSections } })
    }
  }

  function checkScheduleCollision(spec: string): string[] {
    const inputBlocksRaw: ScheduleBlock[] = (() => {
      const color = undefined
      const label = undefined
      let parsed = parseBlocksFromString(spec, label, color)
      if (!parsed || parsed.length === 0) parsed = parseBlocksFromApiSpec(spec, label, color)
      return parsed
    })()
    if (!inputBlocksRaw || inputBlocksRaw.length === 0) return []

    const scheduledBlocks: ScheduleBlock[] = []
    for (const course of Object.values(currentMap() || {})) {
      for (const section of course.sections || []) {
        const blocks = parseBlocksFromApiSpec((section.schedule || '').toString(), course.title, undefined, course.code, section.sectionId)
        scheduledBlocks.push(...blocks)
      }
    }

    const collidingCodes = new Set<string>()
    for (const a of inputBlocksRaw) {
      for (const b of scheduledBlocks) {
        if (a.dayIndex !== b.dayIndex) continue
        const overlap = a.startMinutes < b.endMinutes && a.endMinutes > b.startMinutes
        if (overlap && b.courseCode) collidingCodes.add((b.courseCode || '').toString().trim().toUpperCase())
      }
    }
    return Array.from(collidingCodes)
  }

  return {
    byTerm,
    scheduledCourses,
    upsertScheduledSection,
    hasScheduled,
    removeScheduledSection,
    totalScheduledUnits,
    totalScheduledUnitsLabel,
    checkScheduleCollision,
  }
})
