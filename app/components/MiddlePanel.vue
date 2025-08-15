<template>
  <div class="w-full h-full border-x border-cx-border flex flex-col min-w-80 p-4">
    <div class="w-full flex flex-col gap-2 pb-2 border-cx-border">
      <span class="text-sm text-cx-text-subtle">Available Courses</span>
      <input v-model="filters.searchText" type="text" placeholder="Search Courses" class="w-full p-2 text-sm rounded-md border border-cx-border focus:outline-none focus:ring-1 focus:ring-cx-text-muted" />

      <!-- Filters Div -->
      <div class="w-full flex justify-center py-1 overflow-x-clip" v-show="showFilters">
        <div class="flex gap-2 xl:gap-4">
          <!-- All the filters can be reset to their default state via right clicking -->
          <div class="grid grid-cols-7 grid-rows-2 gap-1 w-41 h-11 lg:w-48 lg:h-13 xl:w-55 xl:h-15 2xl:w-62 2xl:h-17 shrink-0">
            <!-- The user can select to toggle days of the week (default none is selected) and if time is not specified, show only course sections on the specified dates (Do not allow courses with schedule partially on the specified days)
             They can also specify start and/or end times to filter all the days. If they specify both, the schedule must match the specified time on the specified days. -->
            <button
              class="aspect-square text-sm lg:text-md xl:text-lg font-semibold leading-none grid place-items-center bg-zebra-sm rounded-tl-sm"
              :class="dayActiveClass(0)"
              title="Filter by Sunday"
              @click="toggleDay(0)"
              @contextmenu.prevent="clearDays()"
              :aria-pressed="isDaySelected(0)"
            >S</button>
            <button
              class="aspect-square text-sm lg:text-md xl:text-lg font-semibold leading-none grid place-items-center bg-zebra-sm"
              :class="dayActiveClass(1)"
              title="Filter by Monday"
              @click="toggleDay(1)"
              @contextmenu.prevent="clearDays()"
              :aria-pressed="isDaySelected(1)"
            >M</button>
            <button
              class="aspect-square text-sm lg:text-md xl:text-lg font-semibold leading-none grid place-items-center bg-zebra-sm"
              :class="dayActiveClass(2)"
              title="Filter by Tuesday"
              @click="toggleDay(2)"
              @contextmenu.prevent="clearDays()"
              :aria-pressed="isDaySelected(2)"
            >T</button>
            <button
              class="aspect-square text-sm lg:text-md xl:text-lg font-semibold leading-none grid place-items-center bg-zebra-sm"
              :class="dayActiveClass(3)"
              title="Filter by Wednesday"
              @click="toggleDay(3)"
              @contextmenu.prevent="clearDays()"
              :aria-pressed="isDaySelected(3)"
            >W</button>
            <button
              class="aspect-square text-sm lg:text-md xl:text-lg font-semibold leading-none grid place-items-center bg-zebra-sm"
              :class="dayActiveClass(4)"
              title="Filter by Thursday"
              @click="toggleDay(4)"
              @contextmenu.prevent="clearDays()"
              :aria-pressed="isDaySelected(4)"
            >H</button>
            <button
              class="aspect-square text-sm lg:text-md xl:text-lg font-semibold leading-none grid place-items-center bg-zebra-sm"
              :class="dayActiveClass(5)"
              title="Filter by Friday"
              @click="toggleDay(5)"
              @contextmenu.prevent="clearDays()"
              :aria-pressed="isDaySelected(5)"
            >F</button>
            <button
              class="aspect-square text-sm lg:text-md xl:text-lg font-semibold leading-none grid place-items-center bg-zebra-sm"
              :class="dayActiveClass(6)"
              title="Filter by Saturday"
              @click="toggleDay(6)"
              @contextmenu.prevent="clearDays()"
              :aria-pressed="isDaySelected(6)"
            >S</button>
            <input
              v-model="timeStartText"
              type="text"
              placeholder="00:00"
              maxlength="6"
              class="text-center text-sm lg:text-md xl:text-lg line-clamp-1 font-semibold leading-none grid place-items-center bg-dotted-sm placeholder:text-cx-text-weak-shimmer text-cx-text-weak focus:outline-none col-span-3 rounded-bl-sm"
              :class="timeStartValid ? validRingClass : ''"
              title="Filter by Start Time"
              @focus="onTimeStartFocus"
              @input="onTimeStartInput"
              @blur="onTimeStartBlur"
              @contextmenu.prevent="clearStartTime()"
            />
            <div class="aspect-square text-sm lg:text-md xl:text-lg font-semibold leading-none grid place-items-center text-cx-text-weak-shimmer" title="Schedule Filter">—</div>
            <input
              v-model="timeEndText"
              type="text"
              placeholder="23:59"
              maxlength="6"
              class="text-center text-sm lg:text-md xl:text-lg line-clamp-1 font-semibold leading-none grid place-items-center bg-dotted-sm placeholder:text-cx-text-weak-shimmer text-cx-text-weak focus:outline-none col-span-3"
              :class="timeEndValid ? validRingClass : ''"
              title="Filter by End Time"
              @focus="onTimeEndFocus"
              @input="onTimeEndInput"
              @blur="onTimeEndBlur"
              @contextmenu.prevent="clearEndTime()"
            />
          </div>
          
          <div class="grid grid-cols-2 grid-rows-2 grid-flow-col gap-1 shrink-0 w-11 h-11 lg:w-13 lg:h-13 xl:w-15 xl:h-15 2xl:w-17 2xl:h-17">
            <!-- The user can specify a minimum and/or maximum number of units for filtering -->
            <input
              v-model="unitsMinText"
              type="text"
              placeholder="0"
              maxlength="3"
              class="aspect-square text-center text-sm lg:text-md xl:text-lg line-clamp-1 font-semibold leading-none grid place-items-center bg-dotted-sm placeholder:text-cx-text-weak-shimmer text-cx-text-weak focus:outline-none"
              :class="unitsMinValid ? validRingClass : ''"
              title="Filter by Minimum Units"
              @focus="onUnitsMinFocus"
              @input="onUnitsMinInput"
              @blur="onUnitsMinBlur"
              @contextmenu.prevent="clearUnitsMin()"
            />
            <input
              v-model="unitsMaxText"
              type="text"
              placeholder="16"
              maxlength="3"
              class="aspect-square text-center text-sm lg:text-md xl:text-lg line-clamp-1 font-semibold leading-none grid place-items-center bg-dotted-sm placeholder:text-cx-text-weak-shimmer text-cx-text-weak focus:outline-none"
              :class="unitsMaxValid ? validRingClass : ''"
              title="Filter by Maximum Units"
              @focus="onUnitsMaxFocus"
              @input="onUnitsMaxInput"
              @blur="onUnitsMaxBlur"
              @contextmenu.prevent="clearUnitsMax()"
            />
            <!-- The user can input a course level to filter by. Even though it's 3 digit input, we only look at the first one digit to determine the level (0/1/2/3/4/5/6/7/8/9)-->
            <input
              v-model="courseLevelText"
              type="text"
              placeholder="5XX"
              maxlength="4"
              class="text-center text-sm lg:text-md xl:text-lg text-sideways line-clamp-1 font-semibold leading-none grid place-items-center bg-dotted-sm placeholder:text-cx-text-weak-shimmer text-cx-text-weak focus:outline-none row-span-2"
              :class="courseLevelValid ? validRingClass : ''"
              title="Filter by Course Level"
              @focus="onCourseLevelFocus"
              @input="onCourseLevelInput"
              @blur="onCourseLevelBlur"
              @contextmenu.prevent="clearCourseLevel()"
            />
          </div>

          <div class="grid grid-cols-3 grid-rows-2 gap-1 shrink-0 w-17 h-11 lg:w-20 lg:h-13 xl:w-23 xl:h-15 2xl:w-26 2xl:h-17">
            <!-- You should emit visible UI indicators when the filter is toggled -->
            <!-- For these two filters, they have three filter modes, any -> only -> exclude -->
            <button
              class="aspect-square text-sm lg:text-md xl:text-lg font-semibold line-clamp-1 leading-none grid place-items-center"
              :class="dClearanceClass"
              title="Filter by D-Clearance"
              @click="cycleTriState('dClearance')"
              @contextmenu.prevent="setTriState('dClearance', 'any')"
              :aria-pressed="filters.dClearance !== 'any'"
            >D</button>
            <button
              class="aspect-square text-sm lg:text-md xl:text-lg font-semibold line-clamp-1 leading-none grid place-items-center"
              :class="prereqClass"
              title="Filter by Prerequisites"
              @click="cycleTriState('prerequisites')"
              @contextmenu.prevent="setTriState('prerequisites', 'any')"
              :aria-pressed="filters.prerequisites !== 'any'"
            >R</button>
            <!-- The user can reset all filters to their default state -->
            <button
              class="text-sm xl:text-md 2xl:text-lg text-sideways font-semibold line-clamp-1 leading-none grid place-items-center bg-zebra-sm text-cx-text-weak-shimmer row-span-2 rounded-r-sm"
              title="Reset Filters"
              @click="reset()"
            >Reset</button>
            <!-- These two filters can only be toggled on or off (any -> exclude) -->
            <button
              class="aspect-square text-sm lg:text-md xl:text-lg font-semibold line-clamp-1 leading-none grid place-items-center bg-zebra-sm"
              :class="conflictsClass"
              title="Exclude Courses with Schedule Conflicts"
              @click="toggleConflicts()"
              @contextmenu.prevent="setConflictsAny()"
              :aria-pressed="filters.conflicts === 'exclude'"
            >
              <Icon name="uil:clock" class="aspect-square w-full" :class="conflictsIconClass" />
            </button>
            <button
              class="aspect-square text-sm lg:text-md xl:text-lg font-semibold line-clamp-1 leading-none grid place-items-center bg-zebra-sm"
              :class="enrollmentClass"
              title="Exclude Full Courses"
              @click="toggleEnrollmentOpenOnly()"
              @contextmenu.prevent="setEnrollmentAny()"
              :aria-pressed="filters.enrollment !== 'any'"
            >
              <Icon name="uil:user" class="aspect-square w-full" :class="enrollmentIconClass" />
            </button>
          </div>
        </div>
      </div>

      <div class="w-full flex justify-between items-center px-2">
        <div class="flex gap-1 cursor-pointer select-none" @click="showFilters = !showFilters">
          <Icon name="uil:filter" class="h-4 w-4 text-cx-text-weak-muted duration-1000" :class="showFilters ? 'rotate-180' : ''" />
          <span class="text-xs text-cx-text-secondary">Filters</span>
        </div>
        <span class="text-xs text-cx-text-secondary">{{ filteredCourses.length }} courses found</span>
      </div>
    </div>

    <div ref="scrollContainerRef" class="w-full grow overflow-y-auto overflow-x-hidden overscroll-auto min-w-0 hide-scrollbar-bg">
      <div class="w-full flex flex-col min-w-0">
        <div :style="{ height: topPadding + 'px' }"></div>
        <template v-for="(course, i) in visibleCourses" :key="visibleKey(course, i)">
          <div class="pb-3" :ref="(el) => onRowRef(el, startIndex + i)" :data-row-index="startIndex + i">
            <CourseCard
              data-card
              :title="course.title"
              :code="course.code"
              :description="course.description"
              :sections="course.sections"
              @section-click="(sid) => onSectionClick(course.code, sid)"
            />
          </div>
        </template>
        <div :style="{ height: bottomPadding + 'px' }"></div>
      </div>
    </div>
    
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch, nextTick, onBeforeUnmount } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import { listAllCourses, getSchoolCourses, type UICourse } from '~/composables/useAPI'
import { useStore } from '~/composables/useStore'
import { useCourseFilters } from '~/composables/useCourseFilters'
import { minutesToTime } from '~/composables/scheduleUtils'
import { useCourseSelection } from '~/composables/useCourseSelection'

const route = useRoute()
const router = useRouter()
const { scheduledCourses } = useStore()

// UI state
const showFilters = ref(false)

// Persist scroll position per program scope across remounts
const middleScrollTopMap = useState<Record<string, number>>('ui:scroll:middle', () => ({}))

const currentScopeKey = () => {
  const parts = (route.params.slug as string[] | undefined) || []
  if (parts[0] === 'all') return 'all'
  if ((parts?.length || 0) >= 2) return `${parts[0]}/${parts[1]}`
  return 'unknown'
}

const courses = ref<UICourse[]>([])
const { filters, filteredCourses, reset } = useCourseFilters(courses)

// Day toggles
const isDaySelected = (idx: number) => (filters.days || []).includes(idx)
const toggleDay = (idx: number) => {
  const set = new Set(filters.days || [])
  if (set.has(idx)) set.delete(idx)
  else set.add(idx)
  filters.days = Array.from(set).sort((a, b) => a - b)
}
const clearDays = () => { filters.days = [] }
const dayActiveClass = (idx: number) => isDaySelected(idx) ? 'shadow-[0_0_1px_1px] shadow-cx-text-secondary text-cx-text-weak' : 'text-cx-text-weak-shimmer'

// Time inputs with parsing and draft editing
const validRingClass = 'shadow-[0_0_1px_1px] shadow-cx-text-secondary text-cx-text-weak'

const parseTimeStrict = (value: string): number | null => {
  const m = /^\s*(\d{1,2}):(\d{2})\s*$/.exec(value || '')
  if (!m) return null
  const h = Number(m[1])
  const mm = Number(m[2])
  if (!Number.isFinite(h) || !Number.isFinite(mm)) return null
  if (h < 0 || h > 23) return null
  if (mm < 0 || mm > 59) return null
  return h * 60 + mm
}

const parseTimeLooseToMinutes = (value: string): number | null => {
  const v = (value || '').trim()
  if (!v) return null
  // If includes colon, defer to strict
  if (v.includes(':')) return parseTimeStrict(v)
  // Digits only: allow 3-4 digits like 130 -> 01:30, 1240 -> 12:40
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

// Draft state and validity for time inputs
const timeStartDraft = ref<string>('')
const timeEndDraft = ref<string>('')
const isEditingTimeStart = ref(false)
const isEditingTimeEnd = ref(false)
const timeStartClearOnFirst = ref(false)
const timeEndClearOnFirst = ref(false)
const timeStartValid = ref<boolean>(false)
const timeEndValid = ref<boolean>(false)

const timeStartText = computed<string>({
  get: () => {
    if (isEditingTimeStart.value) return timeStartDraft.value
    return filters.timeStartMinutes == null ? '' : minutesToTime(filters.timeStartMinutes)
  },
  set: (val: string) => {
    isEditingTimeStart.value = true
    timeStartDraft.value = val
  },
})

const timeEndText = computed<string>({
  get: () => {
    if (isEditingTimeEnd.value) return timeEndDraft.value
    return filters.timeEndMinutes == null ? '' : minutesToTime(filters.timeEndMinutes)
  },
  set: (val: string) => {
    isEditingTimeEnd.value = true
    timeEndDraft.value = val
  },
})

const onTimeStartFocus = () => {
  isEditingTimeStart.value = true
  timeStartClearOnFirst.value = true
  timeStartDraft.value = timeStartText.value
}
const onTimeStartInput = (e: Event) => {
  const el = e.target as HTMLInputElement
  if (timeStartClearOnFirst.value) {
    const incoming = (e as InputEvent).data ?? el.value
    timeStartText.value = String(incoming ?? '')
    timeStartClearOnFirst.value = false
  } else {
    timeStartText.value = el.value
  }
  // Auto-finalize when pattern indicates a complete time
  const current = timeStartDraft.value
  timeStartValid.value = false
  tryAutoFinalizeTime('start', current)
}
const onTimeStartBlur = () => {
  const s = (timeStartDraft.value || '').trim()
  isEditingTimeStart.value = false
  if (!s) {
    filters.timeStartMinutes = null
    timeStartDraft.value = ''
    timeStartValid.value = false
    return
  }
  const minutes = parseTimeLooseToMinutes(s)
  if (minutes == null) {
    filters.timeStartMinutes = null
    timeStartDraft.value = ''
    timeStartValid.value = false
  } else {
    filters.timeStartMinutes = minutes
    timeStartDraft.value = minutesToTime(minutes)
    timeStartValid.value = true
  }
}

function tryAutoFinalizeTime(which: 'start' | 'end', raw: string) {
  const t = (raw || '').trim()
  if (!t) return
  const hasColon = t.includes(':')
  if ((hasColon && t.length >= 5) || (!hasColon && /\d{4}/.test(t))) {
    const minutes = parseTimeLooseToMinutes(t)
    if (minutes == null) return
    const formatted = minutesToTime(minutes)
    if (which === 'start') {
      filters.timeStartMinutes = minutes
      timeStartDraft.value = formatted
      timeStartValid.value = true
      // Keep editing state so user can continue, but text is formatted
    } else {
      filters.timeEndMinutes = minutes
      timeEndDraft.value = formatted
      timeEndValid.value = true
    }
  }
}

const onTimeEndFocus = () => {
  isEditingTimeEnd.value = true
  timeEndClearOnFirst.value = true
  timeEndDraft.value = timeEndText.value
}
const onTimeEndInput = (e: Event) => {
  const el = e.target as HTMLInputElement
  if (timeEndClearOnFirst.value) {
    const incoming = (e as InputEvent).data ?? el.value
    timeEndText.value = String(incoming ?? '')
    timeEndClearOnFirst.value = false
  } else {
    timeEndText.value = el.value
  }
  // Auto-finalize when pattern indicates a complete time
  const current = timeEndDraft.value
  timeEndValid.value = false
  tryAutoFinalizeTime('end', current)
}
const onTimeEndBlur = () => {
  const s = (timeEndDraft.value || '').trim()
  isEditingTimeEnd.value = false
  if (!s) {
    filters.timeEndMinutes = null
    timeEndDraft.value = ''
    timeEndValid.value = false
    return
  }
  const minutes = parseTimeLooseToMinutes(s)
  if (minutes == null) {
    filters.timeEndMinutes = null
    timeEndDraft.value = ''
    timeEndValid.value = false
  } else {
    filters.timeEndMinutes = minutes
    timeEndDraft.value = minutesToTime(minutes)
    timeEndValid.value = true
  }
}

const clearStartTime = () => { filters.timeStartMinutes = null; timeStartDraft.value = ''; timeStartValid.value = false }
const clearEndTime = () => { filters.timeEndMinutes = null; timeEndDraft.value = ''; timeEndValid.value = false }

// Units inputs with draft editing
const unitsMinDraft = ref<string>('')
const unitsMaxDraft = ref<string>('')
const isEditingUnitsMin = ref(false)
const isEditingUnitsMax = ref(false)
const unitsMinClearOnFirst = ref(false)
const unitsMaxClearOnFirst = ref(false)
const unitsMinValid = ref<boolean>(false)
const unitsMaxValid = ref<boolean>(false)

const unitsMinText = computed<string>({
  get: () => {
    if (isEditingUnitsMin.value) return unitsMinDraft.value
    return filters.unitsMin == null ? '' : String(filters.unitsMin)
  },
  set: (v: string) => {
    isEditingUnitsMin.value = true
    unitsMinDraft.value = v
  },
})

const unitsMaxText = computed<string>({
  get: () => {
    if (isEditingUnitsMax.value) return unitsMaxDraft.value
    return filters.unitsMax == null ? '' : String(filters.unitsMax)
  },
  set: (v: string) => {
    isEditingUnitsMax.value = true
    unitsMaxDraft.value = v
  },
})

const onUnitsMinFocus = () => {
  isEditingUnitsMin.value = true
  unitsMinClearOnFirst.value = true
  unitsMinDraft.value = unitsMinText.value
}
const onUnitsMinInput = (e: Event) => {
  const el = e.target as HTMLInputElement
  if (unitsMinClearOnFirst.value) {
    const incoming = (e as InputEvent).data ?? el.value
    unitsMinText.value = String(incoming ?? '')
    unitsMinClearOnFirst.value = false
  } else {
    unitsMinText.value = el.value
  }
}
const onUnitsMinBlur = () => {
  const m = (unitsMinDraft.value || '').match(/\d{1,2}/)
  isEditingUnitsMin.value = false
  if (!m) {
    filters.unitsMin = null
    unitsMinDraft.value = ''
    unitsMinValid.value = false
    return
  }
  const val = Number(m[0])
  if (!Number.isFinite(val)) {
    filters.unitsMin = null
    unitsMinDraft.value = ''
    unitsMinValid.value = false
  } else {
    filters.unitsMin = val
    unitsMinDraft.value = String(val)
    unitsMinValid.value = true
  }
}

const onUnitsMaxFocus = () => {
  isEditingUnitsMax.value = true
  unitsMaxClearOnFirst.value = true
  unitsMaxDraft.value = unitsMaxText.value
}
const onUnitsMaxInput = (e: Event) => {
  const el = e.target as HTMLInputElement
  if (unitsMaxClearOnFirst.value) {
    const incoming = (e as InputEvent).data ?? el.value
    unitsMaxText.value = String(incoming ?? '')
    unitsMaxClearOnFirst.value = false
  } else {
    unitsMaxText.value = el.value
  }
}
const onUnitsMaxBlur = () => {
  const m = (unitsMaxDraft.value || '').match(/\d{1,2}/)
  isEditingUnitsMax.value = false
  if (!m) {
    filters.unitsMax = null
    unitsMaxDraft.value = ''
    unitsMaxValid.value = false
    return
  }
  const val = Number(m[0])
  if (!Number.isFinite(val)) {
    filters.unitsMax = null
    unitsMaxDraft.value = ''
    unitsMaxValid.value = false
  } else {
    filters.unitsMax = val
    unitsMaxDraft.value = String(val)
    unitsMaxValid.value = true
  }
}

const clearUnitsMin = () => { filters.unitsMin = null; unitsMinDraft.value = ''; unitsMinValid.value = false }
const clearUnitsMax = () => { filters.unitsMax = null; unitsMaxDraft.value = ''; unitsMaxValid.value = false }

// Course level input (e.g., 5XX => 500-599) with draft editing
const courseLevelDraft = ref<string>('')
const isEditingCourseLevel = ref(false)
const courseLevelClearOnFirst = ref(false)
const courseLevelValid = ref<boolean>(false)

const courseLevelText = computed<string>({
  get: () => {
    if (isEditingCourseLevel.value) return courseLevelDraft.value
    if (filters.courseLevelMin == null || filters.courseLevelMax == null) return ''
    const d = Math.floor(filters.courseLevelMin / 100)
    return `${d}XX`
  },
  set: (v: string) => {
    isEditingCourseLevel.value = true
    courseLevelDraft.value = v
  },
})

const onCourseLevelFocus = () => {
  isEditingCourseLevel.value = true
  courseLevelClearOnFirst.value = true
  courseLevelDraft.value = courseLevelText.value
}
const onCourseLevelInput = (e: Event) => {
  const el = e.target as HTMLInputElement
  if (courseLevelClearOnFirst.value) {
    const incoming = (e as InputEvent).data ?? el.value
    courseLevelText.value = String(incoming ?? '')
    courseLevelClearOnFirst.value = false
  } else {
    courseLevelText.value = el.value
  }
}
const onCourseLevelBlur = () => {
  const m = (courseLevelDraft.value || '').match(/(\d)/)
  isEditingCourseLevel.value = false
  if (!m) {
    filters.courseLevelMin = null
    filters.courseLevelMax = null
    courseLevelDraft.value = ''
    courseLevelValid.value = false
    return
  }
  const digit = Number(m[1])
  const base = digit * 100
  filters.courseLevelMin = base
  filters.courseLevelMax = base + 99
  courseLevelDraft.value = `${digit}XX`
  courseLevelValid.value = true
}

const clearCourseLevel = () => {
  filters.courseLevelMin = null
  filters.courseLevelMax = null
  courseLevelDraft.value = ''
  courseLevelValid.value = false
}

// Tri-state toggles for D and R
type TriKey = 'dClearance' | 'prerequisites'
const cycleTriState = (key: TriKey) => {
  const val = filters[key]
  const next = val === 'any' ? 'only' : val === 'only' ? 'exclude' : 'any'
  filters[key] = next as any
}
const setTriState = (key: TriKey, v: 'any' | 'only' | 'exclude') => { filters[key] = v as any }
const dClearanceClass = computed(() => {
  const v = filters.dClearance
  if (v === 'only') return 'bg-zebra-sm-rose text-rose-400'
  if (v === 'exclude') return 'bg-zebra-sm outline outline-1 outline-rose-400 text-rose-400 shadow-[0_0_4px_0] shadow-rose-500'
  return 'bg-zebra-sm text-cx-text-weak-shimmer'
})
const prereqClass = computed(() => {
  const v = filters.prerequisites
  if (v === 'only') return 'bg-zebra-sm-yellow text-yellow-400'
  if (v === 'exclude') return 'bg-zebra-sm outline outline-1 outline-yellow-400 text-yellow-400 shadow-[0_0_4px_0] shadow-yellow-500'
  return 'bg-zebra-sm text-cx-text-weak-shimmer'
})

// Conflicts toggle (any <-> exclude)
const toggleConflicts = () => { filters.conflicts = filters.conflicts === 'exclude' ? 'any' : 'exclude' }
const setConflictsAny = () => { filters.conflicts = 'any' }
const conflictsClass = computed(() => filters.conflicts === 'exclude' ? 'outline outline-1 outline-cx-text-muted text-cx-text-weak' : 'text-cx-text-weak-shimmer')
const conflictsIconClass = computed(() => filters.conflicts === 'exclude' ? 'text-cx-text-weak' : 'text-cx-text-weak-shimmer')

// Enrollment toggle (any <-> only-open)
const toggleEnrollmentOpenOnly = () => { filters.enrollment = filters.enrollment === 'only-open' ? 'any' : 'only-open' }
const setEnrollmentAny = () => { filters.enrollment = 'any' }
const enrollmentClass = computed(() => filters.enrollment !== 'any' ? 'outline outline-1 outline-cx-text-muted text-cx-text-weak' : 'text-cx-text-weak-shimmer')
const enrollmentIconClass = computed(() => filters.enrollment !== 'any' ? 'text-cx-text-weak' : 'text-cx-text-weak-shimmer')

// Route-aware data loading
type ModeAll = { mode: 'all'; courseCode: string | null; sectionId: string | null }
type ModeScheduled = { mode: 'scheduled'; courseCode: string | null; sectionId: string | null }
type ModeProgram = { mode: 'program'; school: string; program: string; courseCode: string | null; sectionId: string | null }
type ModeUnknown = { mode: 'unknown' }
type RouteMode = ModeAll | ModeScheduled | ModeProgram | ModeUnknown

const parseSlug = (): RouteMode => {
  const parts = (route.params.slug as string[] | undefined) || []
  if (parts.length === 0) return { mode: 'unknown' }
  if (parts[0] === 'all') {
    return { mode: 'all', courseCode: parts[1] || null, sectionId: parts[2] || null }
  }
  if (parts[0] === 'scheduled') {
    return { mode: 'scheduled', courseCode: parts[1] || null, sectionId: parts[2] || null }
  }
  if (parts.length >= 2) {
    return { mode: 'program', school: parts[0] as string, program: parts[1] as string, courseCode: parts[2] || null, sectionId: parts[3] || null }
  }
  return { mode: 'unknown' }
}

const loadCourses = async () => {
  const parsed = parseSlug()
  if (parsed.mode === 'all' || parsed.mode === 'unknown') {
    courses.value = await listAllCourses()
  } else if (parsed.mode === 'scheduled') {
    courses.value = [...scheduledCourses.value]
  } else if (parsed.mode === 'program') {
    courses.value = await getSchoolCourses(parsed.school, parsed.program)
  }
}

watch(
  () => route.fullPath,
  () => {
    loadCourses().then(() => {
      // Recompute viewport after data changes
      nextTick(updateViewport)
    })
  },
  { immediate: true }
)

// Keep scheduled list in sync when on the scheduled route
watch(scheduledCourses, () => {
  const parsed = parseSlug()
  if (parsed.mode === 'scheduled') {
    courses.value = [...scheduledCourses.value]
    nextTick(updateViewport)
  }
})

// Filtering handled by useCourseFilters

// Variable-height virtualization
const scrollContainerRef = ref<HTMLElement | null>(null)
const defaultItemHeight = 120
const itemHeights = ref<number[]>([])
const startIndex = ref(0)
const endIndex = ref(0)
const bufferPx = 3 * defaultItemHeight

const ensureHeightsArray = () => {
  const n = filteredCourses.value.length
  if (itemHeights.value.length !== n) {
    const next: number[] = new Array(n)
    for (let i = 0; i < n; i++) next[i] = itemHeights.value[i] || defaultItemHeight
    itemHeights.value = next
  }
}

const sumHeights = (from: number, toExclusive: number) => {
  let total = 0
  for (let i = from; i < toExclusive; i++) total += itemHeights.value[i] || defaultItemHeight
  return total
}

const totalContentHeight = computed(() => {
  ensureHeightsArray()
  return sumHeights(0, itemHeights.value.length)
})

const topPadding = computed(() => sumHeights(0, startIndex.value))

const bottomPadding = computed(() => {
  const visibleCount = Math.max(endIndex.value - startIndex.value, 0)
  const visibleHeight = sumHeights(startIndex.value, startIndex.value + visibleCount)
  const remaining = Math.max(totalContentHeight.value - topPadding.value - visibleHeight, 0)
  return remaining
})

const visibleCourses = computed(() => filteredCourses.value.slice(startIndex.value, endIndex.value))

function findStartIndexForScroll(scrollTop: number): number {
  ensureHeightsArray()
  const n = itemHeights.value.length
  let acc = 0
  const target = Math.max(scrollTop - bufferPx, 0)
  for (let i = 0; i < n; i++) {
    const h = itemHeights.value[i] || defaultItemHeight
    if (acc + h > target) return i
    acc += h
  }
  return n
}

function findEndIndexForViewport(start: number, viewportHeight: number, initialOffsetPx: number): number {
  ensureHeightsArray()
  const n = itemHeights.value.length
  let acc = 0
  // We need to cover the viewport height PLUS our overscan buffer, starting from the
  // current scroll position which may be inside the first rendered item. Account for
  // the intra-item offset so we render enough rows to visually fill the viewport.
  const extra = Math.max(initialOffsetPx, 0)
  const target = viewportHeight + bufferPx + extra
  let i = start
  while (i < n && acc < target) {
    acc += itemHeights.value[i] || defaultItemHeight
    i++
  }
  return i
}

const updateViewport = () => {
  const container = scrollContainerRef.value
  if (!container) return
  const height = container.clientHeight || 0
  const scrollTop = container.scrollTop || 0
  // Track scroll position for persistence scoped to current program
  const key = currentScopeKey()
  middleScrollTopMap.value = {
    ...middleScrollTopMap.value,
    [key]: scrollTop,
  }
  const first = Math.max(findStartIndexForScroll(scrollTop), 0)
  // How far into the first rendered item the current scrollTop is positioned.
  const prefixBeforeFirst = sumHeights(0, first)
  const intraFirstOffset = Math.max(scrollTop - prefixBeforeFirst, 0)
  const lastExclusive = Math.min(
    findEndIndexForViewport(first, height, intraFirstOffset),
    filteredCourses.value.length
  )
  startIndex.value = first
  endIndex.value = lastExclusive
}

function onRowRef(el: Element | ComponentPublicInstance | null, globalIndex: number) {
  if (!el || globalIndex == null) return
  // Measure on next tick to ensure layout has settled
  nextTick(() => {
    const rootEl = (el as any)?.$el ? ((el as any).$el as HTMLElement) : (el as HTMLElement)
    if (!rootEl || !(rootEl instanceof HTMLElement)) return
    const rect = rootEl.getBoundingClientRect()
    const h = Math.max(Math.ceil(rect.height), 1)
    if (!Number.isFinite(h) || h <= 0) return
    if (itemHeights.value[globalIndex] !== h) {
      itemHeights.value[globalIndex] = h
      updateViewport()
    }
  })
}

onMounted(() => {
  const container = scrollContainerRef.value
  if (container) {
    container.addEventListener('scroll', updateViewport, { passive: true })
    // Restore previous scroll position if available for current scope
    const key = currentScopeKey()
    const saved = middleScrollTopMap.value[key] || 0
    if (saved > 0) container.scrollTop = saved
  }
  updateViewport()
  // Initial measurement happens via onRowRef as rows render
})

onBeforeUnmount(() => {
  const container = scrollContainerRef.value
  if (container) {
    // Save the latest scroll position
    const key = currentScopeKey()
    const scrollTop = container.scrollTop || 0
    middleScrollTopMap.value = {
      ...middleScrollTopMap.value,
      [key]: scrollTop,
    }
    container.removeEventListener('scroll', updateViewport)
  }
})

watch(filteredCourses, () => {
  // Reset heights array to match new list length while preserving any existing measurements
  ensureHeightsArray()
  nextTick(() => {
    updateViewport()
  })
})

// Click to navigate
const { selectCourse } = useCourseSelection()

const onSectionClick = (courseCode: string, sectionId: string) => {
  const parsed = parseSlug()
  selectCourse(courseCode, sectionId || null)
  if (parsed.mode === 'all' || parsed.mode === 'unknown') {
    router.push(`/course/all/${encodeURIComponent(courseCode)}/${encodeURIComponent(sectionId || 'section')}`)
  } else if (parsed.mode === 'scheduled') {
    router.push(`/course/scheduled/${encodeURIComponent(courseCode)}/${encodeURIComponent(sectionId || 'section')}`)
  } else {
    router.push(`/course/${encodeURIComponent(parsed.school)}/${encodeURIComponent(parsed.program)}/${encodeURIComponent(courseCode)}/${encodeURIComponent(sectionId || 'section')}`)
  }
}

const visibleKey = (course: UICourse, i: number) => `${course.code}`
</script>

<style scoped>
</style>