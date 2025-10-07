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

const { mode } = useRouteMode()
const { selectCourse, clearSelection } = useCourseSelection()

watch(
  () => mode.value,
  (m) => {
    if (m.mode === 'unknown') {
      clearSelection()
      return
    }
    if (m.courseCode) {
      selectCourse(m.courseCode, m.sectionId || null)
    } else {
      clearSelection()
    }
  },
  { immediate: true, deep: true }
)

</script>

<style scoped>
</style>

