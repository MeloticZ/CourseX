import { defineStore } from 'pinia'
import { ref, watch, onMounted } from 'vue'
import type { ScheduleBlock } from '@/composables/scheduleUtils'

export const useScheduleManualStore = defineStore('scheduleManual', () => {
  const manualBlocks = ref<ScheduleBlock[]>([])

  const KEY = 'ui:schedule:manualBlocks:v1'

  if (process.client) {
    onMounted(() => {
      try {
        const raw = localStorage.getItem(KEY)
        if (raw != null) manualBlocks.value = JSON.parse(raw)
      } catch {}
      watch(manualBlocks, (v) => {
        try { localStorage.setItem(KEY, JSON.stringify(v)) } catch {}
      }, { deep: true })
    })
  }

  return {
    manualBlocks,
  }
})


