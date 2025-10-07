export function parseUnitsToNumber(units: number | string | null | undefined): number {
  if (units == null) return 0
  if (typeof units === 'number') return Number.isFinite(units) ? units : 0
  const m = (units || '').toString().match(/-?\d+(?:\.\d+)?/)
  return m ? parseFloat(m[0]) : 0
}
