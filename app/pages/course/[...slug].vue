<template>
  <div class="w-full h-full flex">
    <LeftPanel />
    <MiddlePanel />
    <RightPanel />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  keepalive: true,
  key: 'course'
})

const route = useRoute()
const router = useRouter()

const { selectCourse, clearSelection } = useCourseSelection()

const parseSlug = () => {
  const parts = (route.params.slug as string[] | undefined) || []
  // Supported forms:
  // ["all"]
  // ["all", courseCode, sectionId]
  // [school, program]
  // [school, program, courseCode, sectionId]
  if (parts.length === 0) return { mode: 'unknown' as const }
  if (parts[0] === 'all') {
    return {
      mode: 'all' as const,
      courseCode: parts[1] || null,
      sectionId: parts[2] || null,
    }
  }
  if (parts.length >= 2) {
    return {
      mode: 'program' as const,
      school: parts[0],
      program: parts[1],
      courseCode: parts[2] || null,
      sectionId: parts[3] || null,
    }
  }
  return { mode: 'unknown' as const }
}

watch(
  () => route.fullPath,
  () => {
    const parsed = parseSlug()
    if (parsed.mode === 'unknown') {
      clearSelection()
      return
    }
    if (parsed.courseCode) {
      selectCourse(parsed.courseCode, parsed.sectionId || null)
    } else {
      clearSelection()
    }
  },
  { immediate: true }
)

</script>

<style scoped>
</style>

