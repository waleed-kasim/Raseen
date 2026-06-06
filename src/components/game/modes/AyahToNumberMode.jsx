import { useState, useEffect, useCallback } from 'react'
import { StorageService } from '../../../services/storage'
import { SRSService } from '../../../services/srs'
import { shuffleArray, generateWrongNumbers, numberToArabicIndic } from '../../../utils/javascUtil/gameUtils'
import TutorialOverlay from '../../ui/TutorialOverlay'
import FixedConfirmButton from '../../ui/FixedConfirmButton'

const AyahToNumberMode = ({ onUpdateScore, onBack, showToast }) => {
    const [currentPage, setCurrentPage] = useState(null)
    const [options, setOptions] = useState([])
    const [isFlipped, setIsFlipped] = useState(false)
    const [answered, setAnswered] = useState(false)
    const [selectedOption, setSelectedOption] = useState(null)
    const [isLoading, setIsLoading] = useState(true)

    const [showTutorial, setShowTutorial] = useState(false)
    const [tutorialSteps] = useState([
        {
            title: "رقم الآية",
            description: "اقرأ الآية المعروضة ← حدد رقمها.",
            icon: "bi-123"
        }
    ])

    const loadQuestion = useCallback(async () => {
        setIsLoading(true)
        setIsFlipped(false)
        setAnswered(false)
        setSelectedOption(null)

        const pages = StorageService.getMemorizedPages()
        const validPages = pages.filter(p => p.ayahs && p.ayahs.length > 0)

        if (validPages.length === 0) {
            showToast('لا توجد صفحات محفوظة تحتوي على آيات', 'error')
            onBack()
            return
        }

        // 1. Prepare candidate items (all ayahs from memorized pages)
        // We only pick a subset to avoid huge arrays if pages are many
        // For now, let's flat map all valid pages to get all ayahs
        // Optimization: flattening all might be slow if 600 pages.
        // Strategy: Pick 10 random pages? No, we want SRS across all.
        // Let's rely on pages. Ideally we should have "AllAyahs" list but we don't.
        // Let's generate a flat list of candidates (page+ayah combos)

        let candidates = []
        validPages.forEach(p => {
            // Use composite ID: "surah:ayah" or "page:order"
            // Sura:Ayah is best universal ID
            p.ayahs.forEach(a => {
                candidates.push({
                    id: `${p.surahId}:${a.number}`,
                    page: p,
                    ayah: a
                })
            })
        })

        // 2. Use SRS Service to pick smart item
        // If too many candidates (>1000), maybe shuffle and pick 500 then SRS?
        // SRS needs to see "Due" status. If we slice, we might miss due items.
        // Let's iterate all (JS is fast enough for <10k simple objects)

        const challengeType = 'ayah_to_number'
        const smartItem = await SRSService.getSmartChallengeItem(challengeType, candidates)

        // If smartItem returned (it returns one of our candidates objects)
        if (smartItem) {
            const { page, ayah } = smartItem
            setCurrentPage({ ...page, currentAyah: ayah, itemId: smartItem.id })

            const correctNumber = ayah.number
            const wrongNumbers = generateWrongNumbers(correctNumber, 3)

            const opts = shuffleArray([
                { value: correctNumber, isCorrect: true },
                ...wrongNumbers.map(n => ({ value: n, isCorrect: false }))
            ])
            setOptions(opts)
        } else {
            // Fallback (Should rarely happen if candidates > 0)
            const page = validPages[Math.floor(Math.random() * validPages.length)]
            const ayah = page.ayahs[Math.floor(Math.random() * page.ayahs.length)]
            setCurrentPage({ ...page, currentAyah: ayah, itemId: `${page.surahId}:${ayah.number}` })
            // ... setup options ...
            const correctNumber = ayah.number
            const wrongNumbers = generateWrongNumbers(correctNumber, 3)
            const opts = shuffleArray([
                { value: correctNumber, isCorrect: true },
                ...wrongNumbers.map(n => ({ value: n, isCorrect: false }))
            ])
            setOptions(opts)
        }

        setIsLoading(false)
    }, [onBack, showToast])

    useEffect(() => {
        const hasSeen = StorageService.hasSeenTutorial('ayah_to_number_intro')
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

        // SRS Saving
        if (currentPage && currentPage.itemId) {
            // Rating Logic:
            // 5 = Correct
            // 1 = Wrong
            // Note: We could add time-based logic here later for rating 4
            const rating = isCorrect ? 5 : 1
            SRSService.saveChallengeSRS('ayah_to_number', currentPage.itemId, rating)
                .then(() => console.log(`Saved SRS: ${rating} for ${currentPage.itemId}`))
        }

        onUpdateScore(isCorrect)
        setIsFlipped(true)
    }

    const handleNext = () => {
        loadQuestion()
    }

    if (isLoading) return <div className="text-center text-gold p-5">جاري التحميل...</div>
    if (!currentPage) return null

    return (
        <div
            className="ayah-to-number-mode fade-in d-flex flex-column gap-3 mb-5 pb-5"
            onClick={() => {
                if (!answered && selectedOption !== null) setSelectedOption(null)
            }}
        >
            <div className="game-card card bg-dark border-gold shadow-lg">
                <div className="card-body p-4 text-center d-flex flex-column justify-content-center min-vh-25">
                    <div className="question-content animate-fade-in">
                        <h3 className="text-gold mb-3">ما رقم هذه الآية؟</h3>
                        <div className="quran-text-sm mb-3 p-3 border rounded border-secondary bg-black bg-opacity-25" dir="rtl" style={{ width: '100%' }}>
                            {currentPage.currentAyah?.text}
                        </div>
                        <span className="badge bg-secondary">{currentPage.surahName}</span>
                    </div>

                    {isFlipped && (
                        <div className="answer-content animate-fade-in mt-4 border-top border-secondary pt-3">
                            <div className="p-4 border border-success rounded bg-success bg-opacity-10 d-inline-block">
                                <span className="text-secondary d-block mb-1">الرقم الصحيح</span>
                                <span className="display-4 text-success fw-bold">
                                    {numberToArabicIndic(currentPage.currentAyah?.number)}
                                </span>
                            </div>
                            <div className="mt-3">
                                <span className="badge bg-info">صفحة {currentPage.pageNumber}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="answer-options d-grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))' }}>
                {options.map((opt, idx) => (
                    <button
                        key={idx}
                        className={`btn btn-custom option-btn p-1 d-flex align-items-center justify-content-center ${answered && opt.isCorrect ? 'correct' : ''
                            } ${answered && selectedOption === idx && !opt.isCorrect ? 'wrong' : ''} ${!answered && selectedOption === idx ? 'selected' : ''}`}
                        style={{
                            height: '80px',
                            fontSize: '1.8rem',
                            borderColor: !answered && selectedOption === idx ? 'var(--accent-gold)' : undefined,
                            backgroundColor: !answered && selectedOption === idx ? 'rgba(255, 215, 0, 0.1)' : undefined
                        }}
                        onClick={(e) => {
                            e.stopPropagation()
                            if (!answered) setSelectedOption(idx)
                        }}
                        disabled={answered}
                        dir="rtl"
                    >
                        {numberToArabicIndic(opt.value)}
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
                    StorageService.markTutorialAsSeen('ayah_to_number_intro')
                }}
            />
        </div>
    )
}

export default AyahToNumberMode
