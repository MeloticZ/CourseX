import { defineStore } from 'pinia'
import { ref, watch, onMounted } from 'vue'
import { useTermId } from '@/composables/useTermId'
import type { ScheduleBlock } from '@/composables/scheduleUtils'

export const useScheduleManualStore = defineStore('scheduleManual', () => {
  const manualBlocks = ref<ScheduleBlock[]>([])
  const { termId } = useTermId()
  function keyFor(term: string) { return `cx:scheduleManual:${term}` }

  function normalizeManualBlocksRaw(raw: unknown, term: string): ScheduleBlock[] {
    try {
      const obj: any = raw || []
      // Unwrap { schedulesByTerm: { [term]: [ ...blocks ] } }
      let list: any = (obj && obj.schedulesByTerm && obj.schedulesByTerm[term]) ? obj.schedulesByTerm[term] : obj
      // If the list itself accidentally contains a nested schedulesByTerm, unwrap again
      if (list && list.schedulesByTerm && list.schedulesByTerm[term]) {
        list = list.schedulesByTerm[term]
      }
      // Defensive: if an object was stored instead of array, coerce to []
      return Array.isArray(list) ? list as ScheduleBlock[] : []
    } catch {
      return []
    }
  }

  if (process.client) {
    onMounted(() => {
      const loadFromStorageForCurrentTerm = () => {
        try {
          const raw = localStorage.getItem(keyFor(termId.value))
          if (raw != null) {
            const parsed = JSON.parse(raw)
            manualBlocks.value = normalizeManualBlocksRaw(parsed, termId.value)
          }
        } catch {}
      }

      loadFromStorageForCurrentTerm()

      // Reload from storage whenever the term changes (client-side navigation)
      watch(termId, () => {
        loadFromStorageForCurrentTerm()
      })
      watch(manualBlocks, (v) => {
        const normalized = normalizeManualBlocksRaw(v as any, termId.value)
        try { localStorage.setItem(keyFor(termId.value), JSON.stringify({ schedulesByTerm: { [termId.value]: normalized } })) } catch {}
      }, { deep: true })
    })
  }

  return {
    manualBlocks,
  }
})


