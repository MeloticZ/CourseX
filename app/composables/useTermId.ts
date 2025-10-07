import { computed } from 'vue'

export function useTermId() {
  const route = useRoute()
  const termId = computed(() => String((route.params as any)?.termId || '20261'))
  return { termId }
}

export function useTermNavigation() {
  const { termId } = useTermId()
  const toCoursePath = (...segments: string[]) => `/course/${termId.value}/${segments.join('/')}`
  return { termId, toCoursePath }
}


