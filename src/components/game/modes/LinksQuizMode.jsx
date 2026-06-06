import { useState, useEffect, useCallback } from 'react'
import { StorageService } from '../../../services/storage'
import { SRSService } from '../../../services/srs'
import { shuffleArray, numberToArabicIndic, getSmartDistractors } from '../../../utils/javascUtil/gameUtils'
import AyahSeparator from '../../ui/AyahSeparator'
import TutorialOverlay from '../../ui/TutorialOverlay'
import TruncatedOption from '../../ui/TruncatedOption'
import FixedConfirmButton from '../../ui/FixedConfirmButton'

const LinksQuizMode = ({ onUpdateScore, onBack, showToast }) => {
    const [currentPage, setCurrentPage] = useState(null)
    const [options, setOptions] = useState([])
    const [isFlipped, setIsFlipped] = useState(false)
    const [answered, setAnswered] = useState(false)
    const [selectedOption, setSelectedOption] = useState(null)
    const [isLoading, setIsLoading] = useState(true)

    const [showTutorial, setShowTutorial] = useState(false)
    const [tutorialSteps] = useState([
        {
            title: "اختبار الروابط",
            description: "اختبار: يُعطى آية ← حدد الآية التي تليها (ربط الصفحات).",
            icon: "bi-check-circle"
        }
    ])

    const loadQuestion = useCallback(async () => {
        setIsLoading(true)
        setIsFlipped(false)
        setAnswered(false)
        setSelectedOption(null)

        const pages = StorageService.getCompositeMemorizedPages().filter(p => p.isFullyMemorized)
        const sortedPages = [...pages].sort((a, b) => a.pageNumber - b.pageNumber)
        const linksData = []

        for (let i = 1; i < sortedPages.length; i++) {
            if (sortedPages[i].pageNumber === sortedPages[i - 1].pageNumber + 1) {
                const prevPage = sortedPages[i - 1];
                const currPage = sortedPages[i];
                const prevLastChunk = prevPage.chunks ? prevPage.chunks[prevPage.chunks.length - 1] : prevPage;
                const currFirstChunk = currPage.chunks ? currPage.chunks[0] : currPage;
                if (prevLastChunk.surahId === currFirstChunk.surahId) {
                    const prevLastAyah = prevLastChunk.ayahs ? prevLastChunk.ayahs[prevLastChunk.ayahs.length - 1] : null;
                    const currFirstAyah = currFirstChunk.ayahs ? currFirstChunk.ayahs[0] : null;
                    if (prevLastAyah && currFirstAyah && currFirstAyah.number === prevLastAyah.number + 1) {
                        linksData.push({ prevPage, currPage, prevLastAyah, currFirstAyah });
                    }
                }
            }
        }

        if (linksData.length === 0) {
            showToast('لا توجد بيانات كافية للاختبار. احفظ صفحتين متتاليتين على الأقل.', 'warning')
            onBack()
            return
        }

        // 1. Prepare candidates
        let candidates = linksData.map(link => ({
            id: `links_quiz:${link.currFirstAyah.number}:${link.currPage.surahId}`, // Unique ID for the link
            link
        }))

        // 2. SRS Selection
        const challengeType = 'links_quiz'
        const smartItem = await SRSService.getSmartChallengeItem(challengeType, candidates)

        let link
        if (smartItem) {
            link = smartItem.link
        } else {
            link = linksData[Math.floor(Math.random() * linksData.length)]
        }

        setCurrentPage(link)

        // Generate options
        const correct = { ...link.currFirstAyah, isCorrect: true }

        // Smart Distractors:
        // We want distracting "Next Ayahs".
        // The correct next ayah is from link.currPage.
        // We should find distracting pages similar/close to link.currPage.
        const wrongPages = getSmartDistractors(link.currPage, pages, 3, (p) => p.id)

        const wrongs = wrongPages.map(p => {
            const wrongFirstAyah = p.ayahs[0]
            return { ...wrongFirstAyah, isCorrect: false }
        })

        setOptions(shuffleArray([correct, ...wrongs]))
        setIsLoading(false)
    }, [onBack, showToast])

    useEffect(() => {
        const hasSeen = StorageService.hasSeenTutorial('links_quiz_intro')
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
            // Reconstruct ID
            const id = `links_quiz:${currentPage.currFirstAyah.number}:${currentPage.currPage.surahId}`
            const rating = isCorrect ? 5 : 1
            SRSService.saveChallengeSRS('links_quiz', id, rating)
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
            className="links-quiz-mode fade-in d-flex flex-column gap-3"
            onClick={() => {
                if (!answered && selectedOption !== null) setSelectedOption(null)
            }}
        >
            <div className="game-card card bg-dark border-gold shadow-lg">
                <div className="card-body p-4 text-center d-flex flex-column justify-content-center min-vh-25">
                    <div className="question-content animate-fade-in">
                        <h3 className="text-gold mb-3">ما هي الآية التالية؟</h3>
                        <div className="p-3 mb-3 border border-secondary rounded bg-black bg-opacity-25">
                            <small className="text-muted d-block mb-2">نهاية صفحة {currentPage.prevPage.pageNumber}</small>
                            <div className="quran-text-sm" dir="rtl">
                                {currentPage.prevLastAyah?.text}
                            </div>
                        </div>
                        <i className="bi bi-arrow-down text-gold h3 my-2"></i>
                        <p className="text-secondary mb-0">اختر الآية التي تبدأ بها الصفحة {currentPage.currPage.pageNumber}</p>
                    </div>

                    {isFlipped && (
                        <div className="answer-content animate-fade-in mt-4 border-top border-secondary pt-3">
                            <div className="p-3 border border-success rounded bg-success bg-opacity-10">
                                <span className="badge bg-success mb-2">بداية صفحة {currentPage.currPage.pageNumber}</span>
                                <div className="quran-text-sm" dir="rtl">
                                    {currentPage.currFirstAyah?.text} <AyahSeparator number={currentPage.currFirstAyah?.number} />
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
                    StorageService.markTutorialAsSeen('links_quiz_intro')
                }}
            />
        </div>
    )
}

export default LinksQuizMode
