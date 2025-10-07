import { defineStore } from 'pinia'
import { computed, ref, watch, onMounted } from 'vue'
import type { UICourse, UICourseSection } from '@/composables/api/types'
import { parseBlocksFromApiSpec, parseBlocksFromString, type ScheduleBlock } from '@/composables/scheduleUtils'

export const useScheduleStore = defineStore('schedule', () => {
  const map = ref<Record<string, UICourse>>({})

  const KEY = 'ui:scheduled:courses:v1'

  if (process.client) {
    onMounted(() => {
      try {
        const raw = localStorage.getItem(KEY)
        if (raw != null) map.value = JSON.parse(raw)
      } catch {}
      watch(map, (v) => {
        try { localStorage.setItem(KEY, JSON.stringify(v)) } catch {}
      }, { deep: true })
    })
  }

  const scheduledCourses = computed<UICourse[]>(() => Object.values(map.value || {}))

  const totalScheduledUnits = computed<number>(() => {
    try {
      let sum = 0
      for (const course of Object.values(map.value || {})) {
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
    const existing = map.value[code] || {
      title: course.title,
      code,
      description: course.description || '',
      sections: [],
    }
    const nextSections = (existing.sections || []).filter((s) => s.sectionId !== section.sectionId)
    nextSections.push({ ...section })
    map.value = { ...map.value, [code]: { ...existing, title: course.title, description: course.description || '', sections: nextSections } }
  }

  function hasScheduled(courseCode?: string | null, sectionId?: string | null): boolean {
    const code = (courseCode || '').toString().trim().toUpperCase()
    if (!code) return false
    const course = map.value[code]
    if (!course) return false
    const sid = (sectionId || '').toString().trim().toUpperCase()
    if (!sid) return (course.sections || []).length > 0
    return (course.sections || []).some((s) => (s.sectionId || '').toString().trim().toUpperCase() === sid)
  }

  function removeScheduledSection(courseCode?: string | null, sectionId?: string | null) {
    const code = (courseCode || '').toString().trim().toUpperCase()
    if (!code) return
    const course = map.value[code]
    if (!course) return
    if (!sectionId) {
      const next = { ...map.value }
      delete next[code]
      map.value = next
      return
    }
    const sid = (sectionId || '').toString().trim().toUpperCase()
    const nextSections = (course.sections || []).filter((s) => (s.sectionId || '').toString().trim().toUpperCase() !== sid)
    if (nextSections.length === 0) {
      const next = { ...map.value }
      delete next[code]
      map.value = next
    } else {
      map.value = { ...map.value, [code]: { ...course, sections: nextSections } }
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
    for (const course of Object.values(map.value || {})) {
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
    map,
    scheduledCourses,
    upsertScheduledSection,
    hasScheduled,
    removeScheduledSection,
    totalScheduledUnits,
    totalScheduledUnitsLabel,
    checkScheduleCollision,
  }
})
