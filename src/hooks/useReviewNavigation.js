import { useState, useCallback, useMemo } from 'react'

export const useReviewNavigation = ({ pages, initialIndex = 0, bufferSize = 3 }) => {
    const [currentIndex, setCurrentIndex] = useState(initialIndex)


    const goToPage = useCallback((index) => {
        if (index >= 0 && index < pages.length) {
            setCurrentIndex(index)
        }
    }, [pages.length])

    const goToNext = useCallback(() => {
        if (currentIndex < pages.length - 1) {
            setCurrentIndex(prev => prev + 1)
            return true
        }
        return false
    }, [currentIndex, pages.length])

    const goToPrev = useCallback(() => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1)
            return true
        }
        return false
    }, [currentIndex])

    // Calculate buffered pages window
    const visiblePages = useMemo(() => {
        if (!pages || pages.length === 0) return []

        return pages.map((page, i) => ({
            page,
            index: i,
            offset: i - currentIndex
        }))
    }, [currentIndex, pages])

    return {
        currentIndex,
        setCurrentIndex: goToPage,
        goToNext,
        goToPrev,
        visiblePages,
        isFirstPage: currentIndex === 0,
        isLastPage: currentIndex === pages.length - 1
    }
}
