export default defineNuxtPlugin(() => {
  if (!process.client) return
  const FLAG = 'cx:migration:term-scoping:v1'
  try {
    if (localStorage.getItem(FLAG)) return
    const legacyScheduleRaw = localStorage.getItem('ui:scheduled:courses:v1') || localStorage.getItem('cx:schedule')
    if (legacyScheduleRaw && !localStorage.getItem('cx:schedule:20253')) {
      try {
        const legacy = JSON.parse(legacyScheduleRaw)
        const next = legacy?.schedulesByTerm ? legacy : { schedulesByTerm: { '20253': legacy } }
        localStorage.setItem('cx:schedule:20253', JSON.stringify(next))
      } catch {}
    }
    const legacyManualRaw = localStorage.getItem('ui:schedule:manualBlocks:v1') || localStorage.getItem('cx:scheduleManual')
    if (legacyManualRaw && !localStorage.getItem('cx:scheduleManual:20253')) {
      try {
        const legacy = JSON.parse(legacyManualRaw)
        const next = legacy?.schedulesByTerm ? legacy : { schedulesByTerm: { '20253': legacy } }
        localStorage.setItem('cx:scheduleManual:20253', JSON.stringify(next))
      } catch {}
    }
  } finally {
    try { localStorage.setItem(FLAG, '1') } catch {}
    try { localStorage.setItem('cx:migration:term-scoping:v1:ts', String(Date.now())) } catch {}
  }
})


