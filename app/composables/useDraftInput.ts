import { computed, ref, watch } from 'vue'

export type DraftParseResult<T> = {
  value: T | null
  text: string
  valid: boolean
}

export function useDraftInput<T>(options: {
  getValue: () => T | null
  setValue: (v: T | null) => void
  format: (v: T) => string
  parse: (s: string) => DraftParseResult<T>
}) {
  const isEditing = ref(false)
  const clearOnFirst = ref(false)
  const draft = ref('')
  const valid = ref(false)

  const text = computed<string>({
    get: () => {
      if (isEditing.value) return draft.value
      const v = options.getValue()
      return v == null ? '' : options.format(v as T)
    },
    set: (val: string) => {
      isEditing.value = true
      draft.value = val
    },
  })

  const onFocus = () => {
    isEditing.value = true
    clearOnFirst.value = true
    draft.value = text.value
  }

  const onInput = (e: Event) => {
    const el = e.target as HTMLInputElement
    if (clearOnFirst.value) {
      const incoming = (e as InputEvent).data ?? el.value
      text.value = String(incoming ?? '')
      clearOnFirst.value = false
    } else {
      text.value = el.value
    }
  }

  const onBlur = () => {
    const raw = (draft.value || '').trim()
    isEditing.value = false
    if (!raw) {
      options.setValue(null)
      draft.value = ''
      valid.value = false
      return
    }
    const { value, text: formatted, valid: isValid } = options.parse(raw)
    if (!isValid || value == null) {
      options.setValue(null)
      draft.value = ''
      valid.value = false
    } else {
      options.setValue(value)
      draft.value = formatted
      valid.value = true
    }
  }

  // Keep internal draft/valid in sync when external value is reset/changed
  watch(
    () => options.getValue(),
    (newValue) => {
      if (newValue == null) {
        isEditing.value = false
        draft.value = ''
        valid.value = false
      }
    }
  )

  return {
    text,
    isEditing,
    draft,
    valid,
    onFocus,
    onInput,
    onBlur,
  }
}


