/**
 * SurahDivider — Visual separator between two surahs on the same physical page.
 * Renders a decorative gold line with the surah name in the center.
 *
 * Single Responsibility: Only handles the visual divider between surahs.
 */
function SurahDivider({ surahName, className = '' }) {
    return (
        <div className={`surah-divider-line ${className}`}>
            <span className="surah-divider-label">
                سورة {surahName}
            </span>
        </div>
    )
}

export default SurahDivider
