import { useState, useEffect, useCallback } from 'react'
import { SRSService } from '../../../services/srs'
import { StorageService } from '../../../services/storage'
import { shuffleArray, generateWrongNumbers, numberToArabicIndic } from '../../../utils/javascUtil/gameUtils'
import TutorialOverlay from '../../ui/TutorialOverlay'
import FixedConfirmButton from '../../ui/FixedConfirmButton'

const PageRecognitionMode = ({ onUpdateScore, onBack, showToast }) => {
    const [currentPage, setCurrentPage] = useState(null)
    const [options, setOptions] = useState([])
    const [isFlipped, setIsFlipped] = useState(false)
    const [answered, setAnswered] = useState(false)
    const [selectedOption, setSelectedOption] = useState(null)
    const [isLoading, setIsLoading] = useState(true)

    const [showTutorial, setShowTutorial] = useState(false)
    const [tutorialSteps] = useState([
        {
            title: "تعرف على الصفحة",
            description: "اقرأ النص المعروض ← حدد رقم الصفحة من الخيارات.",
            icon: "bi-file-text"
        }
    ])

    const loadQuestion = useCallback(async () => {
        setIsLoading(true)
        setIsFlipped(false)
        setAnswered(false)
        setSelectedOption(null)

        const pages = StorageService.getMemorizedPages()
        if (pages.length === 0) {
            showToast('لا توجد صفحات محفوظة. احفظ صفحة واحدة على الأقل.', 'error')
            onBack()
            return
        }

        // 1. Prepare candidates
        // Candidates: All memorized pages
        const candidates = pages.map(p => ({
            id: `page_recognition:${p.id}`,
            page: p
        }))

        // 2. SRS Selection
        const challengeType = 'page_recognition'
        const smartItem = await SRSService.getSmartChallengeItem(challengeType, candidates)

        let page
        if (smartItem) {
            page = smartItem.page
        } else {
            page = pages[Math.floor(Math.random() * pages.length)]
        }

        setCurrentPage({ ...page, itemId: `page_recognition:${page.id}` })

        const correctNumber = page.pageNumber
        const wrongNumbers = generateWrongNumbers(correctNumber, 3)

        const opts = shuffleArray([
            { pageNumber: correctNumber, order: page.orderInSurah || 1, isCorrect: true },
            ...wrongNumbers.map(n => ({
                pageNumber: n,
                order: (page.orderInSurah || 1) + (n - correctNumber),
                isCorrect: false
            }))
        ])
        setOptions(opts)
        setIsLoading(false)
    }, [onBack, showToast])

    useEffect(() => {
        const hasSeen = StorageService.hasSeenTutorial('page_recognition_intro')
        if (!hasSeen) {
            setShowTutorial(true)
        }
    }, [])

    useEffect(() => {
        loadQuestion()
    }, [loadQuestion])

    const handleAnswer = (idx) => {
        if (answered) return
        setAnswered(true)
        setSelectedOption(idx)

        const selected = options[idx]
        const isCorrect = selected.isCorrect

        // SRS Save
        if (currentPage && currentPage.itemId) {
            const rating = isCorrect ? 5 : 1
            SRSService.saveChallengeSRS('page_recognition', currentPage.itemId, rating)
        }

        onUpdateScore(isCorrect)
        setIsFlipped(true)
    }

    const handleNext = () => {
        loadQuestion()
    }

    if (isLoading) return <div className="text-center text-gold p-5">جاري التحميل...</div>
    if (!currentPage) return null

    // Dynamic layout - No absolute positioning to ensure options are always pushed down
    return (
        <div
            className="page-recognition-mode fade-in d-flex flex-column gap-3 mb-5 pb-5"
            onClick={() => {
                if (!answered && selectedOption !== null) setSelectedOption(null)
            }}
        >
            <div className="game-card card bg-dark border-gold shadow-lg">
                <div className="card-body p-4 text-center d-flex flex-column align-items-center justify-content-center min-vh-25">
                    <div className="question-content animate-fade-in w-100">
                        <div className="quran-text-sm mb-3" style={{ lineHeight: '2.2', textAlign: 'justify' }}>
                            {currentPage.ayahs.map(a => `${a.text} ﴿${numberToArabicIndic(a.number)}﴾ `).join('')}
                        </div>
                        <span className="badge bg-secondary border border-secondary">{currentPage.surahName}</span>
                    </div>

                    {isFlipped && (
                        <div className="answer-content animate-fade-in w-100 mt-4 pt-3 border-top border-secondary">
                            <h3 className="text-gold mb-3">الإجابة الصحيحة</h3>
                            <div className="d-flex justify-content-center gap-2 mb-3">
                                <span className="badge bg-warning text-dark fs-5">
                                    صفحة {currentPage.pageNumber}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="answer-options d-grid gap-2 page-recognition-grid">
                {options.map((opt, idx) => (
                    <button
                        key={idx}
                        className={`btn btn-custom option-btn h-100 py-3 ${answered && opt.isCorrect ? 'correct' : ''
                            } ${answered && selectedOption === idx && !opt.isCorrect ? 'wrong' : ''} ${!answered && selectedOption === idx ? 'selected' : ''}`}
                        style={{
                            borderColor: !answered && selectedOption === idx ? 'var(--accent-gold)' : undefined,
                            backgroundColor: !answered && selectedOption === idx ? 'rgba(255, 215, 0, 0.1)' : undefined
                        }}
                        onClick={(e) => {
                            e.stopPropagation()
                            if (!answered) setSelectedOption(idx)
                        }}
                        disabled={answered}
                    >
                        <span className="fs-5 fw-bold d-block">صفحة {numberToArabicIndic(opt.pageNumber)}</span>
                        <small className="text-muted">(ترتيب {numberToArabicIndic(opt.order)})</small>
                    </button>
                ))}
            </div>

            <FixedConfirmButton
                isVisible={selectedOption !== null && !answered}
                onConfirm={() => handleAnswer(selectedOption)}
            />

            {answered && (
                <div className="mt-2 text-center animated fadeInUp">
                    <button className="btn btn-gold btn-lg px-5 shadow-glow-gold" onClick={handleNext}>
                        السؤال التالي <i className="bi bi-arrow-left ms-2"></i>
                    </button>
                </div>
            )}

            <TutorialOverlay
                steps={tutorialSteps}
                isOpen={showTutorial}
                onClose={() => {
                    setShowTutorial(false)
                    StorageService.markTutorialAsSeen('page_recognition_intro')
                }}
            />
        </div>
    )
}

export default PageRecognitionMode
