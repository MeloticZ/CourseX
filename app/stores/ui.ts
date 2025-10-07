import { defineStore } from 'pinia'
import { ref, watch, onMounted } from 'vue'

export const useUiStore = defineStore('ui', () => {
  const selectedCourseCode = ref<string | null>(null)
  const selectedSectionId = ref<string | null>(null)

  const KEY_CODE = 'ui:selectedCourseCode:v1'
  const KEY_SECTION = 'ui:selectedSectionId:v1'

  if (process.client) {
    onMounted(() => {
      try {
        const rawCode = localStorage.getItem(KEY_CODE)
        if (rawCode != null) selectedCourseCode.value = JSON.parse(rawCode)
      } catch {}
      try {
        const rawSec = localStorage.getItem(KEY_SECTION)
        if (rawSec != null) selectedSectionId.value = JSON.parse(rawSec)
      } catch {}

      watch(selectedCourseCode, (v) => {
        try { localStorage.setItem(KEY_CODE, JSON.stringify(v)) } catch {}
      }, { deep: false })

      watch(selectedSectionId, (v) => {
        try { localStorage.setItem(KEY_SECTION, JSON.stringify(v)) } catch {}
      }, { deep: false })
    })
  }

  function setSelection(code: string | null, sectionId: string | null) {
    selectedCourseCode.value = code
    selectedSectionId.value = sectionId
  }

  function clearSelection() {
    setSelection(null, null)
  }

  return {
    selectedCourseCode,
    selectedSectionId,
    setSelection,
    clearSelection,
  }
})
