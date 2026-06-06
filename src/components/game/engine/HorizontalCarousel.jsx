import React, { useRef, useEffect } from 'react'

const HorizontalCarousel = ({
    currentIndex,
    visiblePages,
    onPageChange,
    onBeforePageChange,
    renderPage,
    className,
    style: customStyle,
}) => {
    const containerRef = useRef(null)
    const trackRef = useRef(null)

    // Drag State
    const isDragging = useRef(false)
    const startX = useRef(0)
    const startY = useRef(0) // Track Y for Scroll Guard
    const currentDelta = useRef({ x: 0 })
    const isHorizontalSwipe = useRef(null) // Guard
    const containerWidthRef = useRef(0)

    // Reset track position on index change
    useEffect(() => {
        if (trackRef.current && !isDragging.current) {
            trackRef.current.style.transform = `translate3d(${currentIndex * 100}%, 0, 0)`
            trackRef.current.style.transition = 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)'
        }
    }, [currentIndex])

    const getClientX = (e) => {
        return e.touches ? e.touches[0].clientX : e.clientX
    }

    const getClientY = (e) => {
        return e.touches ? e.touches[0].clientY : e.clientY
    }

    const handleStart = (e) => {
        // If mouse event, ignore if user clicked on text area to allow selection/clicking
        if (!e.touches && e.target.closest('.quran-text, .visible-word, .masked-word, .masked-word-item')) {
            return
        }

        isDragging.current = true
        startX.current = getClientX(e)
        startY.current = getClientY(e)
        isHorizontalSwipe.current = null // Reset Check
        currentDelta.current.x = 0
        containerWidthRef.current = containerRef.current ? containerRef.current.offsetWidth : window.innerWidth

        if (trackRef.current) {
            trackRef.current.style.transition = 'none'
        }
    }

    const handleMove = (e) => {
        if (!isDragging.current) return

        const x = getClientX(e)
        const y = getClientY(e)
        const deltaX = x - startX.current
        const deltaY = y - startY.current

        // Scroll Guard Logic
        if (isHorizontalSwipe.current === null) {
            // Determine direction based on first few pixels
            // STRICTER CHECK: deltaX must be significantly larger than deltaY to claim Horizontal
            if (Math.abs(deltaX) > Math.abs(deltaY) * 1.5 && Math.abs(deltaX) > 10) {
                isHorizontalSwipe.current = true
            } else if (Math.abs(deltaY) > Math.abs(deltaX) || Math.abs(deltaY) > 10) {
                // If it looks vertical, or just moving vertically significantly (even if diagonal), abort
                isHorizontalSwipe.current = false
                isDragging.current = false // Abort drag, let browser scroll
                return
            }
        }

        // If verified as vertical scroll, ignore
        if (isHorizontalSwipe.current === false) return

        // If Horizontal, prevent default to stop browser nav (Back/Forward swipe)
        if (e.cancelable && e.touches) {
            e.preventDefault()
        }

        currentDelta.current.x = deltaX

        if (trackRef.current) {
            const isAtStart = currentIndex === 0
            const maxIndex = visiblePages.reduce((max, p) => Math.max(max, p.index), 0)
            const isAtEnd = maxIndex === currentIndex

            let percentDelta = (deltaX / containerWidthRef.current) * 100
            
            if (isAtStart && deltaX < 0) {
                // Dragging left at start (prev) -> apply resistance
                percentDelta = -(Math.atan(-deltaX / 100) * 15)
            } else if (isAtEnd && deltaX > 0) {
                // Dragging right at end (next) -> apply resistance
                percentDelta = (Math.atan(deltaX / 100) * 15)
            }

            const currentPos = currentIndex * 100
            trackRef.current.style.transform = `translate3d(${currentPos + percentDelta}%, 0, 0)`
        }
    }

    const handleEnd = () => {
        isDragging.current = false
        const threshold = 50 // px

        // Detect Swipe vs Tap
        if (isHorizontalSwipe.current === true || !('touches' in window) || (!isHorizontalSwipe.current && Math.abs(currentDelta.current.x) > threshold)) {
            const delta = currentDelta.current.x
            
            const isAtStart = currentIndex === 0
            const maxIndex = visiblePages.reduce((max, p) => Math.max(max, p.index), 0)
            const isAtEnd = maxIndex === currentIndex

            const attemptChange = (dir) => {
                if (onBeforePageChange) {
                    const allow = onBeforePageChange(dir)
                    if (!allow) {
                        // Reset if blocked
                        if (trackRef.current) {
                            trackRef.current.style.transform = `translate3d(${currentIndex * 100}%, 0, 0)`
                            trackRef.current.style.transition = 'transform 0.3s ease-out'
                        }
                        return
                    }
                }
                onPageChange(dir)
            }

            if (delta > threshold && !isAtEnd) {
                attemptChange('next') // Drag Right -> Next
            } else if (delta < -threshold && !isAtStart) {
                attemptChange('prev') // Drag Left -> Prev
            } else {
                // Reset/snap back if swipe is past bounds or too small
                if (trackRef.current) {
                    trackRef.current.style.transform = `translate3d(${currentIndex * 100}%, 0, 0)`
                    trackRef.current.style.transition = 'transform 0.3s ease-out'
                }
            }
        } else {
            // Reset if aborted
            if (trackRef.current) {
                trackRef.current.style.transform = `translate3d(${currentIndex * 100}%, 0, 0)`
                trackRef.current.style.transition = 'transform 0.3s ease-out'
            }
        }

        currentDelta.current.x = 0
        isHorizontalSwipe.current = null
    }

    return (
        <div
            ref={containerRef}
            className={`horizontal-carousel ${className || ''}`}
            style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                overflow: 'hidden', // Fully lock outer scrollbars on the carousel container
                touchAction: 'pan-y',
                overscrollBehaviorY: 'contain',
                direction: 'rtl',
                ...customStyle
            }}
            onTouchStart={handleStart}
            onTouchMove={handleMove}
            onTouchEnd={handleEnd}
            onMouseDown={handleStart}
            onMouseMove={handleMove}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
        >
            <div
                ref={trackRef}
                style={{
                    display: 'flex',
                    width: '100%',
                    height: '100%',
                    transform: `translate3d(${currentIndex * 100}%, 0, 0)`,
                    transition: 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)',
                    willChange: 'transform'
                }}
            >
                {visiblePages.map(({ page, index }) => {
                    const isVisible = Math.abs(index - currentIndex) <= 1;
                    return (
                        <div
                            key={page.id || page.key || index}
                            className={`carousel-slide slide-pos-${index} no-scrollbar`}
                            style={{
                                flexShrink: 0,
                                width: '100%',
                                height: '100%',
                                overflowY: 'auto', // Scroll vertically inside slide
                                boxSizing: 'border-box',
                                direction: 'rtl'
                            }}
                        >
                            {isVisible ? renderPage(page, index === currentIndex) : null}
                        </div>
                    );
                })}
            </div>
        </div>
    )
}

export default HorizontalCarousel
