import { useState, useEffect, useCallback } from 'react'
import { StorageService } from '../../../services/storage'
import { SRSService } from '../../../services/srs'
import { shuffleArray, numberToArabicIndic } from '../../../utils/javascUtil/gameUtils'
import TutorialOverlay from '../../ui/TutorialOverlay'
import TruncatedOption from '../../ui/TruncatedOption'
import FixedConfirmButton from '../../ui/FixedConfirmButton'

const NumberToAyahMode = ({ onUpdateScore, onBack, showToast }) => {
    const [currentPage, setCurrentPage] = useState(null)
    const [options, setOptions] = useState([])
    const [isFlipped, setIsFlipped] = useState(false)
    const [answered, setAnswered] = useState(false)
    const [selectedOption, setSelectedOption] = useState(null)
    const [isLoading, setIsLoading] = useState(true)

    const [showTutorial, setShowTutorial] = useState(false)
    const [tutorialSteps] = useState([
        {
            title: "الآية من الرقم",
            description: "يُعطى رقم الآية ← حدد نص الآية الصحيح.",
            icon: "bi-book"
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

        // 1. Prepare candidates
        // We want to test "Ayah Number -> Text"
        // Candidate: Ayah
        const candidates = []
        validPages.forEach(p => {
            p.ayahs.forEach(a => {
                candidates.push({
                    id: `number_to_ayah:${p.surahId}:${a.number}`,
                    page: p,
                    ayah: a
                })
            })
        })

        // 2. SRS Selection
        const challengeType = 'number_to_ayah'
        const smartItem = await SRSService.getSmartChallengeItem(challengeType, candidates)

        let target
        if (smartItem) {
            target = smartItem
        } else {
            target = candidates[Math.floor(Math.random() * candidates.length)]
        }

        const { page, ayah } = target
        setCurrentPage({ ...page, currentAyah: ayah, itemId: target.id })

        // Get wrong ayahs from valid (memorized) pages only
        // Avoid current ayah

        const allOtherAyahs = candidates.filter(c => c.ayah.text !== ayah.text).map(c => c.ayah)

        const wrongs = shuffleArray(allOtherAyahs).slice(0, 3).map(a => ({ ...a, isCorrect: false }))
        const opts = shuffleArray([
            { ...ayah, isCorrect: true },
            ...wrongs
        ])
        setOptions(opts)
        setIsLoading(false)
    }, [onBack, showToast])

    useEffect(() => {
        const hasSeen = StorageService.hasSeenTutorial('number_to_ayah_intro')
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
            SRSService.saveChallengeSRS('number_to_ayah', currentPage.itemId, rating)
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
            className="number-to-ayah-mode fade-in d-flex flex-column gap-3"
            onClick={() => {
                if (!answered && selectedOption !== null) setSelectedOption(null)
            }}
        >
            <div className="game-card card bg-dark border-gold shadow-lg">
                <div className="card-body p-4 text-center d-flex flex-column justify-content-center min-vh-25">
                    <div className="question-content animate-fade-in">
                        <h3 className="text-gold mb-3">ما هي الآية رقم {numberToArabicIndic(currentPage.currentAyah?.number)}؟</h3>
                        <p className="text-secondary mb-0">في سورة {currentPage.surahName} - صفحة {currentPage.pageNumber}</p>
                    </div>

                    {isFlipped && (
                        <div className="answer-content animate-fade-in mt-4 border-top border-secondary pt-3">
                            <div className="p-3 border border-success rounded bg-success bg-opacity-10">
                                <span className="badge bg-warning text-dark mb-2">
                                    الآية {numberToArabicIndic(currentPage.currentAyah?.number)}
                                </span>
                                <div className="quran-text-sm" dir="rtl">
                                    {currentPage.currentAyah?.text}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className={`answer-options d-flex flex-column gap-2 mb-5 ${answered ? '' : 'pb-5'}`}>
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
                    StorageService.markTutorialAsSeen('number_to_ayah_intro')
                }}
            />
        </div>
    )
}

export default NumberToAyahMode
