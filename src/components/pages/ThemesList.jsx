import { useState, useEffect, useRef } from 'react'
import BackButton from '../ui/BackButton'
import { THEMES_DATA, SURAH_STRUCTURE } from '../../data/themes'
import StorageService from '../../services/storage'
import { numberToArabicIndic } from '../../utils/javascUtil/gameUtils'
import AyahSeparator from '../ui/AyahSeparator'
import ReviewEngine from '../game/engine/ReviewEngine'

function ThemeCard({ theme, selectedFont }) {
    const [verses, setVerses] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let isMounted = true
        const fetchVerses = async () => {
            setLoading(true)
            if (!StorageService.isDataLoaded()) {
                await StorageService.init()
            }
            const hydrated = theme.verses.map(v => {
                const ayahData = StorageService.getAyahBySurahAndNumber(v.surah, v.ayah)
                return {
                    ...v,
                    text: ayahData ? ayahData.text : '...جاري التحميل...'
                }
            })
            if (isMounted) {
                setVerses(hydrated)
                setLoading(false)
            }
        }
        fetchVerses()
        return () => { isMounted = false }
    }, [theme])

    if (loading) {
        return (
            <div className="card bg-dark border-gold shadow-lg mb-4 w-100 text-center p-5">
                <div className="spinner-border text-gold" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        )
    }

    const fontFamilies = {
        'Amiri Quran': "'Amiri Quran'",
        'Scheherazade New': "'Scheherazade New'",
        'Hafs': "'Hafs'"
    }
    const actualFont = fontFamilies[selectedFont] || selectedFont

    return (
        <div className="card bg-dark border-gold shadow-lg mb-4 w-100" style={{ borderRadius: '12px', overflow: 'hidden' }}>
            <div className="card-header bg-transparent border-gold d-flex justify-content-between align-items-center py-2">
                <span className="text-gold fw-bold">
                    <i className="bi bi-journal-text me-1"></i>
                    {theme.title}
                </span>
                <span className="badge bg-secondary bg-opacity-25 text-gold">{theme.verses.length} آية</span>
            </div>
            <div className="card-body p-4 p-md-5">
                <div
                    className="quran-text"
                    style={{
                        direction: 'rtl',
                        textAlign: 'center',
                        lineHeight: '2.8',
                        fontSize: '1.5rem',
                        fontFamily: actualFont
                    }}
                >
                    {verses.map((v, i) => (
                        <span key={i} className="position-relative d-inline">
                            <span style={{ padding: '0 2px' }}>
                                {v.text}
                            </span>
                            <AyahSeparator number={v.ayah} className="text-gold me-1 ms-1" />
                        </span>
                    ))}
                </div>
            </div>
        </div>
    )
}

function ThemesList({ onBack, registerBackHandler, pushInternalState }) {
    const [viewLevel, setViewLevel] = useState('surahs') // 'surahs', 'sections', 'themes', 'detail'
    const [selectedSurah, setSelectedSurah] = useState(null)
    const [selectedSection, setSelectedSection] = useState(null)
    const [selectedTheme, setSelectedTheme] = useState(null)

    // Themes Settings
    const [mode, setMode] = useState(() => {
        try {
            return localStorage.getItem('themesMode') || 'flip'
        } catch (e) {
            console.warn('[ThemesList] Failed to read themesMode from localStorage', e)
            return 'flip'
        }
    })
    const [selectedFont, setSelectedFont] = useState(() => {
        try {
            return localStorage.getItem('themesFont') || 'Amiri Quran'
        } catch (e) {
            console.warn('[ThemesList] Failed to read themesFont from localStorage', e)
            return 'Amiri Quran'
        }
    })
    const [showSettings, setShowSettings] = useState(false)
    const engineRef = useRef(null)

    const quranFonts = [
        { id: 'Amiri Quran', name: 'الأميري (قرآن)', family: "'Amiri Quran'" },
        { id: 'Scheherazade New', name: 'شهرزاد (عادي)', family: "'Scheherazade New'" },
        { id: 'Hafs', name: 'خط حفص (محلي)', family: "'Hafs'" }
    ]

    const changeMode = (newMode) => {
        setMode(newMode)
        try {
            localStorage.setItem('themesMode', newMode)
        } catch (e) {
            console.warn('[ThemesList] Failed to write themesMode to localStorage', e)
        }
    }

    const handleFontChange = (e) => {
        const font = e.target.value
        setSelectedFont(font)
        try {
            localStorage.setItem('themesFont', font)
        } catch (e) {
            console.warn('[ThemesList] Failed to write themesFont to localStorage', e)
        }
    }

    // Register hardware back handler
    useEffect(() => {
        if (registerBackHandler) {
            registerBackHandler.current = () => {
                if (viewLevel !== 'surahs') {
                    // This is called by App's popstate listener.
                    // The browser has already moved back, so we just update our UI.
                    handleBackInternal()
                    return true // Intercepted
                }
                return false // Let App handle it (exit to menu)
            }
        }
        return () => { if (registerBackHandler) registerBackHandler.current = null }
    }, [viewLevel, selectedSurah, selectedSection, selectedTheme]) // Update when state changes

    const handleBackInternal = () => {
        if (viewLevel === 'detail') {
            setViewLevel('themes')
            setSelectedTheme(null)
        } else if (viewLevel === 'themes') {
            setViewLevel('sections')
            setSelectedSection(null)
        } else if (viewLevel === 'sections') {
            setViewLevel('surahs')
            setSelectedSurah(null)
        }
    }

    const handleBackUI = () => {
        if (viewLevel === 'surahs') {
            onBack()
        } else {
            // Tell browser to go back. This will trigger popstate, which calls handleBackInternal.
            window.history.back()
        }
    }

    // Helper to check if a theme is unlocked
    const checkThemeUnlocked = (theme) => {
        const allPages = StorageService.getSortedPages()
        const memorizedIds = new Set(StorageService.getMemorizedPageIds())

        // Find all pages that contain any of the theme's verses
        const pagesNeeded = new Set()
        theme.verses.forEach(v => {
            const matchedPage = allPages.find(p => 
                p.surahId === v.surah && p.ayahs.some(a => a.number === v.ayah)
            )
            if (matchedPage) {
                pagesNeeded.add(matchedPage.id)
            }
        })

        if (pagesNeeded.size === 0) return { unlocked: false, pages: [], pageNumbers: [] }
        
        const missingPages = Array.from(pagesNeeded).filter(id => !memorizedIds.has(id))
        const unlocked = missingPages.length === 0

        const pageNumbers = Array.from(pagesNeeded).map(id => {
            const chunk = allPages.find(p => p.id === id)
            return chunk ? chunk.pageNumber : null
        }).filter(Boolean).sort((a, b) => a - b)

        return { unlocked, missingPages, pageNumbers }
    }

    // Helper for drilling down
    const drillDown = (level, setter, value) => {
        setter(value)
        setViewLevel(level)
        if (pushInternalState) pushInternalState()
    }

    const getThemeContext = (sectionId) => {
        for (const surah of SURAH_STRUCTURE) {
            const section = surah.sections.find(s => s.id === sectionId)
            if (section) {
                return { surah, section }
            }
        }
        return { surah: null, section: null }
    }

    // Keyboard Navigation
    useEffect(() => {
        if (viewLevel !== 'detail' || mode !== 'flip') return
        const handleKey = (e) => {
            if (e.key === 'ArrowRight') engineRef.current?.goToPrev()
            if (e.key === 'ArrowLeft') engineRef.current?.goToNext()
        }
        window.addEventListener('keydown', handleKey)
        return () => window.removeEventListener('keydown', handleKey)
    }, [viewLevel, mode])

    const renderSurahs = () => (
        <div className="row g-4 mt-2">
            {SURAH_STRUCTURE.map(surah => (
                <div key={surah.id} className="col-12">
                    <div
                        className="card bg-dark border-info hover-gold cursor-pointer"
                        onClick={() => drillDown('sections', setSelectedSurah, surah)}
                    >
                        <div className="card-body d-flex justify-content-between align-items-center py-4">
                            <h3 className="mb-0 text-white">{surah.name}</h3>
                            <div className="text-info">
                                <span className="me-2">{surah.sections.length} أقسام</span>
                                <i className="bi bi-chevron-left"></i>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )

    const renderSections = () => (
        <div className="row g-4 mt-2">
            {selectedSurah.sections.map(section => (
                <div key={section.id} className="col-md-6">
                    <div
                        className="card h-100 bg-dark border-secondary hover-gold cursor-pointer"
                        onClick={() => drillDown('themes', setSelectedSection, section)}
                    >
                        <div className="card-body">
                            <h5 className="text-white mb-2">{section.title}</h5>
                            <div className="d-flex justify-content-between align-items-center mt-3">
                                <span className="badge bg-secondary">الآيات: {section.range}</span>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )

    const renderThemes = () => {
        const filteredThemes = THEMES_DATA.filter(t => t.sectionId === selectedSection.id)
        return (
            <div className="row g-4 mt-2">
                {filteredThemes.map(theme => {
                    const { unlocked, pageNumbers } = checkThemeUnlocked(theme)
                    return (
                        <div key={theme.id} className="col-md-6 col-lg-4">
                            <div
                                className={`card h-100 bg-dark border-secondary ${unlocked ? 'hover-gold cursor-pointer' : 'opacity-50'}`}
                                onClick={() => {
                                    if (unlocked) {
                                        drillDown('detail', setSelectedTheme, theme)
                                    }
                                }}
                            >
                                <div className="card-body d-flex flex-column justify-content-between">
                                    <div>
                                        <h6 className="card-title text-white mb-2">
                                            {!unlocked && <i className="bi bi-lock-fill text-warning me-1"></i>}
                                            {theme.title}
                                        </h6>
                                        <p className="card-text text-muted small mb-3">{theme.description}</p>
                                    </div>
                                    <div className="d-flex justify-content-between align-items-center mt-3">
                                        <span className="badge bg-warning text-dark rounded-pill">
                                            {theme.verses.length} آية
                                        </span>
                                        {!unlocked && (
                                            <span className="text-warning small" style={{ fontSize: '0.75rem' }}>
                                                صفحات: {pageNumbers.join('، ')}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        )
    }

    const renderDetail = () => {
        const unlockedThemes = THEMES_DATA.filter(theme => checkThemeUnlocked(theme).unlocked)
        const initialIndex = unlockedThemes.findIndex(t => t.id === selectedTheme?.id)
        const currentIndex = initialIndex !== -1 ? initialIndex : 0

        const hasPrev = currentIndex > 0
        const hasNext = currentIndex < unlockedThemes.length - 1

        const handleIndexChange = (idx) => {
            const newTheme = unlockedThemes[idx]
            if (newTheme) {
                setSelectedTheme(newTheme)
                const { surah, section } = getThemeContext(newTheme.sectionId)
                if (surah) setSelectedSurah(surah)
                if (section) setSelectedSection(section)
            }
        }

        return (
            <div className="themes-detail-view fade-in d-flex flex-column animate-slide-up" style={{ height: 'calc(100vh - 140px)' }}>
                {/* Header for Detail */}
                <div className="page-header sticky-top bg-dark py-2 d-flex justify-content-between align-items-center" style={{ zIndex: 10 }}>
                    <BackButton onClick={handleBackUI} direction="left" />
                    <div className="text-center flex-grow-1">
                        <h2 className="page-title mb-1" style={{ fontSize: '1.2rem' }}>{selectedTheme.title}</h2>
                        <span className="badge bg-secondary">{selectedTheme.verses.length} آية</span>
                    </div>
                    <button className="btn btn-outline-secondary btn-sm me-2"
                        onClick={() => setShowSettings(!showSettings)} title="إعدادات العرض">
                        <i className="bi bi-gear"></i>
                    </button>
                </div>

                {/* Settings Panel */}
                {showSettings && (
                    <div className="card bg-dark border-secondary mb-3 fade-in mx-2">
                        <div className="card-body p-3">
                            <h6 className="text-gold mb-2"><i className="bi bi-display me-1"></i> إعدادات العرض</h6>
                            <div className="row g-3">
                                <div className="col-6">
                                    <label className="form-label text-muted small mb-1">نمط العرض</label>
                                    <div className="d-flex gap-2">
                                        <button className={`btn btn-sm flex-grow-1 ${mode === 'flip' ? 'btn-warning' : 'btn-outline-secondary'}`}
                                            onClick={() => changeMode('flip')}>
                                            <i className="bi bi-book me-1"></i> تقليب
                                        </button>
                                        <button className={`btn btn-sm flex-grow-1 ${mode === 'scroll' ? 'btn-warning' : 'btn-outline-secondary'}`}
                                            onClick={() => changeMode('scroll')}>
                                            <i className="bi bi-arrow-down me-1"></i> تمرير
                                        </button>
                                    </div>
                                </div>
                                <div className="col-6">
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

                {/* ReviewEngine for Themes */}
                <div className="flex-grow-1 position-relative overflow-hidden" style={{ height: '0', minHeight: '0' }}>
                    <ReviewEngine
                        ref={engineRef}
                        pages={unlockedThemes}
                        initialIndex={currentIndex}
                        viewMode={mode === 'scroll' ? 'vertical' : 'horizontal'}
                        onIndexChange={handleIndexChange}
                        renderPage={(theme, isActive) => (
                            <div className={`d-flex flex-column w-100 ${mode === 'scroll' ? 'mb-4' : ''}`} style={{ minHeight: '100%' }}>
                                <ThemeCard theme={theme} selectedFont={selectedFont} />
                                
                                {mode === 'scroll' && unlockedThemes[unlockedThemes.length - 1].id === theme.id && (
                                    <div className="text-center py-5">
                                        <i className="bi bi-check-circle-fill text-success fs-1 mb-3 d-block"></i>
                                        <p className="text-gold fs-5">نهاية الحفظ</p>
                                    </div>
                                )}
                            </div>
                        )}
                    />
                </div>

                {/* Navigation Footer for Flip Mode */}
                {mode === 'flip' && (
                    <div className="p-3 bg-dark border-top border-secondary">
                        <div className="d-flex justify-content-between align-items-center">
                            <button
                                className="btn btn-outline-secondary btn-sm"
                                disabled={!hasPrev}
                                onClick={() => engineRef.current?.goToPrev()}
                            >
                                <i className="bi bi-arrow-right me-1"></i>
                                {hasPrev ? 'الموضوع السابق' : 'بداية الحفظ'}
                            </button>

                            <button
                                className="btn btn-warning btn-sm px-4"
                                onClick={() => {
                                    if (hasNext) {
                                        engineRef.current?.goToNext()
                                    } else {
                                        handleBackUI()
                                    }
                                }}
                            >
                                {hasNext ? (
                                    <span>
                                        الموضوع التالي
                                        <i className="bi bi-arrow-left ms-1"></i>
                                    </span>
                                ) : (
                                    <span>
                                        إنهاء
                                        <i className="bi bi-check-circle ms-1"></i>
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        )
    }

    // --- Main Layout ---

    const containerStyle = viewLevel === 'detail'
        ? { maxWidth: '1000px', height: 'calc(100vh - 60px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }
        : { maxWidth: '1000px' }

    return (
        <div className="themes-list fade-in container" style={containerStyle}>
            {viewLevel !== 'detail' && (
                <div className="page-header mt-3">
                    <BackButton onClick={handleBackUI} direction="left" />
                    <div className="mx-3 flex-grow-1">
                        <nav aria-label="breadcrumb">
                            <ol className="breadcrumb mb-0">
                                <li className={`breadcrumb-item ${viewLevel === 'surahs' ? 'active text-gold' : ''}`} onClick={() => { setViewLevel('surahs'); setSelectedSurah(null); setSelectedSection(null); }}>
                                    مواضيع الحفظ
                                </li>
                                {selectedSurah && (
                                    <li className={`breadcrumb-item ${viewLevel === 'sections' ? 'active' : ''}`} onClick={() => { setViewLevel('sections'); setSelectedSection(null); }}>
                                        {selectedSurah.name}
                                    </li>
                                )}
                                {selectedSection && (
                                    <li className={`breadcrumb-item active text-info`}>
                                        {selectedSection.title}
                                    </li>
                                )}
                            </ol>
                        </nav>
                        {viewLevel === 'surahs' && <h2 className="page-title mt-2">اختر السورة</h2>}
                        {viewLevel === 'sections' && <h2 className="page-title mt-2">اختر القسم</h2>}
                        {viewLevel === 'themes' && <h2 className="page-title mt-2">اختر الموضوع</h2>}
                    </div>
                </div>
            )}

            {viewLevel === 'surahs' && renderSurahs()}
            {viewLevel === 'sections' && renderSections()}
            {viewLevel === 'themes' && renderThemes()}
            {viewLevel === 'detail' && renderDetail()}
        </div>
    )
}

export default ThemesList
