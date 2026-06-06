import ReactDOM from 'react-dom'
import { useRef, useEffect, useState } from 'react'

function AnnotationTooltip({ allAnnotations, position, visible }) {
    const tooltipRef = useRef(null)
    const [adjustedPos, setAdjustedPos] = useState(position)

    useEffect(() => {
        if (visible && tooltipRef.current && position) {
            const rect = tooltipRef.current.getBoundingClientRect()
            const { x, y } = position
            let newX = x
            let newY = y

            // Horizontal Clamp
            const padding = 10
            const screenWidth = window.innerWidth

            // If going off RIGHT edge
            if (x + rect.width / 2 > screenWidth - padding) {
                newX = screenWidth - padding - rect.width / 2
            }
            // If going off LEFT edge
            if (x - rect.width / 2 < padding) {
                newX = padding + rect.width / 2
            }

            // Vertical Check (Basic) - If too close to top, maybe show below? 
            // For now, user asked for "Above", so we stick to above unless impossible.
            // If y < rect.height + padding, it might clip top.

            setAdjustedPos({ x: newX, y: newY })
        }
    }, [position, visible])

    if (!visible || !allAnnotations || allAnnotations.length === 0) return null

    const reflections = allAnnotations.map(a => a.reflection).filter(Boolean)
    const notes = allAnnotations.map(a => a.notes).filter(Boolean)

    if (reflections.length === 0 && notes.length === 0) return null

    const style = {
        position: 'fixed',
        top: adjustedPos.y,
        left: adjustedPos.x,
        transform: 'translate(-50%, -100%)',
        marginTop: '-20px', // More clearance above finger/cursor
        backgroundColor: 'rgba(26, 26, 46, 0.98)',
        border: '1px solid var(--border-gold)',
        borderRadius: '0.5rem',
        padding: '0.75rem',
        zIndex: 999999, // Maximum Z-Index
        minWidth: '220px',
        maxWidth: '320px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.8)', // Stronger shadow
        backdropFilter: 'blur(8px)',
        pointerEvents: 'none',
        direction: 'rtl'
    }

    return ReactDOM.createPortal(
        <div ref={tooltipRef} style={style} className="annotation-tooltip fade-in font-uuthmanic">
            {reflections.map((refl, i) => (
                <div key={`refl-${i}`} className="mb-2">
                    <div className="text-info small fw-bold mb-1">
                        <i className="bi bi-lightbulb-fill me-1"></i> تدبر {reflections.length > 1 ? i + 1 : ''}:
                    </div>
                    <div className="text-light small" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{refl}</div>
                </div>
            ))}

            {notes.map((note, i) => (
                <div key={`note-${i}`} className={i < notes.length - 1 ? 'mb-2' : ''}>
                    <div className="text-warning small fw-bold mb-1">
                        <i className="bi bi-sticky-fill me-1"></i> ملاحظة {notes.length > 1 ? i + 1 : ''}:
                    </div>
                    <div className="text-white-50 small" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{note}</div>
                </div>
            ))}
        </div>,
        document.body
    )
}

export default AnnotationTooltip
