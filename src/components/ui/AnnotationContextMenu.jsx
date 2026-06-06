import React, { useEffect, useRef, useState, useLayoutEffect } from 'react'
import ReactDOM from 'react-dom'

function AnnotationContextMenu({ position, onOptionClick, onClose, isMobile, annotation, rangeAnnotations, selectedWordIds }) {
    const menuRef = useRef(null)

    // Helper to check if an annotation matches current selection exactly
    const isExactMatch = (ann) => {
        if (!selectedWordIds || selectedWordIds.size === 0) return false;
        const selIds = Array.from(selectedWordIds).sort();
        const annIds = (ann.wordIds || [ann.id]).sort();
        if (selIds.length !== annIds.length) return false;
        return selIds.every((id, idx) => id === annIds[idx]);
    }

    useEffect(() => {
        const handleClickOutside = (event) => {
            // Check if click is inside menu
            if (menuRef.current && menuRef.current.contains(event.target)) {
                return
            }

            // Check if click is on an ignored element (e.g., interactive words)
            // We use 'closest' to handle clicks on the text inside the span
            if (event.target.closest('.interactive-word')) {
                return
            }

            onClose()
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [onClose])

    // State for drag
    const [isDragging, setIsDragging] = useState(false)
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
    const [menuStyle, setMenuStyle] = useState({ opacity: 0, left: 0, top: 0 })

    useLayoutEffect(() => {
        if (isMobile) {
            setMenuStyle({
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor: '#151520',
                borderTop: '1px solid var(--border-gold)',
                borderTopLeftRadius: '1.5rem',
                borderTopRightRadius: '1.5rem',
                padding: '1.5rem',
                zIndex: 99999,
                boxShadow: '0 -4px 20px rgba(0,0,0,0.6)',
                animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                maxHeight: '85vh',
                overflowY: 'auto',
                opacity: 1
            })
            return
        }

        // Desktop Positioning (Initial only)
        if (menuRef.current && menuStyle.opacity === 0) {
            const menuRect = menuRef.current.getBoundingClientRect()
            const { innerWidth, innerHeight } = window

            // Default: Center-ish or near selection?
            // User complained about "middle of screen" in previous context, but now says "problem of going to middle exists"? 
            // Actually, "problem of going to middle existing" implies they DON'T want it jumping around.
            // Let's place it near selection, but stable.

            let left = position.x
            let top = position.y + 20

            // Simple bounds check to keep on screen initially
            if (left + 400 > innerWidth) left = innerWidth - 420 // 400 is approx width
            if (top + 300 > innerHeight) top = position.y - 320 // Flip up if bottom

            setMenuStyle(prev => ({
                ...prev,
                position: 'fixed',
                top: top,
                left: left,
                backgroundColor: '#151520',
                border: '1px solid var(--border-gold)',
                borderRadius: '1rem',
                padding: '1rem',
                zIndex: 99999,
                width: '400px', // Wider as requested
                boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
                opacity: 1,
                cursor: 'default'
            }))
        }
    }, [position, isMobile])

    // Drag Handlers
    const handleMouseDown = (e) => {
        if (isMobile) return
        if (e.target.closest('button')) return // Don't drag if clicking close button

        setIsDragging(true)
        const rect = menuRef.current.getBoundingClientRect()
        setDragOffset({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        })
    }

    const handleMouseMove = (e) => {
        if (!isDragging) return
        e.preventDefault()
        setMenuStyle(prev => ({
            ...prev,
            left: e.clientX - dragOffset.x,
            top: e.clientY - dragOffset.y
        }))
    }

    const handleMouseUp = () => {
        setIsDragging(false)
    }

    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove)
            document.addEventListener('mouseup', handleMouseUp)
        } else {
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
        }
        return () => {
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
        }
    }, [isDragging])


    // Helper for Row buttons
    const RowBtn = ({ onClick, icon, label, colorClass, active, flex = 1, compact }) => (
        <button
            className={`btn-row ${colorClass} ${active ? 'active' : ''}`}
            onClick={onClick}
            style={{ flex: flex, minHeight: compact ? '40px' : '50px' }}
        >
            <i className={`bi ${icon} ${compact ? 'fs-6' : 'fs-5'} mb-1`}></i>
            <span className={`${compact ? 'sm-text' : 'small fw-bold'}`}>{label}</span>
        </button>
    )

    // Stop propagation to prevent page navigation
    const handleStopPropagation = (e) => {
        e.stopPropagation()
    }

    return ReactDOM.createPortal(
        <div
            ref={menuRef}
            style={menuStyle}
            className="annotation-menu-modern"
            onMouseDown={handleStopPropagation}
            onMouseUp={(e) => {
                handleStopPropagation(e)
                handleMouseUp() // Ensure drag state is cleared
            }}
            onClick={handleStopPropagation}
            onTouchStart={handleStopPropagation}
            onTouchEnd={handleStopPropagation}
        >
            {/* Header (Draggable on Desktop) */}
            <div
                className="d-flex justify-content-between align-items-center mb-2 header-drag"
                onMouseDown={(e) => {
                    e.stopPropagation()
                    handleMouseDown(e)
                }}
                style={{ cursor: isMobile ? 'default' : 'grab' }}
            >
                <span className="text-white-50 small fw-bold font-uuthmanic pointer-events-none">خيارات التحديد</span>
                <button className="btn btn-sm btn-circle btn-outline-secondary border-0 bg-transparent" onClick={onClose}>
                    <i className="bi bi-x-lg"></i>
                </button>
            </div>

            <div className={`d-flex ${isMobile ? 'flex-column gap-3' : 'flex-wrap gap-2'}`}>

                {/* 1. Difficulty */}
                <div style={{ width: isMobile ? '100%' : '100%', marginBottom: isMobile ? 0 : '0.5rem' }}>
                    <div className="text-white-50 tiny-text fw-bold mb-1">مستوى الصعوبة</div>
                    <div className="difficulty-toggle-row">
                        <button
                            className={`diff-btn medium ${annotation?.difficulty === 'medium' ? 'active' : ''}`}
                            onClick={() => onOptionClick('difficulty-medium')}
                        >
                            <i className={`bi ${annotation?.difficulty === 'medium' ? 'bi-check-circle-fill' : 'bi-check-circle'} me-1`}></i>
                            متوسطة
                        </button>
                        <div className="diff-divider"></div>
                        <button
                            className={`diff-btn high ${annotation?.difficulty === 'high' ? 'active' : ''}`}
                            onClick={() => onOptionClick('difficulty-high')}
                        >
                            <i className={`bi ${annotation?.difficulty === 'high' ? 'bi-exclamation-triangle-fill' : 'bi-exclamation-triangle'} me-1`}></i>
                            عالية
                        </button>
                    </div>
                </div>

                {/* Desktop: Use Grid/Flex wrap for buttons to save height */}
                {/* 2. Reflections & Notes Group */}
                <div className="d-flex gap-2" style={{ flex: '1 1 auto', minWidth: isMobile ? '100%' : '48%' }}>
                    {(rangeAnnotations && rangeAnnotations.some(ann => ann.reflection)) ? (
                        <>
                            <RowBtn
                                icon="bi-eye"
                                label={`تدبر (${rangeAnnotations.filter(ann => ann.reflection).length})`}
                                colorClass="btn-purple-outline-row"
                                onClick={() => onOptionClick('view-reflections')}
                                compact={!isMobile}
                            />
                            <RowBtn icon="bi-plus-circle" label="جديد" colorClass="btn-purple-row" onClick={() => onOptionClick('add-reflection')} compact={!isMobile} />
                        </>
                    ) : (
                        <RowBtn icon="bi-lightbulb" label="إضافة تدبر" colorClass="btn-purple-row" onClick={() => onOptionClick('add-reflection')} compact={!isMobile} />
                    )}
                </div>

                <div className="d-flex gap-2" style={{ flex: '1 1 auto', minWidth: isMobile ? '100%' : '48%' }}>
                    {(rangeAnnotations && rangeAnnotations.some(ann => ann.notes)) ? (
                        <>
                            <RowBtn
                                icon="bi-eye"
                                label={`ملاحظة (${rangeAnnotations.filter(ann => ann.notes).length})`}
                                colorClass="btn-blue-outline-row"
                                onClick={() => onOptionClick('view-notes')}
                                compact={!isMobile}
                            />
                            <RowBtn icon="bi-plus-circle" label="جديد" colorClass="btn-blue-row" onClick={() => onOptionClick('add-notes')} compact={!isMobile} />
                        </>
                    ) : (
                        <RowBtn icon="bi-sticky" label="إضافة ملاحظة" colorClass="btn-blue-row" onClick={() => onOptionClick('add-notes')} compact={!isMobile} />
                    )}
                </div>

                {isMobile && <div className="h-divider my-0"></div>}

                {/* 4. Compact Tools */}
                <div className="d-flex gap-2" style={{ width: isMobile ? '100%' : '100%', marginTop: isMobile ? 0 : '0.5rem' }}>
                    <RowBtn icon="bi-files" label="نسخ" colorClass="btn-gold-row" onClick={() => onOptionClick('copy')} compact={true} />
                    <RowBtn icon="bi-trash" label="حذف" colorClass="btn-grey-row" onClick={() => onOptionClick('clear')} compact={true} />
                </div>

            </div>

            <style>{`
                .annotation-menu-modern {
                    font-family: var(--font-cairo, sans-serif);
                    direction: rtl;
                }
                .btn-row {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 0.5rem;
                    border: none;
                    background: rgba(255,255,255,0.05);
                    color: #e0e0e0;
                    transition: all 0.2s ease;
                    border-radius: 0.75rem;
                    text-align: center;
                }
                .btn-row.active {
                   background: rgba(255,255,255,0.1);
                   border: 1px solid rgba(255,255,255,0.2);
                }
                .btn-row:active {
                    transform: scale(0.96);
                }
                .sm-text { font-size: 0.8rem; }
                .tiny-text { font-size: 0.7rem; }
                
                .h-divider {
                    height: 1px;
                    background: rgba(255,255,255,0.1);
                    margin: 0.25rem 0.5rem;
                }
                
                .difficulty-toggle-row {
                    display: flex;
                    width: 100%;
                    background: rgba(255,255,255,0.05);
                    border-radius: 0.75rem;
                    overflow: hidden;
                    border: 1px solid rgba(255,255,255,0.1);
                    height: 45px;
                }
                .diff-btn {
                    flex: 1;
                    border: none;
                    background: transparent;
                    color: rgba(255,255,255,0.6);
                    font-weight: 500;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                    font-size: 0.9rem;
                    cursor: pointer;
                }
                .diff-divider {
                    width: 1px;
                    background: rgba(255,255,255,0.1);
                }
                .diff-btn.medium:hover { background: rgba(255, 193, 7, 0.1); color: #ffc107; }
                .diff-btn.medium.active { background: rgba(255, 193, 7, 0.2); color: #ffc107; font-weight: bold; }
                
                .diff-btn.high:hover { background: rgba(255, 107, 107, 0.1); color: #ff6b6b; }
                .diff-btn.high.active { background: rgba(255, 107, 107, 0.2); color: #ff6b6b; font-weight: bold; }

                /* Row Styles */
                .btn-warning-row { color: #ffe082; }
                .btn-danger-row { color: #ff8a80; }
                .btn-gold-row { color: var(--gold); }
                .btn-gold-row:hover { background: rgba(212, 175, 55, 0.15); color: #fff; }

                .btn-purple-row { color: #c4b5fd; }
                .btn-purple-row:hover { background: rgba(139, 92, 246, 0.15); color: #fff; }

                .btn-blue-row { color: #93c5fd; }
                .btn-blue-row:hover { background: rgba(59, 130, 246, 0.15); color: #fff; }

                .btn-grey-row { color: #ef4444; } 
                .btn-grey-row:hover { background: rgba(239, 68, 68, 0.15); color: #fff; }
                
                .btn-purple-outline-row, .btn-blue-outline-row {
                    background: transparent; border: 1px solid rgba(255,255,255,0.1);
                }
                .btn-purple-outline-row:hover { background: rgba(139, 92, 246, 0.1); }
                .btn-blue-outline-row:hover { background: rgba(59, 130, 246, 0.1); }

                @keyframes slideUp {
                    from { transform: translateY(100%); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }

                .header-drag:active {
                    cursor: grabbing !important;
                }
            `}</style>
        </div >,
        document.body
    )
}

export default AnnotationContextMenu
