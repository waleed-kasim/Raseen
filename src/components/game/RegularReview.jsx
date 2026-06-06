import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { StorageService } from '../../services/storage'
import { SRSService } from '../../services/srs'
import { THEMES_DATA } from '../../data/themes'
import WordRenderer from '../ui/WordRenderer'
import SurahDivider from '../ui/SurahDivider'
import BlurredChunk from '../ui/BlurredChunk'
import Bismillah from '../ui/Bismillah'
import { toArabicIndic } from '../../utils/javascUtil/arabicUtils'
import BackButton from '../ui/BackButton'
import TutorialOverlay from '../ui/TutorialOverlay'
import ReviewEngine from './engine/ReviewEngine'
import RatingButtons from '../ui/RatingButtons'

const RegularReview = ({ onBack, showToast }) => {
    const [pages, setPages] = useState([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [mode, setMode] = useState(null)
    const [showSettings, setShowSettings] = useState(false)
    const [reviewedCount, setReviewedCount] = useState(0)
    const [sessionComplete, setSessionComplete] = useState(false)
    const [scrollRatings, setScrollRatings] = useState({})
    const [showPageSelector, setShowPageSelector] = useState(false)
    const [globalBookmark, setGlobalBookmark] = useState(StorageService.getGlobalBookmark())

    const [isPortrait, setIsPortrait] = useState(window.innerHeight > window.innerWidth)
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

    // Engine Ref
    const engineRef = useRef(null)

    const [selectedFont, setSelectedFont] = useState(localStorage.getItem('regularReviewFont') || 'Amiri Quran')

    // Font Options
    const quranFonts = [
        { id: 'Amiri Quran', name: 'الأميري (قرآن)', family: "'Amiri Quran'" },
        { id: 'Scheherazade New', name: 'شهرزاد (عادي)', family: "'Scheherazade New'" },
        { id: 'Hafs', name: 'خط حفص (محلي)', family: "'Hafs'" }
    ]

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

    useEffect(() => {
        const savedMode = localStorage.getItem('regularReviewMode')
        setMode(savedMode || 'flip')
    }, [])

    useEffect(() => {
        const allPages = StorageService.getCompositeMemorizedPages()
        if (allPages.length === 0) {
            showToast('لا توجد صفحات محفوظة', 'error')
            onBack()
            return
        }
        setPages(allPages)

        // Jump to bookmark if exists
        const bookmark = StorageService.getGlobalBookmark()
        if (bookmark) {
            const index = allPages.findIndex(p => p.id === bookmark)
            if (index !== -1) {
                // Wait for Engine Ref to be ready
                setTimeout(() => {
                    handleJumpToPage(index)
                }, 100)
            }
        }
    }, [])

    const toggleGlobalBookmark = (pageObj) => {
        const targetPage = pageObj || pages[currentIndex]
        if (!targetPage) return

        if (globalBookmark === targetPage.id) {
            StorageService.setGlobalBookmark(null)
            setGlobalBookmark(null)
            showToast('تم إزالة العلامة المرجعية', 'info')
        } else {
            StorageService.setGlobalBookmark(targetPage.id)
            setGlobalBookmark(targetPage.id)
            showToast('تم تعيين الصفحة كعلامة مرجعية', 'success')
        }
    }

    // Page pairs memo for twopage mode
    const pagePairs = useMemo(() => {
        const pairs = []
        for (let i = 0; i < pages.length; i += 2) {
            pairs.push({
                id: `pair_${i}`,
                right: pages[i],
                left: pages[i + 1] || null,
                index: i / 2
            })
        }
        return pairs
    }, [pages])

    // Tutorial Logic
    const [showTutorial, setShowTutorial] = useState(false)
    const [tutorialSteps] = useState([
        {
            title: "المراجعة العادية",
            description: "راجع صفحاتك بهدوء. تصفح المصحف وقيّم حفظك بصدق.",
            icon: "bi-book-half"
        }
    ])

    useEffect(() => {
        const hasSeen = StorageService.hasSeenTutorial('regular_review_intro')
        if (!hasSeen) {
            setShowTutorial(true)
        }
    }, [])

    // Jump to specific page
    const handleJumpToPage = (index) => {
        if (mode === 'twopage') {
            const pairIndex = Math.floor(index / 2)
            setCurrentIndex(pairIndex * 2)
            setShowPageSelector(false)
            if (engineRef.current) {
                engineRef.current.jumpTo(pairIndex)
            }
        } else {
            setCurrentIndex(index)
            setShowPageSelector(false)
            if (engineRef.current) {
                engineRef.current.jumpTo(index)
            }
        }
    }

    const handleJumpToPageNumber = (pageNumber) => {
        const index = pages.findIndex(p => p.pageNumber === pageNumber)
        if (index !== -1) {
            handleJumpToPage(index)
        } else {
            showToast(`الصفحة ${pageNumber} غير محفوظة في سجل الحفظ الخاص بك.`, 'warning')
        }
    }

    useEffect(() => {
        const handleKey = (e) => {
            if (mode !== 'flip' && mode !== 'twopage') return
            if (e.key === 'ArrowRight') engineRef.current?.goToPrev()
            if (e.key === 'ArrowLeft') engineRef.current?.goToNext()
        }
        window.addEventListener('keydown', handleKey)
        return () => window.removeEventListener('keydown', handleKey)
    }, [mode])

    const hasMemorizedContent = (pageObj) => {
        if (!pageObj) return false
        if (pageObj.chunks) {
            return pageObj.chunks.some(c => c.isMemorized)
        }
        return StorageService.isPageMemorized(pageObj.id)
    }

    // Rating
    const handleRating = (pageId, rating) => {
        // Joint evaluation for two-page mode
        if (mode === 'twopage') {
            const pair = pagePairs.find(p => p.right?.id === pageId || p.left?.id === pageId)
            if (pair) {
                const pagesToRate = []
                let ratedCount = 0
                const newRatings = {}

                if (pair.right && hasMemorizedContent(pair.right)) {
                    newRatings[pair.right.id] = rating
                    pagesToRate.push(pair.right)
                    if (!scrollRatings[pair.right.id]) {
                        ratedCount++
                    }
                }
                if (pair.left && hasMemorizedContent(pair.left)) {
                    newRatings[pair.left.id] = rating
                    pagesToRate.push(pair.left)
                    if (!scrollRatings[pair.left.id]) {
                        ratedCount++
                    }
                }

                setScrollRatings(prev => ({ ...prev, ...newRatings }))
                setReviewedCount(prev => prev + ratedCount)

                const msgs = {
                    5: 'ممتاز! ثابت جداً 💪', 4: 'جيد جداً، استمر!',
                    3: 'جيد، تحتاج مراجعة أكثر', 2: 'صعب، ستتحسن بالتكرار',
                    1: 'لا بأس، ستراجعها قريباً'
                }
                showToast(msgs[rating] || '', rating >= 3 ? 'success' : 'warning')

                setTimeout(() => {
                    pagesToRate.forEach(p => {
                        const chunksToRate = p.chunks
                            ? p.chunks.filter(c => c.isMemorized)
                            : [p]
                        chunksToRate.forEach(chunk => {
                            if (chunk) {
                                SRSService.saveSRS(chunk.id, rating).catch(e => console.error('SRS Save failed', e))
                            }
                        })
                    })
                }, 0)
                return
            }
        }

        // UI Update FIRST (Optimistic) for single page mode
        setReviewedCount(prev => prev + 1)
        setScrollRatings(prev => ({ ...prev, [pageId]: rating }))

        const msgs = {
            5: 'ممتاز! ثابت جداً 💪', 4: 'جيد جداً، استمر!',
            3: 'جيد، تحتاج مراجعة أكثر', 2: 'صعب، ستتحسن بالتكرار',
            1: 'لا بأس، ستراجعها قريباً'
        }
        showToast(msgs[rating] || '', rating >= 3 ? 'success' : 'warning')

        // Save SRS for all memorized chunks in composite pages
        const pageToRate = pages.find(p => p.id === pageId)
        const chunksToRate = pageToRate?.chunks
            ? pageToRate.chunks.filter(c => c.isMemorized)
            : [pageToRate]

        setTimeout(() => {
            chunksToRate.forEach(chunk => {
                if (chunk) {
                    SRSService.saveSRS(chunk.id, rating).catch(e => console.error('SRS Save failed', e))
                }
            })
        }, 0)
    }

    const changeMode = (newMode) => {
        setMode(newMode)
        localStorage.setItem('regularReviewMode', newMode)
    }

    const handleFontChange = (e) => {
        const font = e.target.value
        setSelectedFont(font)
        localStorage.setItem('regularReviewFont', font)
    }

    const handleFinish = () => {
        showToast(`تمت مراجعة ${reviewedCount} صفحة`, 'success')
        onBack()
    }

    if (!mode || pages.length === 0) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
                <div className="spinner-border text-gold" role="status"></div>
            </div>
        )
    }

    if (sessionComplete) {
        return (
            <div className="container text-center py-5 fade-in" style={{ maxWidth: '600px' }}>
                <i className="bi bi-trophy-fill text-warning display-1 mb-3 d-block"></i>
                <h2 className="text-gold">اكتملت المراجعة!</h2>
                <p className="text-white fs-4">تمت مراجعة وتقييم {reviewedCount} صفحة</p>
                <button className="btn btn-gold px-5 py-2 mt-3" onClick={onBack}>
                    <i className="bi bi-house me-2"></i>العودة للقائمة
                </button>
            </div>
        )
    }

    // Simplified Quran Page Rendering (supports composite pages)
    const renderQuranPage = (page) => {
        if (!page) return null

        const pageTheme = THEMES_DATA.find(t =>
            t.verses.some(v => v.surah === page.surahId && v.ayah === page.firstAyahId)
        )?.title || page.topic;

        // Determine chunks to render
        const chunks = page.chunks || [{ ...page, isMemorized: true }]
        const isTwoPage = mode === 'twopage'

        return (
            <div className={isTwoPage ? "two-page-card" : "card bg-dark border-gold shadow-lg mb-4 smart-review-card-width"} style={isTwoPage ? {} : { borderRadius: '12px' }}>
                <div className="card-header bg-transparent border-gold d-flex justify-content-between align-items-center py-2">
                    <span className="text-gold fw-bold" style={{ fontSize: '0.85rem' }}>
                        <i className="bi bi-journal-text me-1"></i>
                        {page.isComposite ? page.surahName : `سورة ${page.surahName}`}
                    </span>
                    <div className="d-flex align-items-center gap-2">
                        {pageTheme && <span className="badge bg-info bg-opacity-25 text-info x-small" style={{ fontSize: '0.65rem' }}>{pageTheme}</span>}
                        <span className="badge bg-warning bg-opacity-25 text-warning" style={{ fontSize: '0.65rem' }}>
                            صفحة {toArabicIndic(page.pageNumber)}
                        </span>
                    </div>
                </div>
                <div className={isTwoPage ? "card-body p-2 p-md-3 flex-grow-1 overflow-auto custom-scrollbar" : ""}>
                    {chunks.map((chunk, idx) => {
                        const isSurahStart = chunk.ayahs && chunk.ayahs.some(a => a.number === 1)
                        const showBismillah = isSurahStart && chunk.surahId !== 9 && chunk.surahId !== 1
                        const showDivider = isSurahStart || (idx > 0)

                        return (
                            <div key={chunk.id} className={isTwoPage ? "" : "card-body p-3 p-md-4 text-center"}>
                                {showDivider && <SurahDivider surahName={chunk.surahName} />}
                                {showBismillah && <Bismillah />}

                                {chunk.isMemorized ? (
                                    <div className="memorized-chunk-wrapper">
                                        <div className="quran-text text-center" style={{ lineHeight: '2.3', fontSize: isTwoPage ? undefined : '1.2rem', fontFamily: actualFontFamily, fontWeight: actualFontWeight, fontStyle: actualFontStyle }}>
                                            <WordRenderer ayahs={chunk.ayahs} pageId={chunk.id} surahId={chunk.surahId} fontFamily={actualFontFamily} fontWeight={actualFontWeight} fontStyle={actualFontStyle} onJumpToPageNumber={handleJumpToPageNumber} />
                                        </div>
                                    </div>
                                ) : (
                                    <BlurredChunk ayahs={chunk.ayahs} />
                                )}
                            </div>
                        )
                    })}
                </div>
                <div className="card-footer bg-transparent border-gold text-center py-1">
                    <small className="text-muted" style={{ fontSize: '0.7rem' }}>
                        صفحة {toArabicIndic(page.pageNumber)}
                    </small>
                </div>
            </div>
        )
    }

    // Calculate directional helper for bookmark
    let bookmarkDirection = null
    if (globalBookmark && pages.length > 0) {
        const bookmarkIndex = pages.findIndex(p => p.id === globalBookmark)
        if (bookmarkIndex !== -1 && bookmarkIndex !== currentIndex) {
            if (mode === 'scroll') {
                bookmarkDirection = bookmarkIndex > currentIndex ? 'down' : 'up'
            } else if (mode === 'twopage') {
                const currentPairIndex = Math.floor(currentIndex / 2)
                const bookmarkPairIndex = Math.floor(bookmarkIndex / 2)
                if (bookmarkPairIndex !== currentPairIndex) {
                    bookmarkDirection = bookmarkPairIndex > currentPairIndex ? 'left' : 'right'
                }
            } else {
                bookmarkDirection = bookmarkIndex > currentIndex ? 'left' : 'right'
            }
        }
    }

    const currentFontObj = quranFonts.find(f => f.id === selectedFont) || quranFonts[0]
    const actualFontFamily = currentFontObj.family || currentFontObj.id
    const actualFontWeight = 400
    const actualFontStyle = 'normal'

    const isAtStart = currentIndex === 0
    const isAtEnd = mode === 'twopage'
        ? Math.floor(currentIndex / 2) === pagePairs.length - 1
        : currentIndex === pages.length - 1

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

            <div className={`regular-review-container ${mode === 'twopage' ? 'twopage-grid-layout' : 'container py-3'} ${showRotateOverlay ? 'd-none' : ''}`} style={{ maxWidth: mode === 'twopage' ? '100%' : '850px' }}>
                {/* Header */}
                <div className={`d-flex justify-content-between align-items-center ${mode === 'twopage' ? 'twopage-header px-3' : 'mb-3'}`}>
                    <BackButton onClick={onBack} className="btn-sm" />
                    <div className="text-center d-flex flex-column align-items-center relative">
                        <div className="d-flex align-items-center justify-content-center gap-2">
                            {bookmarkDirection && ['right', 'up'].includes(bookmarkDirection) && (
                                <i className="bi bi-arrow-right text-gold blink-animation" style={{ fontSize: '1.2rem' }} title="العلامة المرجعية في هذا الاتجاه"></i>
                            )}

                            <button
                                className="btn btn-sm btn-outline-warning border-0 d-flex align-items-center gap-2 mb-0"
                                onClick={() => setShowPageSelector(prev => !prev)}
                                title="انتقل لصفحة محددة"
                            >
                                <span className="fw-bold" style={{ fontSize: mode === 'twopage' ? '0.8rem' : undefined }}>
                                    {mode === 'twopage'
                                        ? (() => {
                                            const pair = pagePairs[Math.floor(currentIndex / 2)]
                                            if (!pair) return 'صفحات المراجعة'
                                            const rightNum = toArabicIndic(pair.right?.pageNumber)
                                            const leftNum = pair.left ? toArabicIndic(pair.left.pageNumber) : null
                                            return leftNum ? `صفحة ${rightNum} - ${leftNum}` : `صفحة ${rightNum}`
                                        })()
                                        : `صفحة ${toArabicIndic(pages[currentIndex]?.pageNumber)}`
                                    }
                                </span>
                                <i className="bi bi-chevron-down small"></i>
                            </button>

                            {bookmarkDirection && ['left', 'down'].includes(bookmarkDirection) && (
                                <i className="bi bi-arrow-left text-gold blink-animation" style={{ fontSize: '1.2rem' }} title="العلامة المرجعية في هذا الاتجاه"></i>
                            )}
                        </div>
                        <small className="text-muted" style={{ fontSize: '0.7rem' }}>
                            {mode === 'twopage' 
                                ? `${toArabicIndic(Math.floor(currentIndex / 2) + 1)} من ${toArabicIndic(pagePairs.length)}` 
                                : `${toArabicIndic(currentIndex + 1)} من ${toArabicIndic(pages.length)}`
                            }
                        </small>
                    </div>
                    <div className="d-flex gap-1">
                        {mode !== 'twopage' && (
                            <button
                                className="btn btn-sm p-1 d-flex align-items-center justify-content-center me-2"
                                style={{ color: globalBookmark === pages[currentIndex]?.id ? 'var(--accent-gold)' : '#6c757d', background: 'transparent', border: 'none' }}
                                onClick={() => toggleGlobalBookmark()}
                                title={globalBookmark === pages[currentIndex]?.id ? "حذف العلامة المرجعية" : "حفظ كعلامة مرجعية"}
                            >
                                <i className={`bi ${globalBookmark === pages[currentIndex]?.id ? 'bi-bookmark-star-fill' : 'bi-bookmark-star'} fs-5`}></i>
                            </button>
                        )}
                        <button className="btn btn-outline-secondary btn-sm"
                            onClick={() => setShowSettings(!showSettings)} title="إعدادات العرض">
                            <i className="bi bi-gear"></i>
                        </button>
                    </div>
                </div>

                {/* Page Jump Selector Modal */}
                {showPageSelector && (
                    <div className="card bg-dark border-warning mb-3 fade-in position-absolute start-0 end-0 mx-auto z-3 shadow-lg"
                        style={{ maxWidth: '90%', top: '70px', maxHeight: '60vh', overflow: 'hidden' }}>
                        <div className="card-header bg-warning text-dark d-flex justify-content-between align-items-center py-2">
                            <span className="fw-bold small"><i className="bi bi-cursor-fill me-1"></i> انتقل لصفحة</span>
                            <button className="btn btn-sm btn-close" onClick={() => setShowPageSelector(false)}></button>
                        </div>
                        <div className="card-body p-2 overflow-auto custom-scrollbar" style={{ maxHeight: '50vh' }}>
                            <div className="row g-2">
                                {pages.map((p, idx) => (
                                    <div key={p.id} className="col-3 col-sm-2">
                                        <button
                                            className={`btn btn-sm w-100 position-relative ${idx === currentIndex ? 'btn-warning' : 'btn-outline-secondary'}`}
                                            onClick={() => handleJumpToPage(idx)}
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
                )}

                {showSettings && (
                    <div className="card bg-dark border-secondary mb-3 fade-in">
                        <div className="card-body p-3">
                            <h6 className="text-gold mb-2"><i className="bi bi-display me-1"></i> إعدادات العرض</h6>
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
                            </div>
                        </div>
                    </div>
                )}

                {/* Progress */}
                <div className={mode === 'twopage' ? 'px-3' : 'mb-3'}>
                    <div className="progress" style={{ height: '3px', backgroundColor: '#333' }}>
                        <div className="progress-bar bg-gold" style={{
                            width: `${mode === 'twopage' ? (((Math.floor(currentIndex / 2) + 1) / pagePairs.length) * 100) : (((currentIndex + 1) / pages.length) * 100)}%`,
                            transition: 'width 0.3s ease'
                        }}></div>
                    </div>
                </div>

                {/* UNIFIED REVIEW ENGINE */}
                <div className={`flex-grow-1 position-relative ${mode === 'twopage' ? 'twopage-engine-area' : ''}`} style={{ minHeight: 0, height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <ReviewEngine
                        ref={engineRef}
                        pages={mode === 'twopage' ? pagePairs : pages}
                        initialIndex={mode === 'twopage' ? Math.floor(currentIndex / 2) : currentIndex}
                        viewMode={mode === 'scroll' ? 'vertical' : 'horizontal'}
                        onIndexChange={(idx) => {
                            if (mode === 'twopage') {
                                setCurrentIndex(idx * 2)
                            } else {
                                setCurrentIndex(idx)
                            }
                        }}
                        renderPage={(pageOrPair, isActive) => {
                            if (mode === 'twopage') {
                                const pair = pageOrPair;
                                return (
                                    <div className="book-spread">
                                        {/* Right Page */}
                                        <div className="book-page book-page-right">
                                            {renderQuranPage(pair.right)}
                                        </div>

                                        {/* Book Spine */}
                                        <div className="book-spine"></div>

                                        {/* Left Page */}
                                        <div className="book-page book-page-left">
                                            {pair.left ? renderQuranPage(pair.left) : (
                                                <div className="two-page-card d-flex align-items-center justify-content-center text-muted" style={{ border: 'none', boxShadow: 'none' }}>
                                                    <span>نهاية الحفظ</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            } else {
                                const page = pageOrPair;
                                return (
                                    <div className={`d-flex flex-column w-100 ${mode === 'scroll' ? 'mb-5' : ''}`} style={{ minHeight: '100%' }}>
                                        {renderQuranPage(page)}

                                        <div className="mt-3">
                                            <RatingButtons
                                                pageId={page.id}
                                                currentRating={scrollRatings[page.id]}
                                                onRate={handleRating}
                                                compact={mode === 'scroll'}
                                            />
                                        </div>

                                        {/* Footer for Scroll Mode (Last Page only) */}
                                        {mode === 'scroll' && pages[pages.length - 1].id === page.id && (
                                            <div className="text-center py-5">
                                                <i className="bi bi-check-circle-fill text-success fs-1 mb-3 d-block"></i>
                                                <p className="text-gold fs-5">نهاية الصفحات</p>
                                            </div>
                                        )}
                                    </div>
                                )
                            }
                        }}
                    />
                </div>

                {/* Joint rating panel for two-page mode */}
                {mode === 'twopage' && pagePairs[Math.floor(currentIndex / 2)] && (
                    <div className="joint-rating-container">
                        <RatingButtons
                            pageId={pagePairs[Math.floor(currentIndex / 2)].right.id}
                            currentRating={
                                scrollRatings[pagePairs[Math.floor(currentIndex / 2)].right.id] ||
                                (pagePairs[Math.floor(currentIndex / 2)].left && scrollRatings[pagePairs[Math.floor(currentIndex / 2)].left.id]) ||
                                null
                            }
                            onRate={(id, r) => handleRating(pagePairs[Math.floor(currentIndex / 2)].right.id, r)}
                            compact={true}
                            inline={true}
                        />
                    </div>
                )}

                <TutorialOverlay
                    steps={tutorialSteps}
                    isOpen={showTutorial}
                    onClose={() => {
                        setShowTutorial(false)
                        StorageService.markTutorialAsSeen('regular_review_intro')
                    }}
                />

                <style>{`
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

export default RegularReview
