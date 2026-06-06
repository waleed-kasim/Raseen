import React, { forwardRef, useImperativeHandle } from 'react'
import { useReviewNavigation } from '../../../hooks/useReviewNavigation'
import HorizontalCarousel from './HorizontalCarousel'
import VerticalList from './VerticalList'

const ReviewEngine = forwardRef(({
    pages,
    initialIndex = 0,
    viewMode = 'horizontal', // 'horizontal' | 'vertical'
    renderPage,
    onIndexChange,
    onBeforeIndexChange,
    className,
    style
}, ref) => {

    const {
        currentIndex,
        setCurrentIndex,
        goToNext,
        goToPrev,
        visiblePages
    } = useReviewNavigation({ pages, initialIndex })

    const verticalRef = React.useRef(null)

    // Expose interaction methods to parent
    useImperativeHandle(ref, () => ({
        goToNext,
        goToPrev,
        jumpTo: (index) => {
            setCurrentIndex(index)
            if (viewMode === 'vertical') {
                verticalRef.current?.jumpTo(index)
            }
        },
        currentIndex
    }))

    // Use a ref to track if we've already done the initial mount trigger
    const initialIndexRef = React.useRef(initialIndex)

    // Notify parent of index changes
    React.useEffect(() => {
        if (onIndexChange && currentIndex !== initialIndexRef.current) {
            onIndexChange(currentIndex)
        }
        // Update the ref so subsequent programmatic changes to the SAME initial index also don't trigger
        // However, if the user navigates, currentIndex changes.
        // We only want to prevent the very first render and when `initialIndex` prop changes from outside.
    }, [currentIndex, onIndexChange])

    // Update ref if parent changes initialIndex forcefully
    React.useEffect(() => {
        initialIndexRef.current = initialIndex
        // We might need to setCurrentIndex if parent overrides it
        setCurrentIndex(initialIndex)
    }, [initialIndex])

    if (viewMode === 'vertical') {
        return (
            <VerticalList
                ref={verticalRef}
                pages={pages}
                currentIndex={currentIndex}
                onPageChange={setCurrentIndex}
                renderPage={renderPage}
            />
        )
    }

    return (
        <HorizontalCarousel
            currentIndex={currentIndex}
            visiblePages={visiblePages}
            onBeforePageChange={onBeforeIndexChange}
            onPageChange={(dir) => {
                if (dir === 'next') goToNext()
                if (dir === 'prev') goToPrev()
            }}
            renderPage={renderPage}
            className={className}
            style={style}
        />
    )
})

export default ReviewEngine
