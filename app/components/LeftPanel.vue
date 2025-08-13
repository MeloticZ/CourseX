<template>
  <div class="h-full w-4/5 min-w-64 max-w-112 flex flex-col overflow-hidden">
    <!-- Header -->
    <div class="font-serif w-full items-center pb-4 p-4">
      <h1 class="text-4xl text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-fuchsia-500 global-shadow">CourseX</h1>
      <span class="text-sm text-slate-500">Course selection, by students, for students.</span>
    </div>

    <div ref="leftScrollRef" class="w-full p-4 pb-0 gap-3 flex flex-col h-full grow overflow-y-scroll border-y border-slate-800">
      <!-- <h1>Schools & Programs</h1> -->
      <input v-model="query" type="text" placeholder="Search Schools & Programs" class="w-full p-2 text-sm rounded-md border border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-500" />

      <NuxtLink to="/course/all" class="w-full rounded-md flex items-center gap-2 hover:bg-slate-800/40 px-1 py-1 rounded">
        <Icon name="uil:list-ul" class="h-5 w-5"/>
        <span class="text-md">Show All Courses</span>
      </NuxtLink>

      <div class="w-full flex flex-col gap-2 h-full overflow-y-scroll border-t border-slate-800 pt-2">
        <!-- Schools & Programs List -->
        <ProgramTree :schools="schools" :query="query" />
      </div>
    </div>
    <div class="w-full h-16">
      <div class="w-full h-full flex flex-col items-center justify-center">
        <span class="text-sm text-slate-500">Built with ❤️ by Korgo</span>
        <span class="text-[8px] text-slate-700">ver: dev 20250814 - data: 20250813 12:34 UTC</span>
      </div>
    </div>

  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Audiowide&display=swap');

.font-serif {
  font-family: 'Audiowide', serif;
}
</style>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { listSchoolAndPrograms } from '~/composables/useAPI'

type Program = {
  name: string
  prefix: string
}

type School = {
  name: string
  prefix: string
  programs: Program[]
}

const query = ref('')

// Persist left panel scroll position
const leftScrollTop = useState<number>('ui:scroll:left', () => 0)
const leftScrollRef = ref<HTMLElement | null>(null)
const onLeftScroll = () => {
  const el = leftScrollRef.value
  if (!el) return
  leftScrollTop.value = el.scrollTop || 0
}

// Temporary seed data; replace with real data source later
const schools = ref<School[]>([])
onMounted(async () => {
  const data = await listSchoolAndPrograms()
  schools.value = data.schools
  // Restore scroll after data render
  const el = leftScrollRef.value
  if (el && leftScrollTop.value > 0) {
    el.scrollTop = leftScrollTop.value
  }
  if (el) el.addEventListener('scroll', onLeftScroll, { passive: true })
})

onBeforeUnmount(() => {
  const el = leftScrollRef.value
  if (el) {
    leftScrollTop.value = el.scrollTop || 0
    el.removeEventListener('scroll', onLeftScroll)
  }
})

</script>