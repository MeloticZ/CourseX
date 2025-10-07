export default defineNuxtRouteMiddleware((to) => {
  if (!to.path.startsWith('/course/')) return
  const termId = (to.params as any)?.termId as string | undefined
  if (!termId || !/^\d{5}$/.test(termId)) {
    return showError({ statusCode: 404, statusMessage: 'Invalid term' })
  }
})


