import { useState, useEffect, useCallback } from 'react'
import { StorageService } from '../../../services/storage'
import { numberToArabicIndic } from '../../../utils/javascUtil/gameUtils'
import AyahSeparator from '../../ui/AyahSeparator'
import TutorialOverlay from '../../ui/TutorialOverlay'

const LinksViewMode = ({ onBack, showToast }) => {
    const [links, setLinks] = useState([])
    const [currentLinkIndex, setCurrentLinkIndex] = useState(0)
    const [isLoading, setIsLoading] = useState(true)
    const [viewMode, setViewMode] = useState('cards') // 'cards' | 'mushaf'

    const [showTutorial, setShowTutorial] = useState(false)
    const [tutorialSteps] = useState([
        {
            title: "عرض الروابط",
            description: "مراجعة فقط: شاهد الروابط بين الصفحات المتتالية (آخر آية + أول آية).",
            icon: "bi-eye"
        }
    ])

    const loadLinks = useCallback(() => {
        setIsLoading(true)
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
            showToast('لا توجد روابط بين الصفحات المحفوظة. احفظ صفحتين متتاليتين لتفعيل هذا الوضع.', 'warning')
            setLinks([])
            setIsLoading(false)
            return
        }

        setLinks(linksData)
        setCurrentLinkIndex(0)
        setIsLoading(false)
    }, [showToast])

    useEffect(() => {
        const hasSeen = StorageService.hasSeenTutorial('links_view_intro')
        if (!hasSeen) {
            setShowTutorial(true)
        }
    }, [])

    useEffect(() => {
        loadLinks()
    }, [loadLinks])

    const handleLinkNav = (dir) => {
        if (dir === 'next' && currentLinkIndex < links.length - 1) {
            setCurrentLinkIndex(currentLinkIndex + 1)
        } else if (dir === 'prev' && currentLinkIndex > 0) {
            setCurrentLinkIndex(currentLinkIndex - 1)
        }
    }

    if (isLoading) return <div className="text-center text-gold p-5">جاري التحميل...</div>

    if (links.length === 0) {
        return (
            <div className="links-view-mode fade-in p-4 text-center">
                <div className="alert alert-warning">
                    لم يتم العثور على روابط. يجب حفظ صفحتين متتاليتين على الأقل لتظهر الروابط هنا.
                </div>
            </div>
        )
    }

    const currentLink = links[currentLinkIndex]

    return (
        <div className="links-view-mode fade-in">
            {/* View Mode Toggle */}
            <div className="d-flex justify-content-center mb-3">
                <div className="d-flex rounded-pill overflow-hidden" style={{ border: '1px solid var(--border-color)' }}>
                    <button
                        className={`btn btn-sm px-3 py-1 border-0 ${viewMode === 'cards' ? 'btn-gold' : 'btn-link text-muted'}`}
                        onClick={() => setViewMode('cards')}
                        style={{ borderRadius: 0, fontSize: '0.8rem' }}
                    >
                        <i className="bi bi-card-text me-1"></i> بطاقات
                    </button>
                    <button
                        className={`btn btn-sm px-3 py-1 border-0 ${viewMode === 'mushaf' ? 'btn-gold' : 'btn-link text-muted'}`}
                        onClick={() => setViewMode('mushaf')}
                        style={{ borderRadius: 0, fontSize: '0.8rem' }}
                    >
                        <i className="bi bi-book me-1"></i> مصحف
                    </button>
                </div>
            </div>

            {/* Navigation */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <button
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => handleLinkNav('prev')}
                    disabled={currentLinkIndex === 0}
                >
                    <i className="bi bi-arrow-right"></i>
                </button>
                <span className="text-gold" style={{ fontSize: '0.85rem' }}>
                    رابط {currentLinkIndex + 1} من {links.length}
                </span>
                <button
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => handleLinkNav('next')}
                    disabled={currentLinkIndex === links.length - 1}
                >
                    <i className="bi bi-arrow-left"></i>
                </button>
            </div>

            {/* ===== Cards View ===== */}
            {viewMode === 'cards' && (
                <div className="card card-dark-gold shadow-lg mb-4">
                    <div className="card-body text-center p-4">
                        <div className="mb-4 pb-4 border-bottom border-secondary">
                            <span className="badge bg-warning text-dark mb-2">
                                نهاية صفحة {currentLink.prevPage.pageNumber}
                            </span>
                            <div className="quran-text-sm">
                                {currentLink.prevLastAyah?.text} <AyahSeparator number={currentLink.prevLastAyah?.number} />
                            </div>
                        </div>

                        <div className="link-icon my-2 text-gold">
                            <i className="bi bi-link-45deg display-4"></i>
                        </div>

                        <div className="mt-4 pt-2">
                            <span className="badge bg-success mb-2">
                                بداية صفحة {currentLink.currPage.pageNumber}
                            </span>
                            <div className="quran-text-sm">
                                {currentLink.currFirstAyah?.text} <AyahSeparator number={currentLink.currFirstAyah?.number} />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== Mushaf View ===== */}
            {viewMode === 'mushaf' && (
                <div className="card card-dark-gold shadow-lg mb-4">
                    <div className="card-body p-4">
                        {/* Page numbers legend */}
                        <div className="d-flex justify-content-center gap-3 mb-3" style={{ fontSize: '0.75rem' }}>
                            <span className="text-muted">
                                <span className="d-inline-block rounded-circle me-1" style={{ width: 8, height: 8, background: '#ffc107' }}></span>
                                صفحة {currentLink.prevPage.pageNumber}
                            </span>
                            <span className="text-muted">
                                <span className="d-inline-block rounded-circle me-1" style={{ width: 8, height: 8, background: '#198754' }}></span>
                                صفحة {currentLink.currPage.pageNumber}
                            </span>
                        </div>

                        {/* Continuous Quran text */}
                        <div className="quran-text" dir="rtl" style={{ lineHeight: '2.4', textAlign: 'center' }}>
                            <span style={{ color: '#ffc107' }}>
                                {currentLink.prevLastAyah?.text}
                            </span>
                            {' '}
                            <AyahSeparator number={currentLink.prevLastAyah?.number} className="text-gold" />
                            {' '}
                            <span style={{ color: '#198754' }}>
                                {currentLink.currFirstAyah?.text}
                            </span>
                            {' '}
                            <AyahSeparator number={currentLink.currFirstAyah?.number} className="text-gold" />
                        </div>
                    </div>
                </div>
            )}

            <div className="text-center text-muted">
                <small>ركز على الرابط بين آخر آية وأول آية</small>
            </div>

            <TutorialOverlay
                steps={tutorialSteps}
                isOpen={showTutorial}
                onClose={() => {
                    setShowTutorial(false)
                    StorageService.markTutorialAsSeen('links_view_intro')
                }}
            />
        </div>
    )
}

export default LinksViewMode
