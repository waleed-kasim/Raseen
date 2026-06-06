import React from 'react'
import BackButton from '../ui/BackButton'
const SurahGridItem = ({ surah, memorizedCount, totalPages, onClick, isExpanded }) => {
    const percentage = Math.round((memorizedCount / totalPages) * 100)

    // Expanded style (Sticky Header) logic is handled by parent container usually,
    // but here we render the inner content.

    return (
        <div
            className={`surah-grid-item ${isExpanded ? 'active' : ''}`}
            onClick={isExpanded ? undefined : onClick}
            style={{
                position: 'relative',
                overflow: 'hidden',
                cursor: isExpanded ? 'default' : 'pointer',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                height: isExpanded ? 'auto' : '140px',
                background: 'var(--bg-card)',
                transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)'
            }}
        >
            {/* Background Fill (Orange) */}
            <div
                className="progress-fill"
                style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    width: isExpanded ? `${percentage}%` : '100%',
                    height: isExpanded ? '100%' : `${percentage}%`,
                    background: 'rgba(245, 158, 11, 0.2)', // Orange with opacity
                    borderTop: 'none',
                    borderRight: isExpanded ? '2px solid rgba(245, 158, 11, 0.5)' : 'none',
                    transition: 'all 0.5s ease-out'
                }}
            />

            <div className="content p-3 h-100 d-flex flex-column justify-content-between position-relative z-1">
                <div className="d-flex justify-content-between align-items-start">
                    <span
                        className="badge bg-dark border border-secondary text-muted"
                        style={{ fontSize: '0.8rem' }}
                    >
                        {surah.id}
                    </span>
                    {percentage > 0 && (
                        <span className="text-warning small fw-bold">
                            {percentage}%
                        </span>
                    )}
                </div>

                <div className={`text-center ${isExpanded ? 'd-flex align-items-center justify-content-center gap-3' : ''}`}>
                    <h4
                        className="mb-0 text-gold font-quran"
                        style={{ fontSize: isExpanded ? '1.5rem' : '1.3rem' }}
                    >
                        {surah.name}
                    </h4>
                    {!isExpanded && (
                        <small className="text-muted d-block mt-1">
                            {memorizedCount} / {totalPages} صفحة
                        </small>
                    )}
                </div>

                {isExpanded && (
                    <div className="position-absolute start-0 ms-3" style={{ top: '45px' }}>
                        <BackButton
                            onClick={(e) => {
                                e.stopPropagation();
                                onClick && onClick();
                            }}
                            className="bg-dark bg-opacity-50 border-0"
                            style={{ width: '32px', height: '32px' }}
                        />
                    </div>
                )}
            </div>
        </div>
    )
}

export default SurahGridItem
