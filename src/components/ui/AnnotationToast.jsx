import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom'

const AnnotationToast = ({ annotations, position, onClose }) => {
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        // Animation frame to ensure render before fade in
        requestAnimationFrame(() => setIsVisible(true))

        // Auto-hide after 3 seconds
        const timer = setTimeout(() => {
            setIsVisible(false)
            setTimeout(onClose, 300) // Wait for fade out
        }, 3000)

        return () => clearTimeout(timer)
    }, [onClose])

    if (!annotations || annotations.length === 0) return null

    // Combine text from annotations
    const reflections = annotations.filter(a => a.reflection).map(a => a.reflection)
    const notes = annotations.filter(a => a.notes).map(a => a.notes)

    const content = []
    if (reflections.length > 0) content.push({ icon: 'bi-lightbulb-fill', text: reflections[0], color: 'text-info' })
    if (notes.length > 0) content.push({ icon: 'bi-sticky-fill', text: notes[0], color: 'text-warning' })

    if (content.length === 0) return null

    // Determine position: "Above the ayah". 
    // position passed is {x, y} of the touch/word.
    // We want it centered horizontally on screen, and slightly above the touch point.

    return ReactDOM.createPortal(
        <div
            className={`annotation-toast-container ${isVisible ? 'show' : ''}`}
            onClick={onClose} // Dismiss on tap
            style={{
                position: 'fixed',
                top: position.y - 120, // Above finger
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 999999,
                pointerEvents: 'none', // Allow clicking through? User said "toast notification", usually non-interactive or dismissible
            }}
        >
            <div className="bg-dark border border-gold rounded-3 shadow-lg p-2 text-center" style={{ minWidth: '200px', maxWidth: '300px' }}>
                {content.map((item, idx) => (
                    <div key={idx} className={`d-flex align-items-center justify-content-center gap-2 mb-1 last-mb-0`}>
                        <i className={`bi ${item.icon} ${item.color}`}></i>
                        <span className="text-white small">{item.text}</span>
                    </div>
                ))}
            </div>
            <style>{`
                .annotation-toast-container {
                    opacity: 0;
                    transition: opacity 0.3s ease, transform 0.3s ease;
                    margin-top: 10px;
                }
                .annotation-toast-container.show {
                    opacity: 1;
                    margin-top: 0;
                }
                .last-mb-0:last-child { margin-bottom: 0 !important; }
            `}</style>
        </div>,
        document.body
    )
}

export default AnnotationToast
