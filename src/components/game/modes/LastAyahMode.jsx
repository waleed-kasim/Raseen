import { useState, useEffect, useCallback } from 'react'
import { SRSService } from '../../../services/srs'
import { StorageService } from '../../../services/storage'
import { shuffleArray, numberToArabicIndic, truncateText, getSmartDistractors } from '../../../utils/javascUtil/gameUtils'
import TutorialOverlay from '../../ui/TutorialOverlay'
import AyahSeparator from '../../ui/AyahSeparator'
import TruncatedOption from '../../ui/TruncatedOption'
import FixedConfirmButton from '../../ui/FixedConfirmButton'

const LastAyahMode = ({ onUpdateScore, onBack, showToast }) => {
    const [currentPage, setCurrentPage] = useState(null)
    const [options, setOptions] = useState([])
    const [isFlipped, setIsFlipped] = useState(false)
    const [answered, setAnswered] = useState(false)
    const [selectedOption, setSelectedOption] = useState(null)
    const [isLoading, setIsLoading] = useState(true)

    const [showTutorial, setShowTutorial] = useState(false)
    const [tutorialSteps] = useState([
        {
            title: "ما الأخير؟",
            description: "يُعطى: أول آية ← حدد آخر آية في نفس الصفحة.",
            icon: "bi-arrow-bar-left"
        }
    ])

    const loadQuestion = useCallback(async () => {
        setIsLoading(true)
        setIsFlipped(false)
        setAnswered(false)
        setSelectedOption(null)

        const pages = StorageService.getCompositeMemorizedPages().filter(p => p.isFullyMemorized)

        const validPages = pages.filter(p => p.ayahs && p.ayahs.length > 1)
        if (validPages.length === 0) {
            showToast('لا توجد صفحات محفوظة بآيات كافية', 'error')
            onBack()
            return
        }

        // 1. Prepare candidates
        let candidates = validPages.map(p => ({
            id: `last_ayah:${p.id}`,
            page: p
        }))

        // 2. SRS Selection
        const challengeType = 'last_ayah'
        const smartItem = await SRSService.getSmartChallengeItem(challengeType, candidates)

        let page
        if (smartItem) {
            page = smartItem.page
        } else {
            page = validPages[Math.floor(Math.random() * validPages.length)]
        }

        setCurrentPage(page)

        // Find actual last ayah from ayahs array
        const lastAyah = page.ayahs[page.ayahs.length - 1]

        // Correct answer is the last ayah
        const correct = { ...lastAyah, isCorrect: true }

        // Wrong options from other pages using Smart Distractors
        const wrongPages = getSmartDistractors(page, validPages, 3, (p) => p.id)

        const wrongs = wrongPages.map(p => {
            const wrongLastAyah = p.ayahs[p.ayahs.length - 1]
            return { ...wrongLastAyah, isCorrect: false }
        })

        setOptions(shuffleArray([correct, ...wrongs]))
        setIsLoading(false)
    }, [onBack, showToast])

    useEffect(() => {
        const hasSeen = StorageService.hasSeenTutorial('last_ayah_intro')
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
        if (currentPage) {
            const rating = isCorrect ? 5 : 1
            SRSService.saveChallengeSRS('last_ayah', `last_ayah:${currentPage.id}`, rating)
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
            className="last-ayah-mode fade-in d-flex flex-column gap-3"
            onClick={() => {
                if (!answered && selectedOption !== null) setSelectedOption(null)
            }}
        >
            <div className="game-card card bg-dark border-gold shadow-lg">
                <div className="card-body p-4 text-center d-flex flex-column justify-content-center min-vh-25">
                    <div className="question-content animate-fade-in">
                        <h3 className="text-gold mb-3">هذه أول آية في الصفحة</h3>
                        <div className="quran-text-sm mb-4 p-3 border rounded border-secondary bg-black bg-opacity-25" dir="rtl" style={{ width: '100%' }}>
                            {currentPage.ayahs[0]?.text}
                        </div>
                        <p className="text-secondary mb-2">ما هي <strong>آخر آية</strong> في نفس الصفحة؟</p>
                        <div className="d-flex justify-content-center gap-2">
                            <span className="badge bg-secondary">{currentPage.surahName}</span>
                            <span className="badge bg-warning text-dark">صفحة {currentPage.pageNumber}</span>
                        </div>
                    </div>

                    {isFlipped && (
                        <div className="answer-content animate-fade-in mt-4 border-top border-secondary pt-3">
                            <div className="p-3 border border-success rounded bg-success bg-opacity-10" dir="rtl" style={{ textAlign: 'center' }}>
                                <strong className="text-success d-block mb-2 text-center">الإجابة الصحيحة (آخر آية):</strong>
                                <span className="quran-text-sm d-block">
                                    {currentPage.ayahs[currentPage.ayahs.length - 1]?.text} <AyahSeparator number={currentPage.ayahs[currentPage.ayahs.length - 1]?.number} className="text-gold" />
                                </span>
                            </div>
                            <div className="mt-3">
                                <span className="badge bg-warning text-dark">صفحة {currentPage.pageNumber}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className={`answer-options d-grid gap-2 page-recognition-grid mb-5 ${answered ? '' : 'pb-5'}`}>
                {options.map((opt, idx) => (
                    <TruncatedOption
                        key={idx}
                        text={opt.text}
                        isSelected={selectedOption === idx}
                        onSelect={() => !answered && setSelectedOption(idx)}
                        disabled={answered}
                        className={`option-btn ${answered && opt.isCorrect ? 'correct' : ''
                            } ${answered && selectedOption === idx && !opt.isCorrect ? 'wrong' : ''}`}
                    />
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
                    StorageService.markTutorialAsSeen('last_ayah_intro')
                }}
            />
        </div>
    )
}

export default LastAyahMode
