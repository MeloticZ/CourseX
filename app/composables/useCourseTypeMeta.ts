export type KnownCourseType = 'Lab' | 'Discussion'

export type CourseTypeMeta = {
  key: KnownCourseType
  /** Short label suitable for compact badges (e.g., on cards) */
  cardLabel: string
  /** Full label for details view */
  detailLabel: string
  /** Utility class for zebra background (compact badge) */
  cardZebraClass: string
  /** Utility class for text color on compact badge */
  cardTextClass: string
  /** Icon name for details section */
  detailIconName: string
  /** Text color class for details row label */
  detailTextClass: string
  /** Icon color class for details row icon */
  detailIconClass: string
}

const META_BY_TYPE: Record<KnownCourseType, CourseTypeMeta> = {
  Lab: {
    key: 'Lab',
    cardLabel: 'Lab',
    detailLabel: 'Lab',
    cardZebraClass: 'bg-zebra-sm-blue',
    cardTextClass: 'text-blue-500',
    detailIconName: 'uil:flask-potion',
    detailTextClass: 'text-blue-400',
    detailIconClass: 'text-blue-500',
  },
  Discussion: {
    key: 'Discussion',
    cardLabel: 'Disc',
    detailLabel: 'Discussion',
    cardZebraClass: 'bg-zebra-sm-violet',
    cardTextClass: 'text-violet-500',
    detailIconName: 'uil:chat-bubble-user',
    detailTextClass: 'text-violet-400',
    detailIconClass: 'text-violet-500',
  },
}

function normalizeType(raw: string | null | undefined): KnownCourseType | null {
  const t = (raw || '').trim().toLowerCase()
  if (!t) return null
  if (t === 'lab') return 'Lab'
  if (t === 'discussion' || t === 'disc' || t === 'dis') return 'Discussion'
  return null
}

export function getCourseTypeMeta(type: string | null | undefined): CourseTypeMeta | null {
  const key = normalizeType(type)
  if (!key) return null
  return META_BY_TYPE[key]
}

