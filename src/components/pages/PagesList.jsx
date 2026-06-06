import { useState, useEffect, useRef } from 'react'
import { StorageService } from '../../services/storage'
import SurahGridItem from './SurahGridItem'
import PagesGrid from './PagesGrid'
import RangeSelectorModal from './RangeSelectorModal'
import BackButton from '../ui/BackButton'

function PagesList({ onBack, registerBackHandler, pushInternalState }) {
    const [surahs, setSurahs] = useState([])
    const [memorizedIds, setMemorizedIds] = useState(new Set())
    const [allPages, setAllPages] = useState([])
    const [expandedSurahId, setExpandedSurahId] = useState(null)
    const [showRangeModal, setShowRangeModal] = useState(false)
    const [showInstructions, setShowInstructions] = useState(!StorageService.hasVisitedSection('savedPagesInstructions'))

    // Register hardware back handler
    useEffect(() => {
        if (registerBackHandler) {
            registerBackHandler.current = () => {
                if (expandedSurahId) {
                    setExpandedSurahId(null)
                    return true // Intercepted
                }
                return false // Let App handle it
            }
        }
        return () => { if (registerBackHandler) registerBackHandler.current = null }
    }, [expandedSurahId])

    const handleBackUI = () => {
        if (expandedSurahId) {
            window.history.back()
        } else {
            onBack()
        }
    }

    // Sticky Header Ref
    const stickyHeaderRef = useRef(null)

    useEffect(() => {
        const surahList = StorageService.getSurahs()
        const pages = StorageService.getSortedPages()
        setSurahs(surahList)
        setAllPages(pages)
        setMemorizedIds(new Set(StorageService.getMemorizedPageIds()))
    }, [])

    const togglePageMemory = (pageId) => {
        const isNowMemorized = StorageService.togglePageMemorized(pageId)
        setMemorizedIds(prev => {
            const next = new Set(prev)
            if (isNowMemorized) next.add(pageId)
            else next.delete(pageId)
            return next
        })
    }

    const handleSurahClick = (surahId) => {
        if (expandedSurahId === surahId) {
            setExpandedSurahId(null)
        } else {
            setExpandedSurahId(surahId)
            if (pushInternalState) pushInternalState()
            window.scrollTo({ top: 0, behavior: 'smooth' })
        }
    }

    const getSurahPages = (surahId) => {
        return allPages.filter(p => p.surahId === surahId)
    }

    const getMemorizedCountInSurah = (surahId) => {
        return getSurahPages(surahId).filter(p => memorizedIds.has(p.id)).length
    }

    const handleSelectAllSurah = (surahId) => {
        const pages = getSurahPages(surahId)
        const allMemorized = pages.every(p => memorizedIds.has(p.id))

        pages.forEach(p => {
            StorageService.setPageMemorized(p.id, !allMemorized)
        })

        // Refresh state
        setMemorizedIds(new Set(StorageService.getMemorizedPageIds()))
    }

    const handleRangeApply = (start, end) => {
        // Find pages in range
        const pagesInRange = allPages.filter(p => p.pageNumber >= start && p.pageNumber <= end)

        pagesInRange.forEach(p => {
            StorageService.setPageMemorized(p.id, true)
        })
        // Refresh state
        setMemorizedIds(new Set(StorageService.getMemorizedPageIds()))
    }

    const activeSurah = surahs.find(s => s.id === expandedSurahId)

    return (
        <div className="memorized-selector fade-in position-relative min-vh-100 pb-5">
            {/* Range Modal */}
            <RangeSelectorModal
                show={showRangeModal}
                onHide={() => setShowRangeModal(false)}
                onApply={handleRangeApply}
            />

            {/* Header Actions */}
            {!expandedSurahId && (
                <div className="page-header">
                    <BackButton onClick={handleBackUI} />
                    <h2 className="page-title">سجل الحفظ</h2>
                    <button
                        className="btn btn-outline-gold btn-sm"
                        onClick={() => setShowRangeModal(true)}
                    >
                        <i className="bi bi-list-check me-2"></i> إضافة نطاق
                    </button>
                </div>
            )}

            {/* Instruction Banner */}
            {!expandedSurahId && showInstructions && (
                <div className="alert bg-dark border-gold text-white mx-3 mb-4 fade-in position-relative shadow-sm" style={{ borderStyle: 'dashed' }} role="alert">
                    <button
                        type="button"
                        className="btn-close btn-close-white position-absolute top-0 end-0 m-2"
                        aria-label="Close"
                        onClick={() => {
                            StorageService.markSectionVisited('savedPagesInstructions')
                            setShowInstructions(false)
                        }}
                    ></button>
                    <div className="d-flex align-items-center">
                        <i className="bi bi-lightbulb text-gold fs-1 me-3"></i>
                        <div>
                            <h6 className="fw-bold text-gold mb-2">طريقة عمل سجل الحفظ</h6>
                            <p className="mb-0 text-muted small" style={{ lineHeight: '1.6' }}>
                                يجب عليك تحديد الصفحات التي تحفظها يدويا من هذه القائمة. جميع ادوات التطبيق والاختبارات ستعمل فقط على الصفحات التي قمت باختيارها.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Expanded Surah View (Sticky Header) */}
            {activeSurah && (
                <div className="sticky-surah-view">
                    <div
                        className="sticky-header shadow-lg mb-3"
                        ref={stickyHeaderRef}
                        style={{
                            position: 'sticky', // Use sticky or fixed depending on need. Sticky is better usually.
                            top: '0px',
                            zIndex: 100,
                            borderRadius: '0 0 16px 16px'
                        }}
                    >
                        <SurahGridItem
                            surah={activeSurah}
                            memorizedCount={getMemorizedCountInSurah(activeSurah.id)}
                            totalPages={getSurahPages(activeSurah.id).length}
                            onClick={() => window.history.back()} // Click header to close via history
                            isExpanded={true}
                        />
                        <div className="bg-card border-gold py-2 px-3 d-flex justify-content-between align-items-center rounded-bottom-4">
                            <div></div> {/* Spacer to keep justification if needed, or just remove */}
                            <button
                                className="btn btn-sm btn-gold"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    handleSelectAllSurah(activeSurah.id)
                                }}
                            >
                                {getMemorizedCountInSurah(activeSurah.id) === getSurahPages(activeSurah.id).length
                                    ? 'إلغاء تحديد الكل'
                                    : 'حفظت السورة كاملة'}
                            </button>
                        </div>
                    </div>

                    {/* Pages Grid for Expanded Surah */}
                    <PagesGrid
                        pages={getSurahPages(activeSurah.id)}
                        memorizedIds={memorizedIds}
                        onTogglePage={togglePageMemory}
                    />
                </div>
            )}

            {/* Main Surahs Grid */}
            {!expandedSurahId && (
                <div className="surahs-grid-container" style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                    gap: '1rem'
                }}>
                    {surahs.map(surah => {
                        const surahPages = allPages.filter(p => p.surahId === surah.id)
                        if (surahPages.length === 0) return null // Skip empty

                        return (
                            <SurahGridItem
                                key={surah.id}
                                surah={surah}
                                memorizedCount={getMemorizedCountInSurah(surah.id)}
                                totalPages={surahPages.length}
                                onClick={() => handleSurahClick(surah.id)}
                                isExpanded={false}
                            />
                        )
                    })}
                </div>
            )}
        </div>
    )
}

export default PagesList
