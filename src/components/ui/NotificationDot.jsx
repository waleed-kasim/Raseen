import React from 'react'

const NotificationDot = ({ size = 'normal', visible = true, style = {} }) => {
    if (!visible) return null

    const sizePx = size === 'large' ? '12px' : '8px'
    const color = '#00ff00' // Bright Green

    return (
        <span className="notification-dot" style={{
            position: 'absolute',
            top: '5px',
            right: '5px',
            width: sizePx,
            height: sizePx,
            backgroundColor: color,
            borderRadius: '50%',
            boxShadow: `0 0 5px ${color}, 0 0 10px ${color}`,
            animation: 'blink 1.5s infinite',
            zIndex: 10,
            ...style
        }}></span>
    )
}

export default NotificationDot
