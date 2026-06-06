import { useState, useEffect, useCallback } from 'react'
import { StorageService } from '../../../services/storage'
import { SRSService } from '../../../services/srs'
import { truncateText, numberToArabicIndic, getFirstWords, getLastWords, shuffleArray } from '../../../utils/javascUtil/gameUtils'
import TutorialOverlay from '../../ui/TutorialOverlay'
import TruncatedOption from '../../ui/TruncatedOption'
import FixedConfirmButton from '../../ui/FixedConfirmButton'

const PrevNextMode = ({ onUpdateScore, onBack, showToast }) => {
    const [currentAyah, setCurrentAyah] = useState(null)
    const [correctAnswers, setCorrectAnswers] = useState({ prev: null, next: null })
    const [prevOptions, setPrevOptions] = useState([])
    const [nextOptions, setNextOptions] = useState([])
    const [userAnswers, setUserAnswers] = useState({ prev: null, next: null }) // Stores index of selected option
    const [result, setResult] = useState({ prev: null, next: null }) // Stores correctness of user's selection
    const [isFlipped, setIsFlipped] = useState(false)
    const [answered, setAnswered] = useState(false)
    const [isLoading, setIsLoading] = useState(true)

    const [showTutorial, setShowTutorial] = useState(false)
    const [tutorialSteps] = useState([
        {
            title: "السابق واللاحق",
            description: "جسر ثنائي الاتجاه: حدد الآية السابقة أو اللاحقة (حسب المتوفر).",
            icon: "bi-link-45deg"
        }
    ])

    const loadQuestion = useCallback(async () => {
        setIsLoading(true)
        setIsFlipped(false)
        setAnswered(false)
        setUserAnswers({ prev: null, next: null })
        setResult({ prev: null, next: null })

        const pages = StorageService.getMemorizedPages()

        // Candidates are ALL ayahs in memorized pages
        const candidates = []
        pages.forEach(p => {
            // For each ayah, we can test Prev/Next
            p.ayahs.forEach(a => {
                candidates.push({
                    id: `prev_next:${p.surahId}:${a.number}`,
                    page: p,
                    ayah: a
                })
            })
        })

        if (candidates.length === 0) {
            showToast('لا توجد آيات كافية.', 'error')
            onBack()
            return
        }

        // SRS Selection
        const challengeType = 'prev_next'
        const smartItem = await SRSService.getSmartChallengeItem(challengeType, candidates)

        let target
        if (smartItem) {
            target = smartItem
        } else {
            target = candidates[Math.floor(Math.random() * candidates.length)]
        }

        const { page, ayah } = target
        setCurrentAyah({ ...ayah, pageNumber: page.pageNumber, surahName: page.surahName, itemId: target.id }) // Store ID for saving

        // Find Prev/Next
        const allPages = StorageService.getSortedPages()

        // Helper to find ayah in specific page
        const getAyah = (p, num) => p.ayahs.find(a => a.number === num)

        // Try same page
        let prevAyahObj = getAyah(page, ayah.number - 1)
        let nextAyahObj = getAyah(page, ayah.number + 1)

        // Cross-page logic
        if (!prevAyahObj && ayah.number > 1) {
            const prevPage = allPages.find(p => p.surahId === page.surahId && p.ayahs.some(a => a.number === ayah.number - 1))
            if (prevPage) prevAyahObj = getAyah(prevPage, ayah.number - 1)
        } else if (!prevAyahObj && ayah.number === 1) {
            prevAyahObj = { text: "بداية السورة", isSpecial: true }
        }

        if (!nextAyahObj) {
            const nextPage = allPages.find(p => p.surahId === page.surahId && p.ayahs.some(a => a.number === ayah.number + 1))
            if (nextPage) nextAyahObj = getAyah(nextPage, ayah.number + 1)
            else {
                nextAyahObj = { text: "نهاية السورة", isSpecial: true }
            }
        }

        setCorrectAnswers({
            prev: prevAyahObj,
            next: nextAyahObj
        })

        // Generate Options (3 wrong + 1 correct) for each
        const generateOptions = (correctText, isSpecial) => {
            if (isSpecial) return [{ text: correctText, isCorrect: true }]

            // Get random wrongs from other ayahs
            const wrongs = candidates
                .filter(c => c.ayah && c.ayah.text !== correctText)
                .map(c => ({ text: c.ayah.text, isCorrect: false }))

            // Shuffle and take 3
            const randomWrongs = wrongs.sort(() => 0.5 - Math.random()).slice(0, 3)
            const options = [{ text: correctText, isCorrect: true }, ...randomWrongs];
            return options.sort(() => 0.5 - Math.random()); // Shuffle all options
        }

        setPrevOptions(generateOptions(prevAyahObj.text, prevAyahObj.isSpecial))
        setNextOptions(generateOptions(nextAyahObj.text, nextAyahObj.isSpecial))

        setIsLoading(false)
    }, [onBack, showToast])

    useEffect(() => {
        const hasSeen = StorageService.hasSeenTutorial('prev_next_mode_intro')
        if (!hasSeen) {
            setShowTutorial(true)
        }
    }, [])

    useEffect(() => {
        loadQuestion()
    }, [loadQuestion])

    const handleCheck = () => {
        // Validate inputs: if column exists, must have selection
        if (correctAnswers.prev && userAnswers.prev === null) return
        if (correctAnswers.next && userAnswers.next === null) return

        setAnswered(true)

        const prevCorrect = correctAnswers.prev ? prevOptions[userAnswers.prev]?.isCorrect : true
        const nextCorrect = correctAnswers.next ? nextOptions[userAnswers.next]?.isCorrect : true

        setResult({ prev: prevCorrect, next: nextCorrect })

        // SRS Logic
        // 5 = Both Correct (Mastery)
        // 2 = One Correct (Struggle / Partial) -> Treated as Fail in BSRS to force sooner review
        // 1 = Both Wrong (Fail)
        if (currentAyah && currentAyah.itemId) {
            let rating = 1
            if (prevCorrect && nextCorrect) rating = 5
            else if (prevCorrect || nextCorrect) rating = 2

            SRSService.saveChallengeSRS('prev_next', currentAyah.itemId, rating)
        }

        // Score update: Only if full correct? Or partial?
        // Game allows partial score generally, but let's be strict for "Streak"
        onUpdateScore(prevCorrect && nextCorrect)
        setIsFlipped(true)
    }

    if (isLoading) return <div className="text-center text-gold p-5">جاري التحميل...</div>
    if (!currentAyah) return null

    // Grid Logic: 1 Column or 2 Columns?
    const hasPrev = !!correctAnswers.prev
    const hasNext = !!correctAnswers.next
    const colClass = (hasPrev && hasNext) ? 'col-6' : 'col-12'

    return (
        <div
            className="prev-next-mode fade-in d-flex flex-column gap-3 mb-5 pb-5"
            onClick={() => {
                if (!answered) setUserAnswers({ prev: null, next: null })
            }}
        >
            {/* Current Page Card */}
            <div className="game-card card bg-dark border-gold shadow-lg" onClick={(e) => e.stopPropagation()}>
                <div className="card-body p-4 text-center">
                    <h5 className="text-gold mb-3 fs-6">
                        {hasPrev && hasNext ? 'ما الآية التي تسبق وتلحق هذه الآية؟' :
                            hasPrev ? 'ما الآية التي تسبق هذه الآية؟' : 'ما الآية التي تلحق هذه الآية؟'}
                    </h5>

                    {/* Top Content (Prev Hint) */}
                    {hasPrev && (
                        <div className="text-center my-2 text-muted" style={{ letterSpacing: '8px', fontSize: '1.3rem' }}>...</div>
                    )}

                    <div className="quran-text mb-2 text-center" style={{ lineHeight: '1.8', fontSize: '1.3rem' }}>
                        <div className="opacity-75">{currentAyah.text}</div>
                    </div>

                    {hasNext && (
                        <div className="text-center my-2 text-muted" style={{ letterSpacing: '8px', fontSize: '1.3rem' }}>...</div>
                    )}

                    <div className="mt-2">
                        <span className="badge bg-secondary me-2">{currentAyah.surahName}</span>
                        <span className="badge bg-warning text-dark">صفحة {currentAyah.pageNumber}</span>
                    </div>

                    {/* Correct Answer Reveal */}
                    {isFlipped && (
                        <div className="animate-fade-in mt-4 border-top border-secondary pt-3">
                            <div className="row g-3">
                                {hasPrev && (
                                    <div className={colClass}>
                                        <div className="p-2 border border-warning rounded" style={{ backgroundColor: 'rgba(255,193,7,0.05)' }}>
                                            <div className="badge bg-warning text-dark mb-1">← السابق</div>
                                            <div className="quran-text-sm">{correctAnswers.prev?.text}</div>
                                        </div>
                                    </div>
                                )}
                                {hasNext && (
                                    <div className={colClass}>
                                        <div className="p-2 border border-success rounded" style={{ backgroundColor: 'rgba(25,135,84,0.05)' }}>
                                            <div className="badge bg-success mb-1">اللاحق →</div>
                                            <div className="quran-text-sm">{correctAnswers.next?.text}</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Options Columns */}
            <div className="row g-3">
                {/* Previous Column */}
                {hasPrev && (
                    <div className={colClass}>
                        <div className="text-center mb-2">
                            <span className="badge bg-warning text-dark px-3 py-2">← السابق</span>
                            <small className="text-muted d-block mt-1">الآية السابقة</small>
                        </div>
                        <div className="d-flex flex-column gap-2">
                            {prevOptions.map((opt, idx) => {
                                return (
                                    <TruncatedOption
                                        key={idx}
                                        text={opt.text}
                                        isSelected={userAnswers.prev === idx}
                                        onSelect={() => !answered && setUserAnswers(prev => ({ ...prev, prev: idx }))}
                                        disabled={answered}
                                        className={`option-btn ${answered && opt.isCorrect ? 'correct' : ''
                                            } ${answered && userAnswers.prev === idx && !opt.isCorrect ? 'wrong' : ''}`}
                                    />
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* Next Column */}
                {hasNext && (
                    <div className={colClass}>
                        <div className="text-center mb-2" onClick={(e) => e.stopPropagation()}>
                            <span className="badge bg-success px-3 py-2">اللاحق →</span>
                            <small className="text-muted d-block mt-1">الآية اللاحقة</small>
                        </div>
                        <div className="d-flex flex-column gap-2">
                            {nextOptions.map((opt, idx) => {
                                return (
                                    <TruncatedOption
                                        key={idx}
                                        text={opt.text}
                                        isSelected={userAnswers.next === idx}
                                        onSelect={() => !answered && setUserAnswers(prev => ({ ...prev, next: idx }))}
                                        disabled={answered}
                                        className={`option-btn ${answered && opt.isCorrect ? 'correct' : ''
                                            } ${answered && userAnswers.next === idx && !opt.isCorrect ? 'wrong' : ''}`}
                                    />
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>



            {/* Check / Next Button */}
            {
                !answered ? (
                    <FixedConfirmButton
                        isVisible={!((hasPrev && userAnswers.prev === null) || (hasNext && userAnswers.next === null))}
                        onConfirm={handleCheck}
                        text="تحقق من الإجابة"
                    />
                ) : (
                    <div className="mt-2 text-center animated fadeInUp">
                        <button className="btn btn-gold btn-lg px-5 shadow-glow-gold" onClick={loadQuestion}>
                            السؤال التالي <i className="bi bi-arrow-left ms-2"></i>
                        </button>
                    </div>
                )
            }

            <TutorialOverlay
                steps={tutorialSteps}
                isOpen={showTutorial}
                onClose={() => {
                    setShowTutorial(false)
                    StorageService.markTutorialAsSeen('prev_next_mode_intro')
                }}
            />
        </div >
    )
}

export default PrevNextMode
