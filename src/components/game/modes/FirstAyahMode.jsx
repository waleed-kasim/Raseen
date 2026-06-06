import { useState, useEffect, useCallback } from 'react'
import { StorageService } from '../../../services/storage'
import { SRSService } from '../../../services/srs'
import { shuffleArray, truncateText, getSmartDistractors } from '../../../utils/javascUtil/gameUtils'
import TutorialOverlay from '../../ui/TutorialOverlay'
import AyahSeparator from '../../ui/AyahSeparator'
import FixedConfirmButton from '../../ui/FixedConfirmButton'
import { useSRSEngine } from '../../../hooks/game/useSRSEngine'
import OptionsContainer from '../../../utils/reactUtil/OptionsContainer'

const FirstAyahMode = ({ onUpdateScore, onBack, showToast }) => {
    const [currentPage, setCurrentPage] = useState(null)
    const [options, setOptions] = useState([])
    const [isLoading, setIsLoading] = useState(true)

    const {
        answered,
        selectedOption,
        setSelectedOption,
        isFlipped,
        handleAnswer: submitAnswer,
        resetEngine
    } = useSRSEngine({ challengeType: 'first_ayah', onUpdateScore })

    const [showTutorial, setShowTutorial] = useState(false)
    const [tutorialSteps] = useState([
        {
            title: "ما الأول؟",
            description: "يُعطى: آخر آية + رقم الصفحة ← حدد أول آية في نفس الصفحة.",
            icon: "bi-arrow-bar-right"
        }
    ])

    const loadQuestion = useCallback(async () => {
        setIsLoading(true)
        resetEngine()

        const pages = StorageService.getCompositeMemorizedPages().filter(p => p.isFullyMemorized)

        // Exclude pages with only 1 ayah (e.g. Page 48) as the answer is trivial
        const validPages = pages.filter(p => p.ayahs && p.ayahs.length > 1)
        if (validPages.length === 0) {
            showToast('لا توجد صفحات محفوظة بآيات كافية', 'error')
            onBack()
            return
        }

        let candidates = validPages.map(p => ({
            id: `first_ayah:${p.id}`, // One challenge per page
            page: p
        }))

        // 2. SRS Selection
        const challengeType = 'first_ayah'
        const smartItem = await SRSService.getSmartChallengeItem(challengeType, candidates)

        let page
        if (smartItem) {
            page = smartItem.page
        } else {
            page = validPages[Math.floor(Math.random() * validPages.length)]
        }

        setCurrentPage(page)

        // Find the actual first and last ayahs from the ayahs array
        const firstAyah = page.ayahs[0]

        // Correct answer is the first ayah
        const correct = { ...firstAyah, isCorrect: true }

        // Wrong options from other pages using Smart Distractors
        const wrongPages = getSmartDistractors(page, validPages, 3, (p) => p.id)

        const wrongs = wrongPages.map(p => {
            const wrongFirstAyah = p.ayahs[0]
            return { ...wrongFirstAyah, isCorrect: false }
        })

        setOptions(shuffleArray([correct, ...wrongs]))
        setIsLoading(false)
    }, [onBack, showToast])

    useEffect(() => {
        const hasSeen = StorageService.hasSeenTutorial('first_ayah_intro')
        if (!hasSeen) {
            setShowTutorial(true)
        }
    }, [])

    useEffect(() => {
        loadQuestion()
    }, [loadQuestion])

    const handleAnswer = (idx) => {
        if (answered) return

        const selected = options[idx]
        submitAnswer(idx, selected.isCorrect, currentPage?.id)
    }

    const handleNext = () => {
        loadQuestion()
    }

    if (isLoading) return <div className="text-center text-gold p-5">جاري التحميل...</div>
    if (!currentPage) return null

    return (
        <div
            className="first-ayah-mode fade-in d-flex flex-column gap-3"
            onClick={() => {
                if (!answered && selectedOption !== null) setSelectedOption(null)
            }}
        >
            <div className="game-card card bg-dark border-gold shadow-lg">
                <div className="card-body p-4 text-center d-flex flex-column justify-content-center min-vh-25">
                    <div className="question-content animate-fade-in">
                        <h3 className="text-gold mb-3">هذه آخر آية في الصفحة</h3>
                        <div className="quran-text-sm mb-4 p-3 border rounded border-secondary bg-black bg-opacity-25" dir="rtl" style={{ width: '100%' }}>
                            {currentPage.ayahs[currentPage.ayahs.length - 1]?.text}
                        </div>
                        <p className="text-secondary mb-2">ما هي <strong>أول آية</strong> في نفس الصفحة؟</p>
                        <div className="d-flex justify-content-center gap-2">
                            <span className="badge bg-secondary">{currentPage.surahName}</span>
                            <span className="badge bg-warning text-dark">صفحة {currentPage.pageNumber}</span>
                        </div>
                    </div>

                    {isFlipped && (
                        <div className="answer-content animate-fade-in mt-4 border-top border-secondary pt-3">
                            <div className="p-3 border border-success rounded bg-success bg-opacity-10" dir="rtl" style={{ textAlign: 'center' }}>
                                <strong className="text-success d-block mb-2 text-center">الإجابة الصحيحة (أول آية):</strong>
                                <span className="quran-text-sm d-block">
                                    {currentPage.ayahs[0]?.text} <AyahSeparator number={currentPage.ayahs[0]?.number} className="text-gold" />
                                </span>
                            </div>
                            <div className="mt-3">
                                <span className="badge bg-warning text-dark">صفحة {currentPage.pageNumber}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <OptionsContainer
                options={options}
                answered={answered}
                selectedOption={selectedOption}
                onSelect={(idx) => !answered && setSelectedOption(idx)}
            />

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
                    StorageService.markTutorialAsSeen('first_ayah_intro')
                }}
            />
        </div>
    )
}

export default FirstAyahMode
