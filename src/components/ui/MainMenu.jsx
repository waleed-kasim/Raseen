import { useRef, useState, useEffect } from 'react'
import { StorageService } from '../../services/storage'
import NotificationDot from './NotificationDot'

function MainMenu({ pagesCount, onStartMode, onShowPages, onSmartReview, onRegularReview, onShowThemes, onShowMutashabihat, lockedModes = {}, onShowContact }) {

    // Track visited states locally to trigger re-renders when changed
    // We use a dummy state to force update if needed, or better, read from storage on mount and updates
    const [visitedState, setVisitedState] = useState({})

    useEffect(() => {
        // Load initial visited states
        const visited = StorageService._getVisitedSections()
        setVisitedState(visited)
    }, [])

    const handleVisit = (id) => {
        const isNew = StorageService.markSectionVisited(id)
        if (isNew) {
            setVisitedState(prev => ({ ...prev, [id]: true }))
        }
    }

    const modes = [
        { id: 'pageRecognition', icon: 'bi-search', label: 'تعرف على الصفحة' },
        { id: 'sequence', icon: 'bi-sort-numeric-down', label: 'الترتيب' },
        { id: 'prevNext', icon: 'bi-arrow-left-right', label: 'السابق واللاحق' },
        { id: 'firstAyah', icon: 'bi-arrow-up-circle', label: 'ما الأول' },
        { id: 'lastAyah', icon: 'bi-arrow-down-circle', label: 'ما الأخير' },
        { id: 'ayahToNumber', icon: 'bi-hash', label: 'رقم الآية' },
        { id: 'numberToAyah', icon: 'bi-card-text', label: 'الآية من الرقم' },
        { id: 'linksQuiz', icon: 'bi-question-circle', label: 'اختبار الروابط', isLocked: lockedModes.linksQuiz },
    ]

    const tools = [
        { id: 'themes', icon: 'bi-collection', label: 'المواضيع', action: () => { handleVisit('themes'); onShowThemes() }, isLocked: lockedModes.themes },
        { id: 'linksView', icon: 'bi-eye', label: 'عرض الروابط', action: () => { handleVisit('linksView'); onStartMode('linksView') }, isLocked: lockedModes.linksView },
        { id: 'mutashabihat', icon: 'bi-stars', label: 'المتشابهات', action: () => { handleVisit('mutashabihat'); onShowMutashabihat() }, isLocked: lockedModes.mutashabihat },
    ]

    // Developer Tools (Only during local development, will NOT be included in production build)
    const isDev = import.meta.env.DEV
    const isElectron = !!window.electronAPI

    const handleRunBuild = async () => {
        if (isElectron) {
            const success = await window.electronAPI.runBuild()
            if (success === false) {
                alert('❌ فشل تشغيل عملية البناء. تأكد من وجود ملف build_everything.bat')
            }
        } else {
            // Fallback for browser (works because of our Vite plugin)
            try {
                const res = await fetch('/api/run-build')
                const data = await res.json()
                if (!data.success) {
                    alert('❌ فشل تشغيل عملية البناء من السيرفر.')
                }
            } catch (e) {
                alert('⚠️ لا يمكن تشغيل البناء من المتصفح إلا في وضع التطوير (npm run dev).')
            }
        }
    }

    if (isDev) {
        tools.push({ 
            id: 'buildAll', 
            icon: 'bi-cpu-fill', 
            label: 'تحديث شامل (Build)', 
            action: handleRunBuild,
            isSpecial: true
        })
    }

    // Helper for locked state
    const isLocked = (id) => lockedModes[id]

    // Carousel Logic
    const modesScrollRef = useRef(null)
    const [scrollProgress, setScrollProgress] = useState(0)

    const handleScroll = () => {
        const el = modesScrollRef.current
        if (!el) return
        const max = el.scrollWidth - el.clientWidth
        if (max > 0) {
            const progress = Math.abs(el.scrollLeft) / max
            setScrollProgress(progress)
        }
    }

    useEffect(() => {
        const el = modesScrollRef.current
        if (el) {
            el.addEventListener('scroll', handleScroll)
            handleScroll()
        }
        return () => el?.removeEventListener('scroll', handleScroll)
    }, [])





    return (
        <div className="main-menu-v2 fade-in position-relative">
            {/* 0. Header / Greeting around the logo area usually, but here we add a welcome */}
            <div className="d-flex justify-content-between align-items-center mb-4 px-1">
                <div>
                    <div className="d-flex align-items-center gap-2">
                        <h2 className="fw-bold text-gold mb-0" style={{ fontFamily: 'var(--font-quran)' }}>أهلاً بك</h2>
                        <button
                            className={`btn btn-sm btn-outline-secondary rounded-pill px-2 py-0 ${!visitedState['contactButton'] ? 'glow-effect text-success' : ''}`}
                            style={{ fontSize: '0.7rem', height: '24px', lineHeight: '1' }}
                            onClick={() => {
                                handleVisit('contactButton');
                                onShowContact();
                            }}
                        >
                            <i className="bi bi-info-circle me-1"></i>
                            ملاحظة/تواصل
                        </button>
                    </div>
                    <small className="text-muted cheerup">استمر في مراجعة وردك اليومي</small>
                </div>
                <div className="text-center">
                    <span className="d-block h4 mb-0 fw-bold">{pagesCount}</span>
                    <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 rounded-pill">
                        صفحة محفوظة
                    </span>
                </div>
            </div>

            {/* 1. Hero Section: Core Actions */}
            <div className="hero-section">
                {/* Smart Review (Primary) */}
                <div
                    className={`hero-card blue position-relative ${lockedModes.smartReview ? 'locked-mode-btn' : 'cursor-pointer'}`}
                    onClick={() => {
                        if (!lockedModes.smartReview) {
                            handleVisit('smartReview'); 
                            onSmartReview()
                        }
                    }}
                >
                    <NotificationDot visible={!visitedState['smartReview']} />
                    <div>
                        <i className="bi bi-stars hero-icon text-info"></i>
                        <h3 className="hero-title text-white">المراجعة الذكية</h3>
                        <p className="hero-subtitle">نظام تكرار متباعد لإتقان الحفظ</p>
                    </div>
                    <div className="d-flex justify-content-end">
                        <i className="bi bi-arrow-left fs-4 text-info"></i>
                    </div>
                </div>

                {/* Regular Review & Saved Pages Group */}
                <div className="d-flex flex-column gap-3">
                    <div
                        className={`hero-card secondary flex-grow-1 position-relative ${lockedModes.regularReview ? 'locked-mode-btn' : 'cursor-pointer'}`}
                        onClick={() => {
                            if (!lockedModes.regularReview) {
                                handleVisit('regularReview'); 
                                onRegularReview()
                            }
                        }}
                        style={{ minHeight: 'auto' }}
                    >
                        <NotificationDot visible={!visitedState['regularReview']} />
                        <div className="d-flex justify-content-between align-items-center">
                            <div>
                                <h5 className="mb-1 fw-bold text-white">المراجعة العادية</h5>
                                <small className="text-muted">تصفح المصحف</small>
                            </div>
                            <i className="bi bi-book-half fs-3 text-success"></i>
                        </div>
                    </div>

                    <div
                        className="hero-card flex-grow-1 cursor-pointer position-relative"
                        onClick={() => { handleVisit('pagesList'); onShowPages() }}
                        style={{ minHeight: 'auto', background: 'var(--bg-card)' }}
                    >
                        <NotificationDot visible={!visitedState['pagesList']} size="large" />
                        <div className="d-flex justify-content-between align-items-center">
                            <div>
                                <h5 className="mb-1 fw-bold text-white">سجل الحفظ</h5>
                                <small className="text-muted">إدارة الصفحات</small>
                            </div>
                            <i className="bi bi-journal-bookmark fs-3 text-info"></i>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. Challenge Belt (Horizontal Scroll on Mobile) */}
            <div className="mt-4 mb-2">
                <div className="section-header">
                    <span className="section-label">أوضاع التحدي</span>
                    <div className="section-line"></div>
                </div>

                <div className="horizontal-scroll-snap challenge-flex" ref={modesScrollRef} onScroll={handleScroll}>
                    {modes.map(mode => (
                        <div key={mode.id} className="snap-item">
                            <button
                                className={`bento-card w-100 position-relative ${isLocked(mode.id) || mode.isLocked ? 'locked-mode-btn' : ''}`}
                                onClick={() => { handleVisit(mode.id); onStartMode(mode.id) }}
                                disabled={isLocked(mode.id) || mode.isLocked}
                            >
                                <NotificationDot visible={!visitedState[mode.id]} />
                                <i className={`bi ${mode.icon} bento-icon`}></i>
                                <span className="bento-title">{mode.label}</span>
                            </button>
                        </div>
                    ))}
                </div>

                {/* Mobile Slider Indicator */}
                <div className="d-flex d-md-none justify-content-center mt-3" dir="ltr">
                    <div className="scroll-indicator-track">
                        <div
                            className="scroll-indicator-thumb"
                            style={{
                                left: `${Math.min(65, Math.max(0, scrollProgress * 65))}%`
                            }}
                        ></div>
                    </div>
                </div>
            </div>



            {/* 3. Tools Grid (Bento) */}
            <div className="mt-4">
                <div className="section-header">
                    <span className="section-label">أدوات مساعدة</span>
                    <div className="section-line"></div>
                </div>

                <div className="bento-grid">
                    {tools.map(tool => (
                        <button
                            key={tool.id}
                            className={`bento-card w-100 position-relative ${tool.isLocked ? 'locked-mode-btn' : ''}`}
                            onClick={tool.action}
                            disabled={tool.isLocked}
                        >
                            <NotificationDot visible={!visitedState[tool.id]} />
                            <i className={`bi ${tool.icon} bento-icon`} style={{ color: tool.isSpecial ? 'var(--info)' : (tool.id === 'mutashabihat' ? 'var(--warning)' : '') }}></i>
                            <span className="bento-title" style={{ color: tool.isSpecial ? 'var(--info)' : '' }}>{tool.label}</span>
                        </button>
                    ))}
                </div>
            </div>
            {/* Tutorial Overlay */}

        </div >
    )
}

export default MainMenu
