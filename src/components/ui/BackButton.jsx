import React from 'react'

const BackButton = ({ onClick, label = null, className = '', style = {}, direction = 'right', variant = 'link' }) => {
    // direction: 'right' (default, for RTL back), 'left' (for LTR back), 'up', 'down'
    // icon mapping: right -> arrow-right, left -> arrow-left

    const iconClass = direction === 'left' ? 'bi-arrow-left' : 'bi-arrow-right'

    return (
        <button
            className={`btn btn-${variant} d-flex align-items-center justify-content-center text-gold hover-scale ${className}`}
            onClick={onClick}
            style={{
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                padding: 0,
                transition: 'transform 0.2s ease',
                textDecoration: 'none',
                opacity: 0.9,
                ...style
            }}
            title="رجوع"
        >
            <i className={`bi ${iconClass} fs-2 fw-bold`} style={{ filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.5))' }}></i>
            {label && <span className="ms-2 fw-bold">{label}</span>}
        </button>
    )
}

export default BackButton
