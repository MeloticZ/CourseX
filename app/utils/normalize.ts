export function normalizeString(value: string | null | undefined): string {
  return (value || '').toString().trim().toLowerCase()
}

export function normalizeCourseCode(value: string | null | undefined): string {
  const s = (value || '').toString().trim().toUpperCase()
  return s
}

export function normalizeSectionId(value: string | null | undefined): string {
  const s = (value || '').toString().trim().toUpperCase()
  return s
}

export function normalizeSectionType(raw: string | null | undefined): string {
  const t = normalizeString(raw)
  if (!t) return ''
  if (t === 'disc' || t === 'dis' || t === 'discussion') return 'discussion'
  if (t === 'lec' || t === 'lecture') return 'lecture'
  if (t === 'lab') return 'lab'
  return t
}
