export default defineNuxtRouteMiddleware((to) => {
  const path = to.path || ''
  if (!path.startsWith('/course')) return
  // Expected: /course/<termId>/...
  const parts = path.split('/')
  // ['', 'course', maybeTerm, ...rest]
  const maybeTerm = parts[2] || ''
  const isFiveDigit = /^\d{5}$/.test(maybeTerm)
  if (isFiveDigit) return
  const rest = parts.slice(2).join('/') // could be '' or 'all/..'
  const next = ['/course', '20261', rest].filter(Boolean).join('/')
  return navigateTo(next, { redirectCode: 302 })
})


