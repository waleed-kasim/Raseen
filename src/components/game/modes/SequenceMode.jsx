import { useState, useEffect, useCallback } from 'react'
import { StorageService } from '../../../services/storage'
import { SRSService } from '../../../services/srs'
import { shuffleArray, getFirstWords, getLastWords } from '../../../utils/javascUtil/gameUtils'
import TutorialOverlay from '../../ui/TutorialOverlay'
import FixedConfirmButton from '../../ui/FixedConfirmButton'

const SequenceMode = ({ onUpdateScore, onBack, showToast }) => {
    const [page1, setPage1] = useState(null)
    const [page2, setPage2] = useState(null)
    const [isFlipped, setIsFlipped] = useState(false)
    const [answered, setAnswered] = useState(false)
    const [selectedOption, setSelectedOption] = useState(null)
    const [isLoading, setIsLoading] = useState(true)

    const [showTutorial, setShowTutorial] = useState(false)
    const [tutorialSteps] = useState([
        {
            title: "الترتيب",
            description: "صفحتان (قد لا تكونا متتاليتين) ← أيهما تأتي أولاً في المصحف؟",
            icon: "bi-sort-numeric-down"
        }
    ])

    const loadQuestion = useCallback(async () => {
        setIsLoading(true)
        setIsFlipped(false)
        setAnswered(false)
        setSelectedOption(null)

        const pages = StorageService.getCompositeMemorizedPages().filter(p => p.isFullyMemorized)
        if (pages.length < 2) {
            showToast('تحتاج لحفظ صفحتين على الأقل لتفعيل هذا الوضع.', 'error')
            onBack()
            return
        }

        // 1. Prepare candidates
        const candidates = pages.map(p => ({
            id: `sequence_mode:${p.id}`,
            page: p
        }))

        // 2. SRS Selection (for at least one page)
        const challengeType = 'sequence_mode'
        const smartItem = await SRSService.getSmartChallengeItem(challengeType, candidates)

        let p1
        if (smartItem) {
            p1 = smartItem.page
        } else {
            p1 = pages[Math.floor(Math.random() * pages.length)]
        }

        // Pick p2 randomly, but different from p1
        let p2
        do {
            p2 = pages[Math.floor(Math.random() * pages.length)]
        } while (p2.pageNumber === p1.pageNumber)

        // Shuffle position for display (so p1 isn't always first in state)
        // But we store them as page1 and page2
        setPage1(p1)
        setPage2(p2)
        setIsLoading(false)
    }, [onBack, showToast])

    useEffect(() => {
        const hasSeen = StorageService.hasSeenTutorial('sequence_mode_intro')
        if (!hasSeen) {
            setShowTutorial(true)
        }
    }, [])

    useEffect(() => {
        loadQuestion()
    }, [loadQuestion])

    const handleAnswer = (choice) => {
        if (answered) return
        setAnswered(true)
        setSelectedOption(choice)
        const selectedPage = choice === 1 ? page1 : page2
        const otherPage = choice === 1 ? page2 : page1

        // User chooses the one that comes FIRST
        // Correct if selectedPage.pageNumber < otherPage.pageNumber
        const isCorrect = selectedPage.pageNumber < otherPage.pageNumber

        // SRS Save for BOTH pages involved?
        // Logic: if you can't tell them apart, you failed both? Or just the one you missed?
        // Generic SRS approach: If relation failed, penalize both items involved in relation.
        if (page1 && page2) {
            const rating = isCorrect ? 5 : 1
            SRSService.saveChallengeSRS('sequence_mode', `sequence_mode:${page1.id}`, rating)
            SRSService.saveChallengeSRS('sequence_mode', `sequence_mode:${page2.id}`, rating)
        }

        onUpdateScore(isCorrect)
        setIsFlipped(true)
    }

    const handleNext = () => {
        loadQuestion()
    }

    if (isLoading) return <div className="text-center text-gold p-5">جاري التحميل...</div>
    if (!page1 || !page2) return null

    const firstPage = page1.pageNumber < page2.pageNumber ? page1 : page2
    const secondPage = page1.pageNumber < page2.pageNumber ? page2 : page1

    const getPageContent = (page) => {
        const text = (page.ayahs || []).map(a => a.text).join(' ')
        return { first: getFirstWords(text, 10), last: getLastWords(text, 10) }
    }

    return (
        <div
            className="sequence-mode fade-in d-flex flex-column gap-3 mb-5 pb-5"
            onClick={() => {
                if (!answered && selectedOption !== null) setSelectedOption(null)
            }}
        >
            <div className="game-card card bg-dark border-gold shadow-lg">
                <div className="card-body p-4 text-center min-vh-25 d-flex flex-column justify-content-center">
                    <div className="question-content animate-fade-in">
                        <h3 className="text-gold mb-3">أي الصفحتين تأتي أولاً؟</h3>
                        <p className="text-secondary mb-0">اختر الصفحة التي تسبق الأخرى في ترتيب المصحف</p>
                    </div>

                    {isFlipped && (
                        <div className="answer-content animate-fade-in mt-4 border-top border-secondary pt-3">
                            <div className="d-flex flex-column gap-2 align-items-center">
                                <div className="p-2 border border-warning rounded w-100">
                                    <small className="text-muted d-block">الأولى</small>
                                    <span className="text-gold fw-bold">صفحة {firstPage.pageNumber}</span>
                                    <span className="ms-2 badge bg-dark">{firstPage.surahName}</span>
                                </div>
                                <i className="bi bi-arrow-down text-secondary"></i>
                                <div className="p-2 border border-success rounded w-100">
                                    <small className="text-muted d-block">الثانية</small>
                                    <span className="text-success fw-bold">صفحة {secondPage.pageNumber}</span>
                                    <span className="ms-2 badge bg-dark">{secondPage.surahName}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="answer-options d-flex flex-column gap-3">
                {[
                    { page: page1, val: 1 },
                    { page: page2, val: 2 }

                ].map((item, idx) => {
                    const content = getPageContent(item.page)
                    return (
                        <button
                            key={idx}
                            className={`btn btn-custom option-btn w-100 p-3 text-start d-flex align-items-center justify-content-between ${answered && ((item.page.pageNumber < (item.val === 1 ? page2.pageNumber : page1.pageNumber)) ? 'correct' : '')
                                } ${answered && selectedOption === item.val && (item.page.pageNumber > (item.val === 1 ? page2.pageNumber : page1.pageNumber)) ? 'wrong' : ''} ${!answered && selectedOption === item.val ? 'selected' : ''}`}
                            style={{
                                borderColor: !answered && selectedOption === item.val ? 'var(--accent-gold)' : undefined,
                                backgroundColor: !answered && selectedOption === item.val ? 'rgba(255, 215, 0, 0.1)' : undefined
                            }}
                            onClick={(e) => {
                                e.stopPropagation()
                                if (!answered) setSelectedOption(item.val)
                            }}
                            disabled={answered}
                        >
                            <div className="flex-grow-1 text-center">
                                <div className="quran-text-sm mb-2">
                                    <div className="opacity-75">{content.first}</div>
                                </div>
                                <div className="my-1 text-muted" style={{ letterSpacing: '4px' }}>...</div>
                                <div className="quran-text-sm mb-1">
                                    <div className="opacity-75">{content.last}</div>
                                </div>
                                <small className="text-muted d-block mt-2">{item.page.surahName}</small>
                            </div>
                            {/* <span className="badge bg-secondary ms-2 opacity-50">خيار {idx + 1}</span> */}
                        </button>
                    )
                })}
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
                    StorageService.markTutorialAsSeen('sequence_mode_intro')
                }}
            />
        </div>
    )
}

export default SequenceMode
