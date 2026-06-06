import React from 'react'

/**
 * Optimized RatingButtons component to prevent lag and unify styles.
 * CSS is moved to index.css to prevent DOM thrashing.
 * 
 * compact: reduces height & padding for tight spaces.
 * inline: forces single-row nowrap (for two-page joint rating bar).
 */
const RatingButtons = ({
    pageId,
    currentRating,
    onRate,
    compact = false,
    inline = false,
    className = ""
}) => {
    const ratings = [
        { r: 1, emoji: '😓', label: 'نسيت', cls: 'danger' },
        { r: 2, emoji: '😬', label: 'صعب', cls: 'warning' },
        { r: 3, emoji: '🙂', label: 'جيد', cls: 'primary' },
        { r: 4, emoji: '😄', label: 'سهل', cls: 'info' },
        { r: 5, emoji: '😎', label: 'ممتاز', cls: 'success' },
    ]

    return (
        <div className={`rating-section ${compact ? 'py-1' : 'py-2'} ${className}`}>
            {!inline && (
                <p className={`text-center text-muted ${compact ? 'small mb-1' : 'mb-2'}`}>
                    <i className="bi bi-star me-1"></i>
                    كيف مستوى تثبيتك؟
                </p>
            )}
            <div
                className={`d-flex justify-content-center gap-2 flex-row-reverse ${inline ? 'rating-inline-row' : ''}`}
                dir="ltr"
                style={{ flexWrap: inline ? 'nowrap' : 'wrap' }}
            >
                {ratings.map(({ r, emoji, label, cls }) => {
                    const isSelected = currentRating === r
                    const isDimmed = currentRating && !isSelected

                    return (
                        <button
                            key={r}
                            className={`btn btn-outline-${cls} srs-btn-optimized ${compact || inline ? 'btn-sm' : ''} px-2 py-1 d-flex ${inline ? 'flex-row align-items-center gap-1 justify-content-center' : 'flex-column align-items-center justify-content-center'} ${isSelected ? 'selected' : ''} ${isDimmed ? 'dimmed' : ''}`}
                            style={{
                                flex: inline ? '0 1 auto' : '1 0 28%',
                                minWidth: inline ? '50px' : '85px',
                                maxWidth: inline ? '90px' : '140px',
                                height: inline ? '30px' : (compact ? '60px' : '75px'),
                                fontSize: inline ? '0.75rem' : undefined
                            }}
                            onClick={(e) => {
                                e.stopPropagation()
                                if (onRate) onRate(pageId || null, r)
                            }}
                        >
                            <span className={inline ? '' : 'fs-3'} style={inline ? { fontSize: '0.9rem', lineHeight: 1 } : { lineHeight: 1 }}>{emoji}</span>
                            <small className="fw-bold text-nowrap" style={{ fontSize: inline ? '0.65rem' : '0.75rem' }}>{label}</small>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

export default React.memo(RatingButtons)
