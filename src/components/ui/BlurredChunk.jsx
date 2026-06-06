import { toArabicIndic } from '../../utils/javascUtil/arabicUtils'

/**
 * BlurredChunk — Renders an unmemorized section of a Quran page with a
 * strong blur effect that prevents reading, plus a lock overlay.
 *
 * Single Responsibility: Only handles the blurred display of unmemorized text.
 * No interactions, no annotations, no masking logic.
 */
function BlurredChunk({ ayahs, className = '' }) {
    if (!ayahs || ayahs.length === 0) return null

    return (
        <div className={`unmemorized-chunk-wrapper ${className}`}>
            <div className="unmemorized-chunk-content">
                {ayahs.map(ayah => (
                    <span key={ayah.number}>
                        {ayah.text}{' '}
                        <span style={{ fontSize: '0.75em', opacity: 0.6 }}>
                            ﴿{toArabicIndic(ayah.number)}﴾
                        </span>{' '}
                    </span>
                ))}
            </div>
            <div className="unmemorized-overlay">
                <i className="bi bi-lock"></i>
                <span>لم تُحفظ بعد</span>
            </div>
        </div>
    )
}

export default BlurredChunk
