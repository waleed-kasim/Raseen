import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react'

const VerticalList = forwardRef(({
    pages,
    currentIndex,
    onPageChange,
    renderPage
}, ref) => {
    const containerRef = useRef(null)
    const isManualScrolling = useRef(false)
    const scrollTimeoutRef = useRef(null)
    const MARGIN_BOTTOM = 64 // 4rem

    // Clear scroll timeout on unmount
    useEffect(() => {
        return () => {
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current)
            }
        }
    }, [])

    // Expose jumpTo to parent
    useImperativeHandle(ref, () => ({
        jumpTo: (index) => {
            const target = containerRef.current?.querySelector(`.page-item-${index}`)
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }
        }
    }))

    // Initial Scroll Sync
    useEffect(() => {
        const target = containerRef.current?.querySelector(`.page-item-${currentIndex}`)
        if (target) {
            target.scrollIntoView({ block: 'start' })
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []) // Run once on mount

    const handleScroll = (e) => {
        if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current)
        }

        const targetScrollTop = e.target.scrollTop
        const targetClientHeight = e.target.clientHeight
        const children = Array.from(e.target.children)

        scrollTimeoutRef.current = setTimeout(() => {
            const center = targetScrollTop + (targetClientHeight / 2)
            for (let i = 0; i < children.length; i++) {
                const child = children[i]
                const childTop = child.offsetTop
                const childBottom = childTop + child.offsetHeight

                if (center >= childTop && center <= childBottom) {
                    if (i !== currentIndex) {
                        onPageChange(i)
                    }
                    break
                }
            }
        }, 150)
    }

    return (
        <div
            ref={containerRef}
            className="vertical-list no-scrollbar"
            onScroll={handleScroll}
            style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                overflowY: 'auto',
                overflowX: 'hidden',
                scrollBehavior: 'auto', // Important for manual scroll feel
                overscrollBehaviorY: 'contain'
            }}
        >
            {pages.map((page, index) => (
                <div
                    key={page.id}
                    className={`page-item-${index}`}
                    style={{
                        width: '100%',
                        maxWidth: '900px',
                        margin: '0 auto',
                        marginBottom: `${MARGIN_BOTTOM}px`,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'flex-start',
                        alignItems: 'center'
                    }}
                >
                    <div style={{ width: '100%' }}>
                        {renderPage(page, index === currentIndex)}
                    </div>
                </div>
            ))}
        </div>
    )
})

export default VerticalList
