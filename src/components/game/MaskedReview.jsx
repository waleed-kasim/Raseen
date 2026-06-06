import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { SRSService } from '../../services/srs'
import StorageService from '../../services/storage'
import { annotationService } from '../../services/annotations'
import mutashabihatPhrases from '../../data/mutashabihat_phrases.json'
import mutashabihatVerses from '../../data/mutashabihat_verses.json'
import { MutashabihatViewerModal } from '../ui/WordRenderer'
import AnnotationContextMenu from '../ui/AnnotationContextMenu'
import AnnotationInputModal from '../ui/AnnotationInputModal'
import AnnotationTooltip from '../ui/AnnotationTooltip'
import MobileAnnotationViewer from '../ui/MobileAnnotationViewer'
import SurahDivider from '../ui/SurahDivider'
import BlurredChunk from '../ui/BlurredChunk'
import Bismillah from '../ui/Bismillah'
import { toArabicIndic } from '../../utils/javascUtil/arabicUtils'
import AyahSeparator from '../ui/AyahSeparator'
import BackButton from '../ui/BackButton'
import TutorialOverlay from '../ui/TutorialOverlay'
import ReviewEngine from './engine/ReviewEngine'
import RatingButtons from '../ui/RatingButtons'
import quranWordWeights from '../../data/quran_word_weights.json'
import { THEMES_DATA } from '../../data/themes'

const MaskedReview = ({ onBack, showToast }) => {
    const [page, setPage] = useState(null)
    const [words, setWords] = useState([])
    const [status, setStatus] = useState('loading') // loading, playing, rating
    
    // Smart Review Settings
    const [mode, setMode] = useState(() => localStorage.getItem('smartReviewMode') || 'flip')
    const [selectedFont, setSelectedFont] = useState(() => localStorage.getItem('smartReviewFont') || 'Amiri Quran')
    const [useDynamicWidth, setUseDynamicWidth] = useState(() => localStorage.getItem('smartReviewDynamicWidth') !== 'false')
    const [showSettings, setShowSettings] = useState(false)

    const [isPortrait, setIsPortrait] = useState(window.innerHeight > window.innerWidth)
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

    useEffect(() => {
        const handleResize = () => {
            setIsPortrait(window.innerHeight > window.innerWidth)
            setIsMobile(window.innerWidth < 768)
        }
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    useEffect(() => {
        const lockOrientation = async () => {
            if (mode === 'twopage' && screen.orientation && typeof screen.orientation.lock === 'function') {
                try {
                    await screen.orientation.lock('landscape')
                } catch (e) {
                    console.log('Orientation lock not supported or rejected:', e)
                }
            }
        }
        lockOrientation()
        return () => {
            if (screen.orientation && typeof screen.orientation.unlock === 'function') {
                try {
                    screen.orientation.unlock()
                } catch (e) {}
            }
        }
    }, [mode])

    // Font Options
    const quranFonts = [
        { id: 'Amiri Quran', name: 'الأميري (قرآن)', family: "'Amiri Quran'" },
        { id: 'Scheherazade New', name: 'شهرزاد (عادي)', family: "'Scheherazade New'" },
        { id: 'Hafs', name: 'خط حفص (محلي)', family: "'Hafs'" }
    ]

    const changeMode = (newMode) => {
        setMode(newMode)
        localStorage.setItem('smartReviewMode', newMode)
    }

    const handleFontChange = (e) => {
        const font = e.target.value
        setSelectedFont(font)
        localStorage.setItem('smartReviewFont', font)
    }

    const [timer, setTimer] = useState(0)
    const [revealedCount, setRevealedCount] = useState(0)
    const [startTime, setStartTime] = useState(null)
    const [isPaused, setIsPaused] = useState(true)
    const [sliderValue, setSliderValue] = useState(100)
    const [isSmartTiming, setIsSmartTiming] = useState(() => {
        return localStorage.getItem('quran_smart_timing') !== 'false'
    })
    const [initialLoadComplete, setInitialLoadComplete] = useState(false)

    // Forced Rating State
    const [pageLoadTime, setPageLoadTime] = useState(Date.now())
    const [showForcedRating, setShowForcedRating] = useState(false)
    const [pendingNavigation, setPendingNavigation] = useState(null)

    useEffect(() => {
        localStorage.setItem('quran_smart_timing', isSmartTiming)
    }, [isSmartTiming])
    const sliderRef = useRef(null)
    // this is rverse way because the slider is reverse
    const autoRevealSpeed = sliderValue === 100 ? 0 : Math.max(600, Math.round(2400 - ((-1 * sliderValue + 100) / 99) * (2400 - 600)))

    // Annotation State
    const [annotations, setAnnotations] = useState({})
    const [selectedWordIds, setSelectedWordIds] = useState(new Set())
    const [contextMenu, setContextMenu] = useState(null)
    const [tooltip, setTooltip] = useState(null)
    const [mobileViewer, setMobileViewer] = useState(null)
    const [inputModal, setInputModal] = useState({ show: false, type: null, initialValue: '' })
    const [mobileAnchor, setMobileAnchor] = useState(null)
    const [selectedRating, setSelectedRating] = useState(null)
    const [globalBookmark, setGlobalBookmark] = useState(StorageService.getGlobalBookmark())
    const [activeMutashabihah, setActiveMutashabihah] = useState(null)
    const containerRef = useRef(null)

    const getMutashabihahPhrase = useCallback((sId, ayahNum, wordIdx) => {
        const key = `${sId}:${ayahNum}`
        const phraseIds = mutashabihatVerses[key]
        if (!phraseIds) return null
        
        const memorizedPageIds = new Set(StorageService.getMemorizedPageIds())
        const sortedPages = StorageService.getSortedPages()

        for (const phraseId of phraseIds) {
            const phraseData = mutashabihatPhrases[phraseId]
            if (!phraseData) continue
            
            // Count memorized occurrences
            const keys = Object.keys(phraseData.ayah)
            let memorizedCount = 0
            for (const k of keys) {
                const [surah, ayah] = k.split(':').map(Number)
                const pageObj = sortedPages.find(p => p.surahId === surah && p.ayahs.some(a => a.number === ayah))
                if (pageObj && memorizedPageIds.has(pageObj.id)) {
                    memorizedCount++
                }
            }

            if (memorizedCount >= 2) {
                const ranges = phraseData.ayah[key]
                if (ranges) {
                    for (const [start, end] of ranges) {
                        if (wordIdx >= start && wordIdx < end) {
                            return { phraseId, phraseData }
                        }
                    }
                }
            }
        }
        return null
    }, [])

    // Handle Resize
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768)
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    // Load just the smart page and not bookmark(ever)
    useEffect(() => {
        const boomarkPage = StorageService.getGlobalBookmark()
        loadSmartPage()
    }, [])

    const toggleGlobalBookmark = (e) => {
        e.stopPropagation();
        if (!page) return;

        if (globalBookmark === page.id) {
            StorageService.setGlobalBookmark(null)
            setGlobalBookmark(null)
            showToast('تم إزالة العلامة المرجعية', 'info')
        } else {
            StorageService.setGlobalBookmark(page.id)
            setGlobalBookmark(page.id)
            showToast('تم تعيين الصفحة كعلامة مرجعية', 'success')
        }
    }

    // Tutorial Logic
    const [showTutorial, setShowTutorial] = useState(false)
    const [tutorialSteps] = useState([
        {
            title: "المراجعة الذكية",
            description: "الكلمات المخفية تُكشف تلقائياً. تحكم بالسرعة من الشريط السفلي وقيّم حفظك.",
            icon: "bi-eye-slash"
        }
    ])

    useEffect(() => {
        const hasSeen = StorageService.hasSeenTutorial('masked_review_intro')
        if (!hasSeen) {
            setShowTutorial(true)
        }
    }, [])

    // Timer
    useEffect(() => {
        let interval
        if (status === 'playing' && !isPaused) {
            interval = setInterval(() => {
                setTimer(prev => prev + 1)
            }, 1000)
        }
        return () => clearInterval(interval)
    }, [status, isPaused])

    // Auto-reveal setTimeout loop supporting variable Tajweed speeds per word
    useEffect(() => {
        if (autoRevealSpeed === 0 || status !== 'playing' || isPaused) return

        let timeoutId

        const scheduleNextReveal = () => {
            const firstMaskedIdx = words.findIndex(w => w.isMasked)
            
            if (firstMaskedIdx !== -1) {
                // Determine weight of the word the user is currently reading (the last unmasked word)
                const currentWordIdx = firstMaskedIdx > 0 ? firstMaskedIdx - 1 : 0
                const currentWord = words[currentWordIdx]
                const weight = isSmartTiming ? (currentWord?.weight || 1.0) : 1.0
                const delay = autoRevealSpeed * weight

                timeoutId = setTimeout(() => {
                    setWords(prev => {
                        const idx = prev.findIndex(w => w.isMasked)
                        if (idx === -1) return prev
                        const newWords = [...prev]
                        newWords[idx] = { ...newWords[idx], isMasked: false }
                        setRevealedCount(c => c + 1)
                        return newWords
                    })
                }, delay)
            }
        }

        scheduleNextReveal()

        return () => clearTimeout(timeoutId)
    }, [autoRevealSpeed, status, isPaused, words, isSmartTiming])

    const [showPageSelector, setShowPageSelector] = useState(false)
    const [allPages, setAllPages] = useState([])

    const pagePairs = useMemo(() => {
        const pairs = []
        for (let i = 0; i < allPages.length; i += 2) {
            pairs.push({
                id: `pair_${i}`,
                right: allPages[i],
                left: allPages[i + 1] || null,
                index: i / 2
            })
        }
        return pairs
    }, [allPages])

    const loadSmartPage = async (manualPageId = null, direction = 'next') => {
        // Only show full loading spinner if we don't have a page yet
        if (!page) setStatus('loading')

        setSelectedRating(null)
        try {
            let srsPage;
            let targetOffset = direction === 'next' ? 100 : -100;

            if (manualPageId) {
                const pages = getPagesSafe()
                let srsPage = pages.find(p => p.id === manualPageId || (p.chunks && p.chunks.some(c => c.id === manualPageId)))

                if (srsPage) {
                    if (!srsPage.chunks) {
                        const siblingChunks = StorageService.getPageChunks(srsPage.pageNumber)
                        if (siblingChunks.length > 1) {
                            const enrichedChunks = siblingChunks
                                .sort((a, b) => a.surahId - b.surahId)
                                .map(c => ({ ...c, isMemorized: StorageService.isPageMemorized(c.id) }))
                            srsPage = {
                                ...srsPage,
                                chunks: enrichedChunks,
                                isComposite: true,
                                surahName: enrichedChunks.map(c => c.surahName).filter((v, i, a) => a.indexOf(v) === i).join(' / '),
                                ayahs: enrichedChunks.flatMap(c => c.ayahs),
                                firstAyahId: enrichedChunks[0].firstAyahId,
                                lastAyahId: enrichedChunks[enrichedChunks.length - 1].lastAyahId
                            }
                        }
                    }

                    updatePageState(srsPage)

                    // Fetch SRS in background without blocking UI
                    SRSService.getPageSRS(manualPageId).then(srsData => {
                        if (srsData) {
                            setPage(prev => {
                                if (prev && prev.id === manualPageId) {
                                    return { ...prev, srs: srsData }
                                }
                                return prev
                            })
                        }
                    }).catch(e => console.error('Failed to fetch SRS for page in background', e))
                }
                return
            } else {
                // Smart Selection with Exclusion
                if (mode === 'twopage') {
                    const pagesList = getPagesSafe()
                    const currentIdx = pagesList.findIndex(p => p.id === page?.id)
                    const nextPairIdx = currentIdx !== -1 ? Math.floor(currentIdx / 2) * 2 + 2 : -1
                    if (nextPairIdx !== -1 && nextPairIdx < pagesList.length) {
                        srsPage = pagesList[nextPairIdx]
                    } else {
                        const currentPair = page ? pagePairs.find(p => p.right?.id === page.id || p.left?.id === page.id) : null
                        const excludeIds = []
                        if (currentPair) {
                            if (currentPair.right) excludeIds.push(currentPair.right.id)
                            if (currentPair.left) excludeIds.push(currentPair.left.id)
                        }
                        srsPage = await SRSService.getSmartPage(excludeIds)
                    }
                } else {
                    const excludeIds = page ? [page.id] : []
                    srsPage = await SRSService.getSmartPage(excludeIds)
                }

                // Fallback loop prevention (just in case)
                if (page && srsPage && String(srsPage.id) === String(page.id)) {
                    const pagesList = getPagesSafe()
                    const currentIndex = pagesList.findIndex(p => String(p.id) === String(page.id))
                    if (currentIndex !== -1 && currentIndex < pagesList.length - 1) {
                        srsPage = pagesList[currentIndex + 1]
                    }
                }
            }

            if (!srsPage) {
                showToast('لا توجد صفحات متاحة حالياً', 'error')
                onBack()
                return
            }

            // Build composite page if this page number has sibling chunks
            if (!srsPage.chunks) {
                const siblingChunks = StorageService.getPageChunks(srsPage.pageNumber)
                if (siblingChunks.length > 1) {
                    const enrichedChunks = siblingChunks
                        .sort((a, b) => a.surahId - b.surahId)
                        .map(c => ({ ...c, isMemorized: StorageService.isPageMemorized(c.id) }))
                    srsPage = {
                        ...srsPage,
                        chunks: enrichedChunks,
                        isComposite: true,
                        surahName: enrichedChunks.map(c => c.surahName).filter((v, i, a) => a.indexOf(v) === i).join(' / '),
                        ayahs: enrichedChunks.flatMap(c => c.ayahs),
                        firstAyahId: enrichedChunks[0].firstAyahId,
                        lastAyahId: enrichedChunks[enrichedChunks.length - 1].lastAyahId
                    }
                }
            }

            // Animation Logic for Transition
            if (page) {
                // If it's the SAME page, don't animate? 
                if (srsPage.id === page.id) {
                    // Just reload data? 
                    updatePageState(srsPage)
                    return
                }

                // Strict Review Mode: No fancy transitions for now, just load
                updatePageState(srsPage)
            } else {
                updatePageState(srsPage)
            }

        } catch (error) {
            console.error(error)
            showToast('حدث خطأ أثناء تحميل الصفحة', 'error')
            onBack()
        }
    }

    const updatePageState = (srsPage) => {
        // Double check: don't reload if it's the same page/pair AND we're already playing
        if (page && status === 'playing') {
            if (mode === 'twopage') {
                const oldPair = pagePairs.find(p => p.right?.id === page.id || p.left?.id === page.id)
                const newPair = pagePairs.find(p => p.right?.id === srsPage.id || p.left?.id === srsPage.id)
                if (oldPair && newPair && oldPair.id === newPair.id) {
                    setPage(srsPage)
                    return
                }
            } else if (srsPage.id === page.id) {
                return
            }
        }

        setPage(srsPage)
        setPageLoadTime(Date.now())
        prepareWords(srsPage)
        setShowPageSelector(false)

        setTimer(0)
        setRevealedCount(0)
        setStatus('playing')
        setStartTime(Date.now())
        setIsPaused(true)  // Always start paused on new page

        // Load annotations
        loadAnnotations(srsPage.id)

        // Sync Carousel Page ONLY if it's not already on the correct page
        const pages = getPagesSafe()
        const idx = pages.findIndex(p => String(p.id) === String(srsPage.id))
        if (idx !== -1) {
            const targetCarouselIndex = mode === 'twopage' ? Math.floor(idx / 2) : idx
            if (engineRef.current?.currentIndex !== targetCarouselIndex) {
                engineRef.current?.jumpTo(targetCarouselIndex)
            }
        }

        // Hide the initial loading overlay after a short delay to allow the engine to mount and sync visually
        if (!initialLoadComplete) {
            setTimeout(() => setInitialLoadComplete(true), 500)
        }
    }

    const loadAnnotations = async (pageId) => {
        try {
            const pageAnnos = await annotationService.getAnnotationsForPage(pageId)
            if (pageAnnos) {
                setAnnotations(pageAnnos)
            } else {
                setAnnotations({})
            }
        } catch (err) {
            console.error('Failed to load annotations:', err)
        }
    }

    // Review Engine Ref
    const engineRef = useRef(null)
    const justSelectedRef = useRef(false)

    // Load available pages for selector (composite pages)
    useEffect(() => {
        const pages = StorageService.getCompositeMemorizedPages()
        setAllPages(pages)
    }, [])

    const getPagesSafe = () => {
        if (allPages.length > 0) return allPages
        const pages = StorageService.getCompositeMemorizedPages()
        setAllPages(pages)
        return pages
    }

    // Keyboard Navigation
    useEffect(() => {
        const handleKey = (e) => {
            if (mode !== 'flip' && mode !== 'twopage') return
            if (e.key === 'ArrowRight') engineRef.current?.goToPrev()
            if (e.key === 'ArrowLeft') engineRef.current?.goToNext()
        }
        window.addEventListener('keydown', handleKey)
        return () => window.removeEventListener('keydown', handleKey)
    }, [mode])

    const handleJumpToPage = (pageId) => {
        loadSmartPage(pageId)
    }

    const handleJumpToPageNumber = (pageNumber) => {
        const pages = getPagesSafe()
        const targetPage = pages.find(p => p.pageNumber === pageNumber)
        if (targetPage) {
            handleNavigationAttempt(() => loadSmartPage(targetPage.id))
        } else {
            showToast(`الصفحة ${pageNumber} غير محفوظة في سجل الحفظ الخاص بك.`, 'warning')
        }
    }

    // Quranic waqf/stop marks that should NOT be separate masked words
    // They should merge with the preceding word as one unit
    const isQuranSymbol = (word) => {
        if (!word) return false
        const trimmed = word.trim()
        // Single-char Arabic stop marks and decorative symbols
        const singleCharSymbols = ['ج', 'ط', 'م', 'ص', 'ق', 'س', 'ز', 'ع', '۞', '۩', '\uFFFD']
        // Multi-char marks
        const multiCharSymbols = ['صلى', 'قلى', 'صل', 'لا', 'لَا', 'قف']
        if (singleCharSymbols.includes(trimmed) || multiCharSymbols.includes(trimmed)) return true
        // Unicode combining marks (U+06D6 - U+06DC)
        if (trimmed.length === 1) {
            const code = trimmed.charCodeAt(0)
            if (code >= 0x06D6 && code <= 0x06DC) return true
        }
        return false
    }

    const generateWordsForPage = (pageData) => {
        const allWords = []
        // For composite pages, only generate words for memorized chunks
        const chunksToProcess = pageData.chunks
            ? pageData.chunks.filter(c => c.isMemorized)
            : [pageData]

        chunksToProcess.forEach(chunk => {
            const sortedAyahs = [...chunk.ayahs].sort((a, b) => a.number - b.number)
            const surahId = chunk.surahId || pageData.surahId || pageData.surah?.id

            sortedAyahs.forEach((ayah, ayahIdx) => {
                const rawWords = ayah.text.split(/\s+/).filter(w => w.trim() !== '')

                // Merge Quranic symbols with preceding word or first actual word
                const mergedWords = []
                let pendingPrependSymbol = ''
                for (let i = 0; i < rawWords.length; i++) {
                    const token = rawWords[i]
                    if (isQuranSymbol(token)) {
                        if (mergedWords.length > 0) {
                            mergedWords[mergedWords.length - 1] += ' ' + token
                        } else {
                            pendingPrependSymbol = (pendingPrependSymbol ? pendingPrependSymbol + ' ' : '') + token
                        }
                    } else {
                        if (pendingPrependSymbol) {
                            mergedWords.push(pendingPrependSymbol + ' ' + token)
                            pendingPrependSymbol = ''
                        } else {
                            mergedWords.push(token)
                        }
                    }
                }
                if (pendingPrependSymbol) {
                    mergedWords.push(pendingPrependSymbol)
                }

                mergedWords.forEach((text, wordIdx) => {
                    const isVisible = allWords.length === 0 && ayahIdx === 0 && wordIdx < 4
                    const wordId = `${surahId}_${ayah.number}_${wordIdx}`
                    const weight = quranWordWeights[wordId] || 1.0

                    allWords.push({
                        id: wordId,
                        text,
                        isVisible,
                        isMasked: !isVisible,
                        ayahNumber: ayah.number,
                        isEndOfAyah: wordIdx === mergedWords.length - 1,
                        weight
                    })
                })
            })
        })
        return allWords
    }

    const prepareWords = (pageData) => {
        if (mode === 'twopage') {
            const currentPair = pagePairs.find(p => p.right?.id === pageData.id || p.left?.id === pageData.id)
            if (currentPair) {
                const rightWords = generateWordsForPage(currentPair.right)
                const leftWords = currentPair.left ? generateWordsForPage(currentPair.left) : []
                setWords([...rightWords, ...leftWords])
                return
            }
        }
        setWords(generateWordsForPage(pageData))
    }

    const handleTextSelection = useCallback(() => {
        const selection = window.getSelection()
        if (!selection || selection.isCollapsed) return

        let range
        try { range = selection.getRangeAt(0) } catch (e) { return }

        const container = containerRef.current
        if (!container || !container.contains(range.commonAncestorContainer)) return

        const allWordSpans = container.querySelectorAll('.visible-word')
        const newSelectedIds = new Set()

        allWordSpans.forEach(wordSpan => {
            if (selection.containsNode(wordSpan, true)) {
                newSelectedIds.add(wordSpan.getAttribute('data-word-id'))
            }
        })

        if (newSelectedIds.size > 0) {
            setSelectedWordIds(newSelectedIds)
            justSelectedRef.current = true

            // Calculate position for menu
            const rect = range.getBoundingClientRect()
            setContextMenu({
                x: rect.left + (rect.width / 2),
                y: rect.bottom + 10
            })

            selection.removeAllRanges()
        }
    }, [])

    const handleWordClick = (index, e) => {
        if (e) e.stopPropagation()

        const currentWord = words[index]
        if (!currentWord) return

        // 1. If masked -> Unmask and STOP (Do not select)
        if (currentWord.isMasked) {
            setWords(prev => {
                const newWords = [...prev]
                newWords[index] = { ...newWords[index], isMasked: false }
                setRevealedCount(curr => curr + 1)
                return newWords
            })
            // Clear any active state to be safe
            if (selectedWordIds.size === 0) {
                // If it was masked and click unmasked it, check if we should show mutashabihah
                const parts = currentWord.id.split('_')
                const wSurah = parseInt(parts[0])
                const wAyahNum = parseInt(parts[1])
                const wWordIdx = parseInt(parts[2])
                const mutashabihahInfo = getMutashabihahPhrase(wSurah, wAyahNum, wWordIdx)
                if (mutashabihahInfo && !mobileAnchor) {
                    setActiveMutashabihah({
                        phraseId: mutashabihahInfo.phraseId,
                        currentAyahKey: `${wSurah}:${wAyahNum}`
                    })
                    return
                }
            }
            if (selectedWordIds.size > 0) setSelectedWordIds(new Set())
            setMobileAnchor(null)
            return
        }

        // Check if word has mutashabihah and selection isn't active
        const parts = currentWord.id.split('_')
        const wSurah = parseInt(parts[0])
        const wAyahNum = parseInt(parts[1])
        const wWordIdx = parseInt(parts[2])
        const mutashabihahInfo = getMutashabihahPhrase(wSurah, wAyahNum, wWordIdx)

        if (mutashabihahInfo && selectedWordIds.size === 0 && !mobileAnchor) {
            setActiveMutashabihah({
                phraseId: mutashabihahInfo.phraseId,
                currentAyahKey: `${wSurah}:${wAyahNum}`
            })
            return
        }

        // 2. If revealed -> Interaction Logic
        const wordId = currentWord.id

        // Find all annotations for this word
        const wordAnns = Object.values(annotations).filter(ann =>
            (ann.wordIds && ann.wordIds.includes(wordId)) || ann.id === wordId
        )

        // If not selected OR word is target for range
        if (!mobileAnchor && !selectedWordIds.has(wordId)) {
            // Start selection
            setMobileAnchor(wordId)
            setSelectedWordIds(new Set([wordId]))

            // Trigger menu
            const rect = e?.target?.getBoundingClientRect() || { left: 0, bottom: 0, width: 0 }
            setContextMenu({ x: rect.left + rect.width / 2, y: rect.bottom + 10 })
            justSelectedRef.current = true
            return
        }

        if (mobileAnchor === wordId) {
            // If already selecting this word, tapping again shows notes (if any) or cancels
            if (wordAnns.length > 0 && selectedWordIds.has(wordId) && selectedWordIds.size === 1) {
                if (isMobile) setMobileViewer(wordAnns)
                else setTooltip({ x: e.clientX, y: e.clientY, wordId, allAnnotations: wordAnns })

                setMobileAnchor(null)
                setSelectedWordIds(new Set())
                return
            }
            setMobileAnchor(null)
            setSelectedWordIds(new Set())
            setTooltip(null)
            return
        }

        // Range Selection
        const anchorIdx = words.findIndex(w => w.id === mobileAnchor)
        const currentIdx = index

        if (anchorIdx === -1) {
            setMobileAnchor(null)
            setSelectedWordIds(new Set())
            setTooltip(null)
            return
        }

        const start = Math.min(anchorIdx, currentIdx)
        const end = Math.max(anchorIdx, currentIdx)

        const rangeIds = new Set()
        for (let i = start; i <= end; i++) {
            if (words[i]) rangeIds.add(words[i].id)
        }
        setSelectedWordIds(rangeIds)
        setMobileAnchor(null)
        justSelectedRef.current = true

        // Context Menu Position (use current element)
        const rect = e?.target?.getBoundingClientRect() || { left: 0, bottom: 0, width: 0 }
        setContextMenu({ x: rect.left + rect.width / 2, y: rect.bottom + 10 })
    }

    const handleWordHover = (wordId, e, wordAnns) => {
        if (isMobile || selectedWordIds.size > 0 || !wordAnns) return
        setTooltip({
            x: e.clientX,
            y: e.clientY,
            wordId,
            allAnnotations: wordAnns
        })
    }

    const handleMouseLeave = () => {
        if (!isMobile) setTooltip(null)
    }

    // Helper to get text for an ID or range
    const getAnnotationText = (ann) => {
        const ids = ann.wordIds || [ann.id]
        if (!ids || ids.length === 0) return ''
        return ids.map(id => {
            const w = words.find(word => word.id === id)
            return w ? w.text : ''
        }).join(' ')
    }

    // Helper for range annotations (Deduplicated)
    const getRangeAnnotations = () => {
        const selectedIds = Array.from(selectedWordIds)
        const rangeAnns = new Set()
        Object.values(annotations).forEach(ann => {
            if (ann.wordIds) {
                if (ann.wordIds.some(id => selectedIds.includes(id))) rangeAnns.add(ann)
            } else if (selectedIds.includes(ann.id)) {
                rangeAnns.add(ann)
            }
        })
        return Array.from(rangeAnns).map(ann => ({ ...ann, wordText: getAnnotationText(ann) }))
    }

    // Determine active annotation for context menu (Strict Match)
    const activeAnnotation = (() => {
        if (selectedWordIds.size === 0) return null
        const ids = Array.from(selectedWordIds).sort()
        const foundAnn = Object.values(annotations).find(ann => {
            if (!ann.wordIds) return ids.length === 1 && ann.id === ids[0]
            const annWordIdsSorted = [...ann.wordIds].sort()
            return annWordIdsSorted.length === ids.length &&
                annWordIdsSorted.every((val, index) => val === ids[index])
        })
        return foundAnn || null
    })()

    const handleMenuAction = async (action) => {
        const selectedIds = Array.from(selectedWordIds)
        if (selectedIds.length === 0) return

        if (action === 'view-reflections') {
            const list = getRangeAnnotations().filter(ann => ann.reflection)
            if (list.length > 0) {
                setMobileViewer(list)
                setContextMenu(null)
            }
            return
        }

        if (action === 'view-notes') {
            const list = getRangeAnnotations().filter(ann => ann.notes)
            if (list.length > 0) {
                setMobileViewer(list)
                setContextMenu(null)
            }
            return
        }

        if (action.startsWith('difficulty-')) {
            const level = action.replace('difficulty-', '')
            const difficultyColor = level === 'high' ? 'red' : 'orange'

            if (activeAnnotation) {
                const updatedAnn = { ...activeAnnotation, difficulty: level, difficultyColor }
                setAnnotations(prev => ({ ...prev, [updatedAnn.id]: updatedAnn }))
                await annotationService.saveAnnotation(updatedAnn)
            } else {
                const newAnnId = `ann_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                const newAnn = {
                    id: newAnnId,
                    pageId: page.id,
                    surah: page.surahId || page.surahNumber,
                    wordIds: selectedIds,
                    difficulty: level,
                    difficultyColor,
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                }
                setAnnotations(prev => ({ ...prev, [newAnn.id]: newAnn }))
                await annotationService.saveAnnotation(newAnn)
            }
            setSelectedWordIds(new Set())
            setContextMenu(null)
        } else if (action === 'clear') {
            const annotationsToDelete = new Set()
            selectedIds.forEach(wordId => {
                Object.values(annotations).forEach(ann => {
                    if ((ann.wordIds && ann.wordIds.includes(wordId)) || ann.id === wordId) {
                        annotationsToDelete.add(ann)
                    }
                })
            })

            const updates = { ...annotations }
            for (const ann of annotationsToDelete) {
                try {
                    await annotationService.deleteAnnotation(ann.id)
                    delete updates[ann.id]
                } catch (e) {
                    console.error('Delete failed', e)
                }
            }
            setAnnotations(updates)
            setSelectedWordIds(new Set())
            setContextMenu(null)
        } else if (action === 'reflection' || action === 'notes') {
            let targetId = null
            if (activeAnnotation) {
                targetId = activeAnnotation.id
            } else if (selectedIds.length === 1) {
                const existingSingleAnn = Object.values(annotations).find(ann => ann.id === selectedIds[0] && !ann.wordIds)
                if (existingSingleAnn) targetId = existingSingleAnn.id
            }
            setInputModal({ show: true, type: action, initialValue: '', targetId })
            setContextMenu(null)
        }
    }

    const handleInputSave = async (text) => {
        const { type, targetId } = inputModal
        const selectedIds = Array.from(selectedWordIds)

        let targetAnn = null
        if (targetId) targetAnn = annotations[targetId]

        const annId = targetId || `ann_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        const newAnn = {
            ...(targetAnn || {}),
            id: annId,
            pageId: page.id,
            surah: page.surahId || page.surahNumber,
            wordIds: targetAnn ? targetAnn.wordIds : selectedIds,
            [type]: (targetAnn && targetAnn[type]) ? targetAnn[type] + '\n\n' + text : text,
            updatedAt: Date.now()
        }
        if (!targetAnn) newAnn.createdAt = Date.now()

        setAnnotations(prev => ({ ...prev, [annId]: newAnn }))
        setSelectedWordIds(new Set())
        setInputModal({ show: false, type: null, initialValue: '' })
        await annotationService.saveAnnotation(newAnn)
    }



    const handleAyahReveal = (ayahNumber) => {
        if (status !== 'playing') return
        setWords(prev => {
            const newWords = [...prev]
            let count = 0
            newWords.forEach(w => {
                if (w.ayahNumber === ayahNumber && w.isMasked) {
                    w.isMasked = false
                    count++
                }
            })
            if (count > 0) setRevealedCount(curr => curr + count)
            return newWords
        })
    }

    const handleFinish = () => {
        setStatus('rating')
    }

    const handleNavigationAttempt = (action) => {
        // If 90 seconds have passed, force rating
        if (selectedRating === null && status !== 'rating' && (Date.now() - pageLoadTime) > 90 * 1000) {
            setPendingNavigation(() => action)
            setShowForcedRating(true)
            return false // block
        }
        
        if (typeof action === 'function') {
            action()
        }
        return true // allow
    }

    const resolveForcedRating = (rating) => {
        if (rating !== 'skip') {
            handleRating(rating)
        }
        setShowForcedRating(false)
        
        // Execute pending action
        if (typeof pendingNavigation === 'function') {
            pendingNavigation()
        } else if (pendingNavigation === 'next') {
            engineRef.current?.goToNext()
        } else if (pendingNavigation === 'prev') {
            engineRef.current?.goToPrev()
        } else if (typeof pendingNavigation === 'string' && pendingNavigation.startsWith('jump_')) {
            const pageId = pendingNavigation.replace('jump_', '')
            const pages = getPagesSafe()
            const idx = pages.findIndex(p => p.id === pageId)
            if (idx !== -1) engineRef.current?.jumpTo(idx)
        }
        
        setPendingNavigation(null)
    }

    const hasMemorizedContent = (pageObj) => {
        if (!pageObj) return false
        if (pageObj.chunks) {
            return pageObj.chunks.some(c => c.isMemorized)
        }
        return StorageService.isPageMemorized(pageObj.id)
    }

    const handleRating = (rating) => {
        setSelectedRating(rating)
        if (page) {
            let msg = ''
            if (rating >= 4) msg = 'ممتاز! استمر هكذا'
            else if (rating === 3) msg = 'جيد، تحتاج للمزيد من التركيز'
            else msg = 'لا بأس، ستتحسن مع التكرار'

            showToast(msg, rating >= 3 ? 'success' : 'warning')

            const pagesToRate = [page]
            if (mode === 'twopage') {
                const currentPair = pagePairs.find(p => p.right?.id === page.id || p.left?.id === page.id)
                if (currentPair) {
                    const sibling = currentPair.right?.id === page.id ? currentPair.left : currentPair.right
                    if (sibling && hasMemorizedContent(sibling)) {
                        pagesToRate.push(sibling)
                    }
                }
            }

            setTimeout(() => {
                pagesToRate.forEach(p => {
                    const chunksToRate = p.chunks
                        ? p.chunks.filter(c => c.isMemorized)
                        : [p]
                    chunksToRate.forEach(chunk => {
                        SRSService.saveSRS(chunk.id, rating).catch(e => console.error('SRS Save failed', e))
                    })
                })
            }, 0)
        }
    }

    const handleNextPage = () => {
        loadSmartPage()
    }

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60)
        const s = seconds % 60
        return `${m}:${s < 10 ? '0' : ''}${s}`
    }

    const handleEmptyClick = (e) => {
        if (justSelectedRef.current) {
            justSelectedRef.current = false
            return
        }
        if (!e.target.closest('.visible-word') && !e.target.closest('.masked-word')) {
            setSelectedWordIds(new Set());
            setContextMenu(null);
            setMobileAnchor(null);
            setTooltip(null);
        }
    }




    const getRatingButtonClass = (rating, baseClass) => {
        if (selectedRating === rating) return `${baseClass} btn-selected-glow`
        if (selectedRating !== null) return `${baseClass} opacity-50` // Dim others
        return baseClass
    }

    const getTransition = () => {
        if (skipTransition.current) return 'none'
        return 'transform 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
    }

    const renderMaskedCard = (pageData, isInteractive) => {
        // Determine chunks for composite pages
        const chunks = pageData.chunks || [{ ...pageData, isMemorized: true }]
        const hasMultipleChunks = chunks.length > 1
        const isTwoPage = mode === 'twopage'

        const currentPair = isTwoPage && page ? pagePairs.find(p => p.right?.id === page.id || p.left?.id === page.id) : null
        const isPartOfActivePair = currentPair && (pageData.id === currentPair.right?.id || pageData.id === currentPair.left?.id)

        // If interactive (current page), use state words for memorized chunks.
        // If preview (next/prev), generate fresh words.
        const displayWords = isInteractive && (isTwoPage ? isPartOfActivePair : String(pageData.id) === String(page?.id)) ? words : generateWordsForPage(pageData)

        const pageTheme = isTwoPage ? (THEMES_DATA.find(t =>
            t.verses.some(v => v.surah === pageData.surahId && v.ayah === pageData.firstAyahId)
        )?.title || pageData.topic) : null

        return (
            <div className={isTwoPage ? "two-page-card text-center" : "card bg-dark border-secondary shadow-lg mb-4 smart-review-card-width text-center"}>
                {/* Header for Book spread mode or preview card mode */}
                {isTwoPage ? (
                    <div className="card-header bg-transparent border-gold d-flex justify-content-between align-items-center py-2">
                        <span className="text-gold fw-bold" style={{ fontSize: '0.85rem' }}>
                            <i className="bi bi-journal-text me-1"></i>
                            {pageData.isComposite ? pageData.surahName : `سورة ${pageData.surahName}`}
                        </span>
                        <div className="d-flex align-items-center gap-2">
                            {pageTheme && <span className="badge bg-info bg-opacity-25 text-info x-small" style={{ fontSize: '0.65rem' }}>{pageTheme}</span>}
                            <span className="badge bg-warning bg-opacity-25 text-warning" style={{ fontSize: '0.65rem' }}>
                                صفحة {toArabicIndic(pageData.pageNumber)}
                            </span>
                        </div>
                    </div>
                ) : !isInteractive ? (
                    <div className="card-header bg-transparent border-0 text-muted small p-1">
                        {toArabicIndic(pageData.pageNumber)}
                    </div>
                ) : null}

                {/* Wrap layout content in a scrollable card-body for twopage mode */}
                <div className={isTwoPage ? "card-body p-2 p-md-3 flex-grow-1 overflow-auto custom-scrollbar" : ""}>
                    {chunks.map((chunk, chunkIdx) => {
                        const isSurahStart = chunk.ayahs && chunk.ayahs.some(a => a.number === 1)
                        const showBismillah = isSurahStart && chunk.surahId !== 9 && chunk.surahId !== 1
                        const showDivider = isSurahStart || (chunkIdx > 0 && hasMultipleChunks)

                        if (chunk.isMemorized) {
                            // Memorized chunk — render masked words
                            return (
                                <div key={chunk.id}>
                                    {showDivider && (
                                        <SurahDivider surahName={chunk.surahName} className="mx-3" />
                                    )}
                                    <div
                                        className={isTwoPage ? "p-2 text-center" : "card-body p-4 text-center"}
                                        style={{ direction: 'rtl' }}
                                        onMouseUp={isInteractive ? handleTextSelection : null}
                                        onKeyUp={isInteractive ? handleTextSelection : null}
                                    >
                                        {showBismillah && <Bismillah />}
                                        {(() => {
                                            return (
                                                <div className="quran-text" style={{ fontSize: mode === 'twopage' ? undefined : '1.4rem', lineHeight: '2.5', fontFamily: selectedFont }}>
                                                    {displayWords.map((word, idx) => {
                                                        const parts = word.id.split('_')
                                                        const wSurahId = parseInt(parts[0])
                                                        const belongsToChunk = wSurahId === chunk.surahId && chunk.ayahs.some(a => a.number === word.ayahNumber)
                                                        if (!belongsToChunk) return null

                                                        const isSelected = selectedWordIds.has(word.id)
                                                        const wordAnns = isInteractive ? Object.values(annotations).filter(ann =>
                                                            (ann.wordIds && ann.wordIds.includes(word.id)) || ann.id === word.id
                                                        ) : []

                                                        const isAnchor = isInteractive && mobileAnchor === word.id

                                                let classes = ''
                                                if (!word.isVisible) classes += ' text-warning'
                                                if (isSelected) classes += ' word-selected'
                                                if (isAnchor) classes += ' word-anchor'

                                                const hasDifficultyHigh = wordAnns.some(a => a.difficulty === 'high')
                                                const hasDifficultyMedium = wordAnns.some(a => a.difficulty === 'medium')
                                                const hasReflection = wordAnns.some(a => a.reflection)
                                                const hasNote = wordAnns.some(a => a.notes)

                                                // Mutashabihah check
                                                const wordParts = word.id.split('_')
                                                const wSurah = parseInt(wordParts[0])
                                                const wAyahNum = parseInt(wordParts[1])
                                                const wWordIdx = parseInt(wordParts[2])
                                                const mutashabihahInfo = getMutashabihahPhrase(wSurah, wAyahNum, wWordIdx)
                                                const hasMutashabihah = !word.isMasked && !!mutashabihahInfo

                                                return (
                                                    <span key={idx} style={{ position: 'relative' }} className="masked-word-item" data-word-index={idx}>
                                                        {word.isMasked ? (
                                                            <span
                                                                key={word.id}
                                                                className={`masked-word ${useDynamicWidth ? '' : 'fixed-width'}`}
                                                                onClick={(e) => isInteractive ? handleWordClick(idx, e) : null}
                                                            >
                                                                {useDynamicWidth ? word.text : ''}
                                                            </span>
                                                        ) : (
                                                            <span
                                                                key={word.id}
                                                                className={`visible-word ${isSelected ? 'word-selected' : ''} ${isAnchor ? 'word-anchor' : ''} ${hasDifficultyHigh ? 'word-difficulty-high' : ''} ${hasDifficultyMedium ? 'word-difficulty-medium' : ''} ${hasReflection ? 'word-has-reflection' : ''} ${hasNote ? 'word-has-note' : ''} ${hasMutashabihah ? 'word-has-mutashabihah' : ''}`}
                                                                data-word-id={word.id}
                                                                data-word-index={idx}
                                                                onClick={(e) => isInteractive ? handleWordClick(idx, e) : null}
                                                                onMouseEnter={(e) => {
                                                                    if (wordAnns.length > 0) handleWordHover(word.id, e, wordAnns)
                                                                }}
                                                                onMouseLeave={handleMouseLeave}
                                                            >
                                                                {word.text}
                                                            </span>
                                                        )}

                                                        {word.isEndOfAyah && (
                                                            <AyahSeparator
                                                                key={`ayah-${word.ayahNumber}`}
                                                                number={word.ayahNumber}
                                                                className="mx-2"
                                                                style={{ cursor: isInteractive ? 'pointer' : 'default' }}
                                                                onClick={() => isInteractive ? handleAyahReveal(word.ayahNumber) : null}
                                                            />
                                                        )}
                                                    </span>
                                                )
                                            })}
                                                </div>
                                            )
                                        })()}
                                    </div>
                                </div>
                            )
                        } else {
                            // Unmemorized chunk — render with blur
                            return (
                                <div key={chunk.id}>
                                    {showDivider && (
                                        <SurahDivider surahName={chunk.surahName} className="mx-3" />
                                    )}
                                    {showBismillah && <Bismillah className="mx-3 mt-2" />}
                                    <BlurredChunk ayahs={chunk.ayahs} className="mx-3 mb-3" />
                                </div>
                            )
                        }
                    })}
                </div>

                {isTwoPage && (
                    <div className="card-footer bg-transparent border-gold text-center py-1">
                        <small className="text-muted" style={{ fontSize: '0.7rem' }}>
                            صفحة {toArabicIndic(pageData.pageNumber)}
                        </small>
                    </div>
                )}

                {/* Rating Section - Only for Interactive Page, if not in twopage mode */}
                {
                    isInteractive && !isTwoPage && (
                        <RatingButtons
                            pageId={page.id}
                            currentRating={selectedRating}
                            onRate={(id, r) => handleRating(r)}
                        />
                    )
                }
            </div>
        )
    }

    // Calculate directional helper for bookmark
    let bookmarkDirection = null
    if (globalBookmark && allPages.length > 0 && page) {
        const bookmarkIndex = allPages.findIndex(p => p.id === globalBookmark)
        const currentIndex = allPages.findIndex(p => p.id === page.id)
        if (bookmarkIndex !== -1 && currentIndex !== -1 && bookmarkIndex !== currentIndex) {
            if (mode === 'twopage') {
                const currentPairIndex = Math.floor(currentIndex / 2)
                const bookmarkPairIndex = Math.floor(bookmarkIndex / 2)
                if (bookmarkPairIndex !== currentPairIndex) {
                    bookmarkDirection = bookmarkPairIndex > currentPairIndex ? 'left' : 'right'
                }
            } else {
                // MaskedReview uses horizontal by default. RTL: right=prev, left=next
                bookmarkDirection = bookmarkIndex > currentIndex ? 'left' : 'right'
            }
        }
    }

    const isAtStart = page && allPages.length > 0 && (
        mode === 'twopage'
            ? pagePairs.findIndex(p => p.right?.id === page.id || p.left?.id === page.id) === 0
            : allPages.findIndex(p => p.id === page.id) === 0
    )

    const isAtEnd = page && allPages.length > 0 && (
        mode === 'twopage'
            ? pagePairs.findIndex(p => p.right?.id === page.id || p.left?.id === page.id) === pagePairs.length - 1
            : allPages.findIndex(p => p.id === page.id) === allPages.length - 1
    )

    const showRotateOverlay = mode === 'twopage' && isMobile && isPortrait

    return (
        <>
            {showRotateOverlay && (
                <div className="rotate-overlay fade-in">
                    <i className="bi bi-phone-landscape rotate-overlay-icon"></i>
                    <h4 className="text-gold mb-2">يرجى تدوير الجهاز</h4>
                    <p className="text-muted small">هذا الوضع يتطلب عرضاً أفقياً لعرض الصفحتين بجانب بعضهما البعض.</p>
                </div>
            )}

            <div className={`masked-review-container container-fluid p-0 d-flex flex-column h-100 ${showRotateOverlay ? 'd-none' : ''}`}>
                {/* Header */}
            {/* Initial Loading Overlay to hide jumping */}
            {!initialLoadComplete && (
                <div className="position-absolute top-0 start-0 w-100 h-100 bg-dark z-3 d-flex flex-column justify-content-center align-items-center" style={{ zIndex: 1050 }}>
                    <div className="spinner-border text-gold mb-3" role="status" style={{ width: '3rem', height: '3rem' }}></div>
                    <h5 className="text-gold fade-in">جاري تجهيز الصفحة...</h5>
                </div>
            )}

            {/* Forced Rating Overlay */}
            {showForcedRating && (
                <div className="position-absolute top-0 start-0 w-100 h-100 bg-dark bg-opacity-75 z-3 d-flex flex-column justify-content-center align-items-center fade-in" style={{ zIndex: 1060, backdropFilter: 'blur(5px)' }}>
                    <div className="card bg-dark border-warning shadow-lg text-center p-4" style={{ maxWidth: '90%', width: '400px' }}>
                        <h4 className="text-warning mb-3">لقد قرأت الصفحة!</h4>
                        <p className="text-light mb-4">لقد أمضيت وقتاً كافياً، نرجو تقييم مستوى حفظك قبل الانتقال لمساعدتنا في جدولة المراجعة.</p>
                        <RatingButtons
                            pageId={page?.id}
                            currentRating={null}
                            onRate={(id, r) => resolveForcedRating(r)}
                        />
                        <button className="btn btn-outline-secondary mt-4 w-100" onClick={() => resolveForcedRating('skip')}>
                            لا أريد أن أقيم الآن
                        </button>
                    </div>
                </div>
            )}

            {/* Desktop Header (MD+) */}
            <div className="d-none d-md-flex justify-content-between align-items-center p-3 bg-dark sticky-top" style={{ zIndex: 100, direction: 'rtl' }}>
                <div className="d-flex align-items-center gap-3">
                    <BackButton onClick={() => handleNavigationAttempt(onBack)} />
                </div>

                <div className="text-center d-flex flex-column align-items-center position-absolute start-50 translate-middle-x">
                    <div className="d-flex align-items-center justify-content-center gap-2">
                        {bookmarkDirection === 'right' && (
                            <i className="bi bi-arrow-right text-gold blink-animation" style={{ fontSize: '1.2rem' }} title="العلامة المرجعية في هذا الاتجاه"></i>
                        )}
                        <button
                            className="btn btn-sm btn-outline-warning border-0 d-flex align-items-center gap-2 mb-1"
                            onClick={() => setShowPageSelector(prev => !prev)}
                            title="غير الصفحة"
                        >
                            <h5 className="text-gold mb-0">
                                {mode === 'twopage'
                                    ? (() => {
                                        const currentPair = pagePairs.find(p => p.right?.id === page?.id || p.left?.id === page?.id)
                                        if (!currentPair) return 'صفحات المراجعة'
                                        const rightNum = toArabicIndic(currentPair.right?.pageNumber)
                                        const leftNum = currentPair.left ? toArabicIndic(currentPair.left.pageNumber) : null
                                        return leftNum ? `صفحة ${rightNum} - ${leftNum}` : `صفحة ${rightNum}`
                                    })()
                                    : `${page?.surahName} - صفحة ${toArabicIndic(page?.pageNumber)}`
                                }
                            </h5>
                            <i className="bi bi-chevron-down small text-gold"></i>
                        </button>
                        {bookmarkDirection === 'left' && (
                            <i className="bi bi-arrow-left text-gold blink-animation" style={{ fontSize: '1.2rem' }} title="العلامة المرجعية في هذا الاتجاه"></i>
                        )}
                    </div>
                    <small className="text-muted">المراجعة الذكية</small>
                </div>

                <div className="d-flex align-items-center gap-2">
                    <button
                        className="btn btn-sm p-1 d-flex align-items-center justify-content-center"
                        style={{ color: globalBookmark === page?.id ? 'var(--accent-gold)' : '#6c757d' }}
                        onClick={toggleGlobalBookmark}
                        title={globalBookmark === page?.id ? "حذف العلامة المرجعية" : "حفظ كعلامة مرجعية"}
                    >
                        <i className={`bi ${globalBookmark === page?.id ? 'bi-bookmark-star-fill' : 'bi-bookmark-star'} fs-4`}></i>
                    </button>

                    <button
                        className="btn btn-sm p-1 d-flex align-items-center justify-content-center"
                        style={{ color: 'var(--accent-gold)' }}
                        onClick={(e) => { e.stopPropagation(); handleNavigationAttempt(loadSmartPage) }}
                        title="مراجعة ذكية (صفحة تالية)"
                    >
                        <i className="bi bi-dice-5-fill fs-4"></i>
                    </button>

                    <button
                        className="btn btn-sm p-1 d-flex align-items-center justify-content-center me-2"
                        style={{ color: '#6c757d' }}
                        onClick={() => setShowSettings(!showSettings)}
                        title="إعدادات العرض"
                    >
                        <i className="bi bi-gear fs-5"></i>
                    </button>

                    <div className="timer badge bg-dark text-warning fs-5 border border-warning">
                        <i className="bi bi-stopwatch me-2"></i>
                        {formatTime(timer)}
                    </div>
                </div>
            </div>

            {/* Mobile Header (<MD) */}
            <div className="d-flex d-md-none justify-content-between p-3 bg-dark sticky-top" style={{ zIndex: 100, direction: 'rtl' }}>
                {/* Right Side: Back Button & Title */}
                <div className="d-flex align-items-center gap-3">
                    <BackButton onClick={() => handleNavigationAttempt(onBack)} />

                    <div className="d-flex align-items-center gap-1">
                        {bookmarkDirection === 'right' && (
                            <i className="bi bi-arrow-right text-gold blink-animation mb-1" style={{ fontSize: '1rem' }}></i>
                        )}
                        <button
                            className="btn btn-sm btn-outline-warning border-0 d-flex align-items-center gap-2 mb-0 p-0"
                            onClick={() => setShowPageSelector(prev => !prev)}
                            title="غير الصفحة"
                        >
                            <h5 className="text-gold mb-0" style={{ fontSize: '1.1rem' }}>
                                {mode === 'twopage'
                                    ? (() => {
                                        const currentPair = pagePairs.find(p => p.right?.id === page?.id || p.left?.id === page?.id)
                                        if (!currentPair) return 'صفحات المراجعة'
                                        const rightNum = toArabicIndic(currentPair.right?.pageNumber)
                                        const leftNum = currentPair.left ? toArabicIndic(currentPair.left.pageNumber) : null
                                        return leftNum ? `صفحة ${rightNum} - ${leftNum}` : `صفحة ${rightNum}`
                                    })()
                                    : `${page?.surahName} - صفحة ${toArabicIndic(page?.pageNumber)}`
                                }
                            </h5>
                            <i className="bi bi-chevron-down small text-gold"></i>
                        </button>
                        {bookmarkDirection === 'left' && (
                            <i className="bi bi-arrow-left text-gold blink-animation mb-1" style={{ fontSize: '1rem' }}></i>
                        )}
                    </div>
                </div>

                {/* Left Side: Timer & Dice (Vertical Stack) */}
                <div className="d-flex flex-column align-items-end gap-1">
                    <div className="d-flex align-items-center gap-2 mb-1">
                        <button
                            className="btn btn-sm p-0 d-flex align-items-center justify-content-center"
                            style={{ color: globalBookmark === page?.id ? 'var(--accent-gold)' : '#6c757d' }}
                            onClick={toggleGlobalBookmark}
                            title={globalBookmark === page?.id ? "حذف العلامة المرجعية" : "حفظ كعلامة مرجعية"}
                        >
                            <i className={`bi ${globalBookmark === page?.id ? 'bi-bookmark-star-fill' : 'bi-bookmark-star'} fs-5`}></i>
                        </button>

                        {/* Settings Gear */}
                        <button className="btn btn-sm p-0 text-secondary"
                            onClick={() => setShowSettings(!showSettings)} title="إعدادات العرض">
                            <i className="bi bi-gear fs-5"></i>
                        </button>

                        <div className="timer badge bg-transparent text-warning border border-warning d-flex align-items-center justify-content-center"
                            style={{ fontSize: '0.85rem', padding: '4px 8px', width: 'fit-content' }}>
                            <i className="bi bi-stopwatch me-1" style={{ fontSize: '0.8rem' }}></i>
                            {formatTime(timer)}
                        </div>
                    </div>

                    <button
                        className="btn btn-sm p-0 d-flex align-items-center justify-content-center text-gold"
                        onClick={(e) => { e.stopPropagation(); handleNavigationAttempt(loadSmartPage) }}
                        title="مراجعة ذكية (صفحة تالية)"
                    >
                        <i className="bi bi-dice-5-fill fs-4"></i>
                    </button>
                </div>
            </div>
            {/* End Header */}

            {/* Page Selector Modal */}
            {
                showPageSelector && (
                    <div className="card bg-dark border-warning mb-3 fade-in position-absolute start-0 end-0 mx-auto z-3 shadow-lg"
                        style={{ maxWidth: '90%', top: '70px', maxHeight: '60vh', overflow: 'hidden' }}>
                        <div className="card-header bg-warning text-dark d-flex justify-content-between align-items-center py-2">
                            <span className="fw-bold small"><i className="bi bi-cursor-fill me-1"></i> اختر صفحة للمراجعة</span>
                            <button className="btn btn-sm btn-close" onClick={() => setShowPageSelector(false)}></button>
                        </div>
                        <div className="card-body p-2 overflow-auto custom-scrollbar" style={{ maxHeight: '50vh' }}>
                            <div className="row g-2">
                                {allPages.map((p) => (
                                    <div key={p.id} className="col-3 col-sm-2">
                                        <button
                                            className={`btn btn-sm w-100 position-relative ${page?.id === p.id ? 'btn-warning' : 'btn-outline-secondary'}`}
                                            onClick={() => {
                                                setShowPageSelector(false);
                                                handleNavigationAttempt(() => handleJumpToPage(p.id))
                                            }}
                                        >
                                            {toArabicIndic(p.pageNumber)}
                                            {globalBookmark === p.id && (
                                                <i className="bi bi-star-fill text-gold position-absolute top-0 start-0 translate-middle p-1 bg-dark rounded-circle" style={{ fontSize: '0.6rem' }}></i>
                                            )}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Smart Review Settings Panel */}
            {showSettings && (
                <div className="card bg-dark border-secondary mb-3 fade-in mx-3 mt-2" style={{ zIndex: 101 }}>
                    <div className="card-body p-3">
                        <h6 className="text-gold mb-2"><i className="bi bi-display me-1"></i> إعدادات المراجعة الذكية</h6>
                        <div className="row g-3">
                            <div className="col-12 col-md-6">
                                <label className="form-label text-muted small mb-1">نمط المراجعة</label>
                                <div className="d-flex gap-2 flex-wrap">
                                    <button className={`btn btn-sm flex-grow-1 ${mode === 'flip' ? 'btn-warning' : 'btn-outline-secondary'}`}
                                        onClick={() => changeMode('flip')}>
                                        <i className="bi bi-book me-1"></i> تقليب
                                    </button>
                                    <button className={`btn btn-sm flex-grow-1 ${mode === 'scroll' ? 'btn-warning' : 'btn-outline-secondary'}`}
                                        onClick={() => changeMode('scroll')}>
                                        <i className="bi bi-arrow-down me-1"></i> تمرير
                                    </button>
                                    <button className={`btn btn-sm flex-grow-1 ${mode === 'twopage' ? 'btn-warning' : 'btn-outline-secondary'}`}
                                        onClick={() => changeMode('twopage')}>
                                        <i className="bi bi-book me-1"></i> صفحتين بجانب بعض
                                    </button>
                                </div>
                            </div>
                            
                            <div className="col-12 col-md-6">
                                <label className="form-label text-muted small mb-1">نوع الخط</label>
                                <select 
                                    className="form-select form-select-sm bg-dark text-white border-secondary"
                                    value={selectedFont}
                                    onChange={handleFontChange}
                                >
                                    {quranFonts.map(font => (
                                        <option key={font.id} value={font.id} style={{ fontFamily: font.id }}>
                                            {font.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="col-12 mt-2">
                                <div className="form-check form-switch d-flex align-items-center gap-2">
                                    <input
                                        className="form-check-input cursor-pointer"
                                        type="checkbox"
                                        role="switch"
                                        id="dynamicWidthToggle"
                                        checked={useDynamicWidth}
                                        onChange={(e) => {
                                            setUseDynamicWidth(e.target.checked)
                                            localStorage.setItem('smartReviewDynamicWidth', String(e.target.checked))
                                        }}
                                        style={{ cursor: 'pointer', accentColor: '#d4af37' }}
                                    />
                                    <label className="form-check-label text-warning small cursor-pointer fw-bold mb-0" htmlFor="dynamicWidthToggle" style={{ userSelect: 'none' }}>
                                        مطابقة طول الكلمات المخفية مع طول الكلمة الأصلي
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MAIN CONTENT: REVIEW ENGINE */}
            <div className={`flex-grow-1 position-relative ${mode === 'twopage' ? 'twopage-engine-area' : ''}`} style={{ minHeight: 0, height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <ReviewEngine
                    ref={engineRef}
                    pages={mode === 'twopage' ? pagePairs : allPages}
                    initialIndex={mode === 'twopage' ? Math.floor(allPages.findIndex(p => p.id === page?.id) / 2) : allPages.findIndex(p => p.id === page?.id)}
                    viewMode={mode === 'scroll' ? 'vertical' : 'horizontal'}
                    onBeforeIndexChange={(dir) => handleNavigationAttempt(dir)}
                    renderPage={(pOrPair, isActive) => {
                        if (mode === 'twopage') {
                            const pair = pOrPair;
                            return (
                                <div className="book-spread">
                                    {/* Right Page */}
                                    <div className="book-page book-page-right">
                                        {renderMaskedCard(pair.right, isActive)}
                                    </div>

                                    {/* Book Spine */}
                                    <div className="book-spine"></div>

                                    {/* Left Page */}
                                    <div className="book-page book-page-left">
                                        {pair.left ? renderMaskedCard(pair.left, isActive) : (
                                            <div className="two-page-card d-flex align-items-center justify-content-center text-muted" style={{ border: 'none', boxShadow: 'none' }}>
                                                <span>نهاية الحفظ</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        } else {
                            const p = pOrPair;
                            return renderMaskedCard(p, isActive)
                        }
                    }}
                    onIndexChange={(idx) => {
                        // Prevent initial mount from triggering a page load
                        if (!page || status === 'loading') return

                        const targetPage = mode === 'twopage' ? pagePairs[idx]?.right : allPages[idx]
                        // Only trigger loadSmartPage if we actually changed page manually via swipe
                        if (targetPage && targetPage.id !== page.id) {
                            loadSmartPage(targetPage.id)
                        }
                    }}
                />
            </div>


            {/* BOTTOM BARS */}
            {
                status !== 'loading' && page && (
                    <div
                        style={{
                            zIndex: 100,
                            backgroundColor: '#212529',
                            borderTop: '1px solid #444',
                            paddingBottom: 'max(4px, env(safe-area-inset-bottom))',
                            paddingTop: '4px',
                            width: '100%',
                            flexShrink: 0
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                    >
                        <div className="container-fluid px-2 px-md-3">
                            <div className="d-flex flex-row align-items-center justify-content-between gap-3 w-100 flex-wrap flex-md-nowrap" style={{ minHeight: '32px' }}>
                                {/* Rating Section */}
                                {mode === 'twopage' && page ? (
                                    <div className="d-flex align-items-center gap-2" style={{ direction: 'rtl' }}>
                                        <span className="text-muted small fw-bold text-nowrap" style={{ fontSize: '0.65rem' }}>التقييم:</span>
                                        <RatingButtons
                                            pageId={page.id}
                                            currentRating={selectedRating}
                                            onRate={(id, r) => handleRating(r)}
                                            compact={true}
                                            inline={true}
                                            className="py-0 mb-0"
                                        />
                                    </div>
                                ) : (
                                    <div />
                                )}

                                {/* Speed and Playback Section */}
                                <div className="d-flex align-items-center gap-2 my-0" style={{ direction: 'rtl', minHeight: '30px' }}>
                                    {/* Play/Pause Button */}
                                    <button
                                        className={`btn btn-outline-secondary ${isPaused ? 'text-warning border-warning' : ''} d-flex align-items-center justify-content-center p-0`}
                                        onClick={() => setIsPaused(p => !p)}
                                        title={isPaused ? 'استمرار' : 'إيقاف مؤقت'}
                                        style={{ minWidth: '30px', width: '30px', height: '30px', borderRadius: '50%' }}
                                    >
                                        <i className={`bi ${isPaused ? 'bi-play-fill' : 'bi-pause-fill'} fs-6`} style={{ marginLeft: isPaused ? '1px' : '0' }}></i>
                                    </button>

                                    {/* Separator */}
                                    <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.15)' }}></div>

                                    {/* Speed Slider Group */}
                                    <div className="d-flex align-items-center gap-1" style={{ width: '120px' }} title="سرعة الكشف التلقائي">
                                        <i className="bi bi-speedometer2 text-muted" style={{ fontSize: '0.8rem' }}></i>
                                        <input
                                            ref={sliderRef}
                                            type="range"
                                            className="form-range gold-range"
                                            min="0"
                                            max="100"
                                            step="1"
                                            defaultValue={sliderValue}
                                            onMouseUp={() => setSliderValue(Number(sliderRef.current.value))}
                                            onTouchEnd={() => setSliderValue(Number(sliderRef.current.value))}
                                            style={{ height: '6px', padding: '0', cursor: 'pointer', touchAction: 'none' }}
                                        />
                                    </div>

                                    {/* Separator */}
                                    <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.15)' }}></div>

                                    {/* Smart Timing Toggle Switch */}
                                    <div className="form-check form-switch m-0 d-flex align-items-center gap-1" style={{ paddingRight: '0' }}>
                                        <input
                                            className="form-check-input m-0 cursor-pointer"
                                            type="checkbox"
                                            role="switch"
                                            id="smartTimingToggle"
                                            checked={isSmartTiming}
                                            onChange={(e) => setIsSmartTiming(e.target.checked)}
                                            style={{ cursor: 'pointer', accentColor: '#d4af37', width: '22px', height: '11px' }}
                                        />
                                        <label className="form-check-label text-warning x-small cursor-pointer fw-bold mb-0 text-nowrap" htmlFor="smartTimingToggle" style={{ fontSize: '0.65rem', userSelect: 'none' }}>
                                            {isSmartTiming ? 'تجويدي' : 'متساوٍ'}
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Overlays */}

            {contextMenu && (
                <AnnotationContextMenu
                    position={contextMenu}
                    onOptionClick={handleMenuAction}
                    onClose={() => setContextMenu(null)}
                    isMobile={isMobile}
                    annotation={activeAnnotation}
                    rangeAnnotations={getRangeAnnotations()}
                />
            )}

            {tooltip && !isMobile && (
                <AnnotationTooltip
                    allAnnotations={tooltip.allAnnotations}
                    position={tooltip}
                    visible={true}
                />
            )}

            {mobileViewer && (
                <MobileAnnotationViewer
                    annotations={Array.isArray(mobileViewer) ? mobileViewer : null}
                    annotation={!Array.isArray(mobileViewer) ? mobileViewer : null}
                    onClose={() => setMobileViewer(null)}
                />
            )}

            <AnnotationInputModal
                show={inputModal.show}
                type={inputModal.type}
                initialValue={inputModal.initialValue}
                onHide={() => setInputModal({ ...inputModal, show: false })}
                onSave={handleInputSave}
            />

            {activeMutashabihah && (
                 <MutashabihatViewerModal
                     phraseId={activeMutashabihah.phraseId}
                     currentAyahKey={activeMutashabihah.currentAyahKey}
                     onClose={() => setActiveMutashabihah(null)}
                     onJumpToPage={handleJumpToPageNumber}
                 />
            )}

            <TutorialOverlay
                steps={tutorialSteps}
                isOpen={showTutorial}
                onClose={() => {
                    setShowTutorial(false)
                    StorageService.markTutorialAsSeen('masked_review_intro')
                }}
            />

            <style>{`
                .masked-word:hover {
                    background-color: #444 !important;
                    border-color: #666 !important;
                }
                .btn-gold {
                    background: linear-gradient(45deg, #d4af37, #f9d976);
                    color: #000;
                    border: none;
                    font-weight: bold;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .masked-word-item {
                    display: inline-block;
                    user-select: text;
                }
                .visible-word {
                    cursor: text;
                    transition: all 0.2s;
                    border-radius: 4px;
                    padding: 0 2px;
                }
                .word-has-mutashabihah {
                    border-bottom: 2px dashed rgba(212, 175, 55, 0.75) !important;
                    cursor: help !important;
                }
                .word-has-mutashabihah:hover {
                    background-color: rgba(212, 175, 55, 0.15) !important;
                }
                .word-selected {
                    background-color: rgba(212, 175, 55, 0.4) !important;
                    box-shadow: 0 0 0 1px rgba(212, 175, 55, 0.6);
                }
                .visible-word:hover {
                    cursor: pointer;
                    background-color: rgba(212, 175, 55, 0.15);
                }
                .masked-word {
                    display: inline-block;
                    color: transparent !important;
                    background-color: #333;
                    border-radius: 4px;
                    vertical-align: middle;
                    transition: all 0.2s;
                    border: 1px solid #444;
                    cursor: pointer;
                    user-select: none;
                    padding: 0 2px;
                    height: 1.1em !important;
                    line-height: 1.1em !important;
                    overflow: hidden;
                }
                .masked-word.fixed-width {
                    width: 3.2ch !important;
                    padding: 0 !important;
                }
                .masked-word:hover {
                    background-color: #444;
                    border-color: #666;
                }
                @keyframes slideUpBar {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                }
                .controls-inner {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    flex-wrap: nowrap;
                }
                .speed-slider-group {
                    flex-grow: 1;
                    padding: 0 8px;
                    min-width: 120px;
                    /* Reduced height area */
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                }
                .gold-range {
                    height: 4px;
                    border-radius: 2px;
                    accent-color: #d4af37;
                    background: rgba(255,255,255,0.1);
                    appearance: none;
                    width: 100%;
                }
                .gold-range::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    width: 18px; /* Slightly smaller thumb */
                    height: 18px;
                    background: #d4af37;
                    border: 2px solid #fff;
                    border-radius: 50%;
                    cursor: pointer;
                    box-shadow: 0 0 6px rgba(212, 175, 55, 0.5);
                    margin-top: -7px; /* Centering fix */
                }
                .gold-range::-webkit-slider-runnable-track {
                    width: 100%;
                    height: 4px;
                    background: linear-gradient(to right, #444, #d4af37);
                    border-radius: 2px;
                }
                .gold-range:focus { outline: none; box-shadow: none; }

                .controls-divider {
                    width: 1px;
                    height: 32px;
                    background: rgba(255,255,255,0.1);
                    margin: 0 4px;
                }
                
                /* Custom Header Styles */
                /* Mobile-specific adjustments if needed */
                @media (max-width: 768px) {
                    .controls-inner {
                        gap: 2px;
                    }
                }

                @keyframes softBlink {
                    0% { opacity: 0.3; }
                    50% { opacity: 1; text-shadow: 0 0 5px rgba(212, 175, 55, 0.5); }
                    100% { opacity: 0.3; }
                }
                .blink-animation {
                    animation: softBlink 2s infinite ease-in-out;
                }
            `}</style>
            </div>
        </>
    )
}

export default MaskedReview
