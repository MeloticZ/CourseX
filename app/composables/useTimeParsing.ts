export function minutesToTime(total: number): string {
  const h = Math.floor(total / 60)
  const m = total % 60
  const hh = h.toString().padStart(2, '0')
  const mm = m.toString().padStart(2, '0')
  return `${hh}:${mm}`
}

export function parseTimeStrict(value: string): number | null {
  const m = /^\s*(\d{1,2}):(\d{2})\s*$/.exec(value || '')
  if (!m) return null
  const h = Number(m[1])
  const mm = Number(m[2])
  if (!Number.isFinite(h) || !Number.isFinite(mm)) return null
  if (h < 0 || h > 23) return null
  if (mm < 0 || mm > 59) return null
  return h * 60 + mm
}

export function parseTimeLooseToMinutes(value: string): number | null {
  const v = (value || '').trim()
  if (!v) return null
  if (v.includes(':')) return parseTimeStrict(v)
  const digits = v.replace(/\D+/g, '')
  if (digits.length === 3) {
    const h = Number(digits.slice(0, 1))
    const mm = Number(digits.slice(1))
    if (!Number.isFinite(h) || !Number.isFinite(mm)) return null
    if (h < 0 || h > 23) return null
    if (mm < 0 || mm > 59) return null
    return h * 60 + mm
  }
  if (digits.length === 4) {
    const h = Number(digits.slice(0, 2))
    const mm = Number(digits.slice(2))
    if (!Number.isFinite(h) || !Number.isFinite(mm)) return null
    if (h < 0 || h > 23) return null
    if (mm < 0 || mm > 59) return null
    return h * 60 + mm
  }
  return null
}


