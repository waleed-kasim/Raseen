/**
 * Bismillah — Renders "بسم الله الرحمن الرحيم"
 * Used at the beginning of Surahs.
 */
function Bismillah({ className = '' }) {
    return (
        <div className={`bismillah-container text-center mb-3 ${className}`} style={{ fontSize: '1.6rem' }}>
            <span 
                className="bismillah-text" 
                style={{ 
                    fontFamily: 'Amiri Quran', 
                    fontSize: 'inherit',
                    color: 'inherit',
                    display: 'inline-block',
                    transform: 'scaleX(1.1)' 
                }}
            >
                بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
            </span>
        </div>
    )
}

export default Bismillah
