import React from 'react'
import { numberToArabicIndic } from '../../utils/javascUtil/gameUtils'

const AyahSeparator = ({ number, className = '', ...props }) => {
    return (
        <span className={`ayah-separator ${className}`} {...props}>
            ﴿{numberToArabicIndic(number)}﴾
        </span>
    )
}

export default AyahSeparator
