import { computed, nextTick, ref, watch } from 'vue'
import type { Ref } from 'vue'

type KeyGetter<T> = (item: T, index: number) => string

export function useVariableVirtualList<T>(params: {
  items: Ref<T[]>
  estimateItemHeight?: number
  getKey: KeyGetter<T>
}) {
  const estimate = Math.max(params.estimateItemHeight || 120, 1)
  const items = params.items
  const getKey = params.getKey

  const containerRef = ref<HTMLElement | null>(null)
  const startIndex = ref(0)
  const endIndex = ref(0)
  const keyToHeight = ref<Record<string, number>>({})
  const indexToKey = computed<string[]>(() => {
    const list = items.value || []
    return list.map((it, i) => getKey(it, i))
  })
  const bufferPx = 3 * estimate

  const totalContentHeight = computed(() => {
    let total = 0
    for (const k of indexToKey.value) total += keyToHeight.value[k] || estimate
    return total
  })

  const sumByIndex = (from: number, toExclusive: number) => {
    let total = 0
    for (let i = from; i < toExclusive; i++) {
      const k = indexToKey.value[i]
      total += (k && keyToHeight.value[k]) || estimate
    }
    return total
  }

  const topPadding = computed(() => sumByIndex(0, startIndex.value))

  const bottomPadding = computed(() => {
    const visibleCount = Math.max(endIndex.value - startIndex.value, 0)
    const visibleHeight = sumByIndex(startIndex.value, startIndex.value + visibleCount)
    const remaining = Math.max(totalContentHeight.value - topPadding.value - visibleHeight, 0)
    return remaining
  })

  const visibleItems = computed(() => (items.value || []).slice(startIndex.value, endIndex.value))

  function findStartIndexForScroll(scrollTop: number): number {
    const n = indexToKey.value.length
    let acc = 0
    const target = Math.max(scrollTop - bufferPx, 0)
    for (let i = 0; i < n; i++) {
      const k = indexToKey.value[i]
      const h = (k && keyToHeight.value[k]) || estimate
      if (acc + h > target) return i
      acc += h
    }
    return n
  }

  function findEndIndexForViewport(start: number, viewportHeight: number, initialOffsetPx: number): number {
    const n = indexToKey.value.length
    let acc = 0
    const extra = Math.max(initialOffsetPx, 0)
    const target = viewportHeight + bufferPx + extra
    let i = start
    while (i < n && acc < target) {
      const k = indexToKey.value[i]
      const h = (k && keyToHeight.value[k]) || estimate
      acc += h
      i++
    }
    return i
  }

  const updateViewport = () => {
    const container = containerRef.value
    if (!container) return
    const height = container.clientHeight || 0
    const scrollTop = container.scrollTop || 0
    const first = Math.max(findStartIndexForScroll(scrollTop), 0)
    const prefixBeforeFirst = sumByIndex(0, first)
    const intraFirstOffset = Math.max(scrollTop - prefixBeforeFirst, 0)
    const lastExclusive = Math.min(findEndIndexForViewport(first, height, intraFirstOffset), (items.value || []).length)
    startIndex.value = first
    endIndex.value = lastExclusive
  }

  // Throttle viewport updates to next animation frame to avoid recursive updates during mount/measure
  let rafId: number | null = null
  const scheduleUpdateViewport = () => {
    if (rafId != null) return
    rafId = requestAnimationFrame(() => {
      rafId = null
      updateViewport()
    })
  }

  function onRowRef(el: Element | any | null, globalIndex: number) {
    if (!el || globalIndex == null) return
    nextTick(() => {
      const rootEl = (el as any)?.$el ? ((el as any).$el as HTMLElement) : (el as HTMLElement)
      if (!rootEl || !(rootEl instanceof HTMLElement)) return
      const rect = rootEl.getBoundingClientRect()
      const h = Math.max(Math.ceil(rect.height), 1)
      if (!Number.isFinite(h) || h <= 0) return
      const key = indexToKey.value[globalIndex]
      if (!key) return
      if (keyToHeight.value[key] !== h) {
        keyToHeight.value = { ...keyToHeight.value, [key]: h }
        scheduleUpdateViewport()
      }
    })
  }

  watch(items, () => {
    nextTick(updateViewport)
  }, { immediate: true })

  return {
    containerRef,
    startIndex,
    endIndex,
    topPadding,
    bottomPadding,
    visibleItems,
    onRowRef,
    updateViewport,
    scheduleUpdateViewport,
  }
}


