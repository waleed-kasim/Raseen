import { useState, useEffect, useRef, useCallback } from 'react'
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

const TwoPageReview = ({ onBack, showToast }) => {
    const [pages, setPages] = useState([])
    const [pagePairs, setPagePairs] = useState([])
    const [currentIndex, setCurrentIndex] = useState(0) // Index of the pagePairs
    const [showSettings, setShowSettings] = useState(false)
    const [reviewedCount, setReviewedCount] = useState(0)
    const [scrollRatings, setScrollRatings] = useState({})
    const [showPageSelector, setShowPageSelector] = useState(false)
    const [globalBookmark, setGlobalBookmark] = useState(StorageService.getGlobalBookmark())

    const [isPortrait, setIsPortrait] = useState(window.innerHeight > window.innerWidth)
    const [isMobile, setIsMobile] = useState(false)

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
        const checkMobile = () => {
            const isMob = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) || window.innerWidth < 768
            setIsMobile(isMob)
        }
        checkMobile()

        const handleResize = () => {
            setIsPortrait(window.innerHeight > window.innerWidth)
            checkMobile()
        }
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    useEffect(() => {
        // Attempt to lock screen orientation to landscape
        const lockOrientation = async () => {
            if (screen.orientation && typeof screen.orientation.lock === 'function') {
                try {
                    await screen.orientation.lock('landscape')
                } catch (e) {
                    console.log('Programmatic orientation lock rejected or not supported:', e)
                }
            }
        }
        lockOrientation()
        
        return () => {
            // Unlock on unmount
            if (screen.orientation && typeof screen.orientation.unlock === 'function') {
                try {
                    screen.orientation.unlock()
                } catch (e) {
                    console.log('Failed to unlock orientation:', e)
                }
            }
        }
    }, [])

    useEffect(() => {
        const allPages = StorageService.getCompositeMemorizedPages()
        if (allPages.length === 0) {
            showToast('لا توجد صفحات محفوظة', 'error')
            onBack()
            return
        }
        setPages(allPages)

        // Create page pairs
        const pairs = []
        for (let i = 0; i < allPages.length; i += 2) {
            pairs.push({
                id: `pair_${i}`,
                right: allPages[i],
                left: allPages[i + 1] || null,
                index: i / 2
            })
        }
        setPagePairs(pairs)

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
        if (!pageObj) return

        if (globalBookmark === pageObj.id) {
            StorageService.setGlobalBookmark(null)
            setGlobalBookmark(null)
            showToast('تم إزالة العلامة المرجعية', 'info')
        } else {
            StorageService.setGlobalBookmark(pageObj.id)
            setGlobalBookmark(pageObj.id)
            showToast('تم تعيين الصفحة كعلامة مرجعية', 'success')
        }
    }

    // Tutorial Logic
    const [showTutorial, setShowTutorial] = useState(false)
    const [tutorialSteps] = useState([
        {
            title: "عرض صفحتين بجانب بعض 📖",
            description: "راجع وردك بعرض مزدوج يحاكي المصحف الورقي (الصفحة الأولى على اليمين والتالية على اليسار).",
            icon: "bi-book"
        }
    ])

    useEffect(() => {
        const hasSeen = StorageService.hasSeenTutorial('two_page_review_intro')
        if (!hasSeen) {
            setShowTutorial(true)
        }
    }, [])

    // Jump to specific page index in original list
    const handleJumpToPage = (index) => {
        const pairIndex = Math.floor(index / 2)
        setCurrentIndex(pairIndex)
        setShowPageSelector(false)
        if (engineRef.current) {
            engineRef.current.jumpTo(pairIndex)
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
            if (e.key === 'ArrowRight') engineRef.current?.goToPrev()
            if (e.key === 'ArrowLeft') engineRef.current?.goToNext()
        }
        window.addEventListener('keydown', handleKey)
        return () => window.removeEventListener('keydown', handleKey)
    }, [])

    // Rating
    const handleRating = (pageId, rating) => {
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

    const handleFontChange = (e) => {
        const font = e.target.value
        setSelectedFont(font)
        localStorage.setItem('regularReviewFont', font)
    }

    if (pages.length === 0 || pagePairs.length === 0) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
                <div className="spinner-border text-gold" role="status"></div>
            </div>
        )
    }

    const currentFontObj = quranFonts.find(f => f.id === selectedFont) || quranFonts[0]
    const actualFontFamily = currentFontObj.family || currentFontObj.id
    const actualFontWeight = 400
    const actualFontStyle = 'normal'

    const currentPair = pagePairs[currentIndex]

    // Simplified Quran Page Rendering (supports composite pages)
    const renderQuranPage = (page) => {
        if (!page) return null

        const pageTheme = THEMES_DATA.find(t =>
            t.verses.some(v => v.surah === page.surahId && v.ayah === page.firstAyahId)
        )?.title || page.topic

        const chunks = page.chunks || [{ ...page, isMemorized: true }]

        return (
            <div className="card bg-dark border-gold shadow-lg h-100" style={{ borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div className="card-header bg-transparent border-gold d-flex justify-content-between align-items-center py-2">
                    <span className="text-gold fw-bold" style={{ fontSize: '0.85rem' }}>
                        <i className="bi bi-journal-text me-1"></i>
                        {page.isComposite ? page.surahName : `سورة ${page.surahName}`}
                    </span>
                    <div className="d-flex align-items-center gap-1">
                        {pageTheme && <span className="badge bg-info bg-opacity-25 text-info x-small" style={{ fontSize: '0.65rem' }}>{pageTheme}</span>}
                        <span className="badge bg-warning bg-opacity-25 text-warning" style={{ fontSize: '0.65rem' }}>
                            صفحة {toArabicIndic(page.pageNumber)}
                        </span>
                    </div>
                </div>
                <div className="card-body p-2 p-md-3 flex-grow-1 overflow-auto custom-scrollbar" style={{ minHeight: '200px' }}>
                    {chunks.map((chunk, idx) => {
                        const isSurahStart = chunk.ayahs && chunk.ayahs.some(a => a.number === 1)
                        const showBismillah = isSurahStart && chunk.surahId !== 9 && chunk.surahId !== 1
                        const showDivider = isSurahStart || (idx > 0)

                        return (
                            <div key={chunk.id}>
                                {showDivider && <SurahDivider surahName={chunk.surahName} />}
                                {showBismillah && <Bismillah />}

                                {chunk.isMemorized ? (
                                    <div className="memorized-chunk-wrapper">
                                        <div className="quran-text text-center" style={{ lineHeight: '2.3', fontSize: '1.2rem', fontFamily: actualFontFamily, fontWeight: actualFontWeight, fontStyle: actualFontStyle }}>
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

    const showRotateOverlay = isMobile && isPortrait

    return (
        <>
            {showRotateOverlay && (
                <div className="rotate-overlay fade-in">
                    <i className="bi bi-phone-landscape rotate-overlay-icon"></i>
                    <h4 className="text-gold mb-2">يرجى تدوير الجهاز</h4>
                    <p className="text-muted small">هذا الوضع يتطلب عرضاً أفقياً لعرض الصفحتين بجانب بعضهما البعض.</p>
                </div>
            )}

            <div className={`two-page-review-container container-fluid py-3 d-flex flex-column h-100 ${showRotateOverlay ? 'd-none' : ''}`} style={{ maxWidth: '1400px' }}>
                {/* Header */}
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <BackButton onClick={onBack} className="btn-sm" />
                    <div className="text-center d-flex flex-column align-items-center relative">
                        <div className="d-flex align-items-center justify-content-center gap-2">
                            <button
                                className="btn btn-sm btn-outline-warning border-0 d-flex align-items-center gap-2 mb-1"
                                onClick={() => setShowPageSelector(prev => !prev)}
                                title="انتقل لصفحة محددة"
                            >
                                <span className="fw-bold">صفحات المراجعة</span>
                                <i className="bi bi-chevron-down small"></i>
                            </button>
                        </div>
                        <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                            مجموعة {toArabicIndic(currentIndex + 1)} من {toArabicIndic(pagePairs.length)}
                        </small>
                    </div>
                    <div className="d-flex gap-1">
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
                                            className="btn btn-sm w-100 position-relative btn-outline-secondary"
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
                                <div className="col-12">
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
                <div className="mb-3">
                    <div className="progress" style={{ height: '4px', backgroundColor: '#333' }}>
                        <div className="progress-bar bg-gold" style={{
                            width: `${((currentIndex + 1) / pagePairs.length) * 100}%`,
                            transition: 'width 0.3s ease'
                        }}></div>
                    </div>
                </div>

                {/* REVIEW ENGINE */}
                <div className="flex-grow-1 position-relative" style={{ height: 'calc(100vh - 160px)', overflow: 'hidden' }}>
                    <ReviewEngine
                        ref={engineRef}
                        pages={pagePairs}
                        initialIndex={currentIndex}
                        viewMode="horizontal"
                        onIndexChange={setCurrentIndex}
                        renderPage={(pair, isActive) => (
                            <div className="row g-3 w-100 h-100 justify-content-center align-items-stretch" style={{ direction: 'rtl', margin: '0' }}>
                                {/* Right Page Card */}
                                <div className="col-6 h-100 d-flex flex-column p-1">
                                    <div className="flex-grow-1" style={{ minHeight: '0' }}>
                                        {renderQuranPage(pair.right)}
                                    </div>
                                    <div className="mt-2">
                                        <div className="d-flex justify-content-between align-items-center bg-black bg-opacity-25 p-2 rounded">
                                            <button
                                                className="btn btn-sm p-1"
                                                style={{ color: globalBookmark === pair.right.id ? 'var(--accent-gold)' : '#6c757d', background: 'transparent', border: 'none' }}
                                                onClick={() => toggleGlobalBookmark(pair.right)}
                                                title={globalBookmark === pair.right.id ? "حذف العلامة المرجعية" : "حفظ كعلامة مرجعية"}
                                            >
                                                <i className={`bi ${globalBookmark === pair.right.id ? 'bi-bookmark-star-fill' : 'bi-bookmark-star'} fs-5`}></i>
                                            </button>
                                            <RatingButtons
                                                pageId={pair.right.id}
                                                currentRating={scrollRatings[pair.right.id]}
                                                onRate={handleRating}
                                                compact={true}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Left Page Card */}
                                <div className="col-6 h-100 d-flex flex-column p-1">
                                    <div className="flex-grow-1" style={{ minHeight: '0' }}>
                                        {pair.left ? renderQuranPage(pair.left) : (
                                            <div className="card bg-dark border-secondary shadow-lg d-flex align-items-center justify-content-center h-100 text-muted" style={{ borderRadius: '12px', minHeight: '200px' }}>
                                                <span>نهاية الحفظ</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-2">
                                        {pair.left && (
                                            <div className="d-flex justify-content-between align-items-center bg-black bg-opacity-25 p-2 rounded">
                                                <button
                                                    className="btn btn-sm p-1"
                                                    style={{ color: globalBookmark === pair.left.id ? 'var(--accent-gold)' : '#6c757d', background: 'transparent', border: 'none' }}
                                                    onClick={() => toggleGlobalBookmark(pair.left)}
                                                    title={globalBookmark === pair.left.id ? "حذف العلامة المرجعية" : "حفظ كعلامة مرجعية"}
                                                >
                                                    <i className={`bi ${globalBookmark === pair.left.id ? 'bi-bookmark-star-fill' : 'bi-bookmark-star'} fs-5`}></i>
                                                </button>
                                                <RatingButtons
                                                    pageId={pair.left.id}
                                                    currentRating={scrollRatings[pair.left.id]}
                                                    onRate={handleRating}
                                                    compact={true}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    />
                </div>

                <TutorialOverlay
                    steps={tutorialSteps}
                    isOpen={showTutorial}
                    onClose={() => {
                        setShowTutorial(false)
                        StorageService.markTutorialAsSeen('two_page_review_intro')
                    }}
                />
            </div>
        </>
    )
}

export default TwoPageReview
