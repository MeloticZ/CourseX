<template>
  <div />
</template>

<script setup lang="ts">
if (process.server) {
  await navigateTo('/course/all')
} else {
  const router = useRouter()
  router.replace('/course/all')
}
</script>

