import { Suspense, lazy } from 'react'
import BackButton from '../ui/BackButton'

// Lazy load modes to improve performance
const PageRecognitionMode = lazy(() => import('./modes/PageRecognitionMode'))
const SequenceMode = lazy(() => import('./modes/SequenceMode'))
const PrevNextMode = lazy(() => import('./modes/PrevNextMode'))
const FirstAyahMode = lazy(() => import('./modes/FirstAyahMode'))
const LastAyahMode = lazy(() => import('./modes/LastAyahMode'))
const AyahToNumberMode = lazy(() => import('./modes/AyahToNumberMode'))
const NumberToAyahMode = lazy(() => import('./modes/NumberToAyahMode'))
const LinksViewMode = lazy(() => import('./modes/LinksViewMode'))
const LinksQuizMode = lazy(() => import('./modes/LinksQuizMode'))

function GameArea({ mode, score, onUpdateScore, onBack, showToast }) {

    // Helper to get title
    const getModeTitle = () => {
        const titles = {
            pageRecognition: 'تعرف على الصفحة',
            sequence: 'الترتيب',
            prevNext: 'السابق واللاحق',
            firstAyah: 'ما الأول',
            lastAyah: 'ما الأخير',
            ayahToNumber: 'رقم الآية',
            numberToAyah: 'الآية من الرقم',
            linksView: 'عرض الروابط',
            linksQuiz: 'اختبار الروابط'
        }
        return titles[mode] || mode
    }

    const renderMode = () => {
        const props = { onUpdateScore, onBack, showToast }

        switch (mode) {
            case 'pageRecognition': return <PageRecognitionMode {...props} />
            case 'sequence': return <SequenceMode {...props} />
            case 'prevNext': return <PrevNextMode {...props} />
            case 'firstAyah': return <FirstAyahMode {...props} />
            case 'lastAyah': return <LastAyahMode {...props} />
            case 'ayahToNumber': return <AyahToNumberMode {...props} />
            case 'numberToAyah': return <NumberToAyahMode {...props} />
            case 'linksView': return <LinksViewMode {...props} />
            case 'linksQuiz': return <LinksQuizMode {...props} />
            default: return <div className="text-center text-danger">وضع غير معروف: {mode}</div>
        }
    }

    return (
        <div className="game-area fade-in">
            {/* Header */}
            <div className="page-header">
                <BackButton onClick={onBack} />
                <h2 className="page-title">{getModeTitle()}</h2>

                {mode !== 'linksView' ? (
                    <div className="score-display">
                        <span className="badge bg-success me-1">✓ {score.correct}</span>
                        <span className="badge bg-danger">✗ {score.wrong}</span>
                    </div>
                ) : (
                    <div style={{ width: '60px' }}></div>
                )}
            </div>

            {/* Content with Suspense for lazy loading */}
            <div className="game-content">
                <Suspense fallback={
                    <div className="text-center py-5">
                        <div className="spinner-border text-gold" role="status"></div>
                    </div>
                }>
                    {renderMode()}
                </Suspense>
            </div>
        </div>
    )
}

export default GameArea
