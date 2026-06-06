import { useState, useEffect, useRef } from 'react'
import { truncateText } from '../../utils/javascUtil/gameUtils'

const TruncatedOption = ({ text, isSelected, onSelect, isCorrect, isWrong, disabled, className = '' }) => {
    const [isExpanded, setIsExpanded] = useState(false)
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
    const collapseTimerRef = useRef(null)
    const lastTapRef = useRef(0)
    const longPressTimerRef = useRef(null)
    const isHoldingRef = useRef(false)

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768)
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    // Clear timer on unmount
    useEffect(() => {
        return () => {
            if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current)
            if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
        }
    }, [])

    // Auto-collapse logic when expanded
    useEffect(() => {
        if (isExpanded && !isHoldingRef.current && !disabled) {
            // Calculate duration based on length: Base 2s + 50ms per char
            const duration = 2000 + (text.length * 50)

            if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current)

            collapseTimerRef.current = setTimeout(() => {
                setIsExpanded(false)
            }, duration)
        }
    }, [isExpanded, text.length, disabled])

    const handleTouchStart = () => {
        if (disabled) return
        isHoldingRef.current = true
        longPressTimerRef.current = setTimeout(() => {
            if (isHoldingRef.current) {
                setIsExpanded(true) // Expand on long press
                if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current)
            }
        }, 500) // 500ms for long press
    }

    const handleTouchEnd = () => {
        if (disabled) return
        isHoldingRef.current = false
        if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)

        // If it was expanded by hold, we want it to eventually collapse
        if (isExpanded) {
            // Re-trigger effect to start countdown
            const duration = 2000 + (text.length * 50)
            if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current)
            collapseTimerRef.current = setTimeout(() => {
                setIsExpanded(false)
            }, duration)
        }
    }

    const handleClick = (e) => {
        if (disabled) return
        e.stopPropagation(); // Prevent clearing selection

        const now = Date.now()
        const DOUBLE_TAP_DELAY = 300

        if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
            // Double Tap -> Collapse
            setIsExpanded(false)
            if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current)
        } else {
            // Single Tap
            onSelect() // Select this option
            setIsExpanded(true) // Expand
        }

        lastTapRef.current = now
    }

    // Determine what to show
    // Mobile & Collapsed -> Truncate
    // Desktop OR Expanded -> Full Text

    // We'll use a CSS-based truncation for "first 7 words" visually or just JS truncate?
    // JS truncate is safer for "uniform height" validation.
    // Let's truncate to ~7 words.

    const words = text.split(' ')
    const shouldTruncate = isMobile && !isExpanded && words.length > 7
    const displayText = shouldTruncate ? words.slice(0, 7).join(' ') + ' ...' : text

    let baseClass = `btn w-100 p-3 text-center position-relative transition-all ` + className
    // Styles
    // Normal: btn-outline-secondary (or custom)
    // Selected: border-gold, bg-gold-dim
    // Correct: btn-success
    // Wrong: btn-danger (if selected)

    // We are passing className from parent which likely handles "correct/wrong" logic via classes.
    // We just need to ensure our internal state styles don't conflict.
    // Actually, usually the parent sets className based on `answered` state.
    // `TruncatedOption` should handle the "Selected but not answered yet" state visually if parent doesn't.

    // Default style overrides if selected but not disabled (not answered)
    const selectedStyle = (isSelected && !disabled) ? {
        borderColor: 'var(--accent-gold)',
        backgroundColor: 'rgba(212, 175, 55, 0.15)',
        transform: 'scale(1.02)'
    } : {}

    return (
        <button
            className={baseClass}
            onClick={handleClick}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleTouchStart} // For desktop mouse hold simulation
            onMouseUp={handleTouchEnd}
            onMouseLeave={handleTouchEnd} // Cancel hold if left
            disabled={disabled}
            style={{
                ...selectedStyle,
                minHeight: isMobile ? '60px' : 'auto', // Uniform height base
                transition: 'all 0.2s ease-out'
            }}
        >
            <span
                className={`quran-text-sm d-block ${shouldTruncate ? '' : 'animate-expand'}`}
                dir="rtl"
                style={{
                    whiteSpace: 'normal',
                    lineHeight: '1.8'
                }}
            >
                {displayText}
            </span>

            {/* Expansion Indicator (Optional) */}
            {shouldTruncate && (
                <div className="position-absolute bottom-0 start-50 translate-middle-x" style={{ opacity: 0.5 }}>
                    <i className="bi bi-chevron-down" style={{ fontSize: '0.7rem' }}></i>
                </div>
            )}
        </button>
    )
}

export default TruncatedOption
