export function useCourseSelection() {
  const selectedCourseCode = useState<string | null>('selectedCourseCode', () => null)
  const selectedSectionId = useState<string | null>('selectedSectionId', () => null)

  const selectCourse = (code: string, sectionId: string | null = null) => {
    selectedCourseCode.value = code
    selectedSectionId.value = sectionId
  }

  const clearSelection = () => {
    selectedCourseCode.value = null
    selectedSectionId.value = null
  }

  return {
    selectedCourseCode,
    selectedSectionId,
    selectCourse,
    clearSelection,
  }
}

