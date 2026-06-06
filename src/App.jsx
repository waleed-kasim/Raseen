import { useState, useEffect, useCallback, useRef } from 'react'
import MainMenu from './components/ui/MainMenu'
import GameArea from './components/game/GameArea'
import PagesList from './components/pages/PagesList'
import SettingsPage from './components/pages/SettingsPage'

import ThemesList from './components/pages/ThemesList'
import MutashabihatTrainer from './components/pages/MutashabihatTrainer'
import MaskedReview from './components/game/MaskedReview'
import RegularReview from './components/game/RegularReview'
import ToastNotification from './components/ui/ToastNotification'
import { StorageService } from './services/storage'

import FirstTimeModal from './components/ui/FirstTimeModal'
import mutashabihatVerses from './data/mutashabihat_verses.json'

function App() {
  // App State
  const [currentView, setCurrentView] = useState('menu') // menu, game, pages
  const [currentMode, setCurrentMode] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showFirstTimeModal, setShowFirstTimeModal] = useState(false)

  // Game State
  const [score, setScore] = useState({ correct: 0, wrong: 0 })

  // Toast State
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' })

  // Pages count for button states
  const [pagesCount, setPagesCount] = useState(0)

  // Initialize - Load data from JSON
  useEffect(() => {
    async function loadData() {
      setIsLoading(true)
      await StorageService.init()
      updatePagesCount()

      // Check for first time launch
      if (StorageService.isFirstTimeAppLaunch()) {
        setShowFirstTimeModal(true)
      }

      setIsLoading(false)
    }
    loadData()
  }, [])

  const handleFirstTimeModalClose = () => {
    StorageService.setAppLaunched()
    setShowFirstTimeModal(false)
  }

  const updatePagesCount = () => {
    // Count unique physical pages instead of raw chunks (which may overcount if a page has multiple surahs)
    const pages = StorageService.getMemorizedPages()
    const uniquePageNumbers = new Set(pages.map(p => p.pageNumber))
    setPagesCount(uniquePageNumbers.size)
  }

  // Navigation & History Management
  const backHandlerRef = useRef(null)

  const goToMenu = useCallback(() => {
    updatePagesCount()
    setCurrentView('menu')
    setCurrentMode(null)
    setScore({ correct: 0, wrong: 0 })
    backHandlerRef.current = null // Reset handler
  }, [])

  // Functional helper for sub-components to push history states for deep navigation
  const pushInternalState = useCallback(() => {
    window.history.pushState({ view: currentView, internal: true }, '')
  }, [currentView])

  // Handle Hardware Back Button (Mobile)
  useEffect(() => {
    const handlePopState = (e) => {
      // If we are in a subview, the back button should take us back internally or to menu
      if (currentView !== 'menu') {
        if (backHandlerRef.current && typeof backHandlerRef.current === 'function') {
          if (backHandlerRef.current()) return // Sub-view handled it
        }
        goToMenu()
      }
      // If we are on menu, we do nothing - browser will follow default behavior (exit if no history)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [currentView, goToMenu])

  // Sync browser history state with currentView
  useEffect(() => {
    if (currentView !== 'menu') {
      window.history.pushState({ view: currentView }, '')
    }
  }, [currentView])

  // Validation Logic - matches each mode's internal requirements exactly
  const checkRequirements = (mode) => {
    // Themes and Mutashabihat can always be browsed/studied
    if (['themes', 'mutashabihat'].includes(mode)) {
      return { ok: true }
    }

    const pages = StorageService.getMemorizedPages()

    // 1. Basic: all modes need at least 1 page
    if (pages.length === 0) {
      return { ok: false, msg: 'يجب حفظ صفحة واحدة على الأقل لاستخدام هذا الوضع.' }
    }

    // 2. Sequence: needs 2+ unique physical pages
    if (mode === 'sequence') {
      const uniquePageNums = new Set(pages.map(p => p.pageNumber))
      if (uniquePageNums.size < 2) {
        return { ok: false, msg: 'يتطلب هذا الوضع حفظ صفحتين فيزيائيتين مختلفتين على الأقل.' }
      }
    }

    // 3. PrevNext: needs 3 pages (relaxed from strict consecutive)
    if (mode === 'prevNext') {
      if (pages.length < 3) {
        return { ok: false, msg: 'يتطلب هذا الوضع حفظ ٣ صفحات على الأقل.' }
      }
      // We rely on the Game Mode to handle finding neighbors or showing partial questions
    }

    // 4. FirstAyah / LastAyah: need pages with more than 1 ayah
    if (['firstAyah', 'lastAyah'].includes(mode)) {
      const compositePages = StorageService.getCompositeMemorizedPages().filter(p => p.isFullyMemorized)
      const validPages = compositePages.filter(p => p.ayahs && p.ayahs.length > 1)
      if (validPages.length === 0) {
        return { ok: false, msg: 'لا توجد صفحات محفوظة بالكامل بآيات كافية (تحتاج صفحة بأكثر من آية واحدة).' }
      }
    }

    // 5. AyahToNumber / NumberToAyah: need pages with ayahs
    if (['ayahToNumber', 'numberToAyah'].includes(mode)) {
      const validPages = pages.filter(p => p.ayahs && p.ayahs.length > 0)
      if (validPages.length === 0) {
        return { ok: false, msg: 'لا توجد صفحات محفوظة تحتوي على آيات.' }
      }
    }

    // 6. Links: needs 2 consecutive physical pages sharing the same Surah at the boundary
    if (['linksView', 'linksQuiz'].includes(mode)) {
      const compositePages = StorageService.getCompositeMemorizedPages().filter(p => p.isFullyMemorized)
      const sortedPages = [...compositePages].sort((a, b) => a.pageNumber - b.pageNumber)
      let hasLink = false
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
              hasLink = true;
              break;
            }
          }
        }
      }
      if (!hasLink) {
        return { ok: false, msg: 'يتطلب هذا الوضع حفظ صفحتين متتاليتين على الأقل متصلتين بنفس السورة.' }
      }
    }

    return { ok: true }
  }

  // Compute which modes are locked based on current data
  const getLockedModes = () => {
    const allModeIds = [
      'pageRecognition', 'sequence', 'prevNext', 'firstAyah', 'lastAyah',
      'ayahToNumber', 'numberToAyah', 'linksView', 'linksQuiz',
      'mutashabihat', 'smartReview', 'regularReview', 'themes'
    ]
    const locked = {}
    allModeIds.forEach(id => {
      const check = checkRequirements(id === 'smartReview' ? 'masked-review' : id === 'regularReview' ? 'regular-review' : id)
      locked[id] = !check.ok
    })
    return locked
  }

  const startMode = useCallback((modeName) => {
    const check = checkRequirements(modeName)
    if (!check.ok) {
      showToast(check.msg, 'warning')
      return
    }

    setCurrentMode(modeName)
    setCurrentView('game')
    setScore({ correct: 0, wrong: 0 })
  }, [])

  const handleStartReview = (type) => {
    const check = checkRequirements(type) // type is just for validation key
    if (!check.ok) {
      showToast(check.msg, 'warning')
      return
    }
    setCurrentView(type) // 'regular-review' or 'masked-review'
  }

  const handleShowMutashabihat = () => {
    const check = checkRequirements('mutashabihat')
    if (!check.ok) {
      showToast(check.msg, 'warning')
      return
    }
    setCurrentView('mutashabihat')
  }

  const handleShowThemes = () => {
    const check = checkRequirements('themes')
    if (!check.ok) {
      showToast(check.msg, 'warning')
      return
    }
    setCurrentView('themes')
  }

  const showPages = () => {
    updatePagesCount()
    setCurrentView('pages')
  }

  // Score
  const updateScore = useCallback((isCorrect) => {
    setScore(prev => ({
      ...prev,
      correct: isCorrect ? prev.correct + 1 : prev.correct,
      wrong: !isCorrect ? prev.wrong + 1 : prev.wrong
    }))
  }, [])

  // Toast
  const showToast = useCallback((message, type = 'info') => {
    setToast({ show: true, message, type })
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }))
    }, 3000)
  }, [])

  // Loading screen
  if (isLoading) {
    return (
      <div className="d-flex align-items-center justify-content-center min-vh-100">
        <div className="text-center">
          <div className="spinner-border text-warning mb-3" role="status">
            <span className="visually-hidden">جاري التحميل...</span>
          </div>
          <p className="text-gold">جاري تحميل بيانات القرآن...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Background Pattern - Hardcoded to Pattern 1 */}
      <div className="bg-pattern pattern-1"></div>

      {/* First Time Modal */}
      {showFirstTimeModal && (
        <FirstTimeModal onClose={handleFirstTimeModalClose} />
      )}

      {/* Mutashabihat Trainer - FULL SCREEN (outside container) */}
      {currentView === 'mutashabihat' && (
        <MutashabihatTrainer onBack={goToMenu} />
      )}

      {/* Masked Review - FULL SCREEN */}
      {currentView === 'masked-review' && (
        <MaskedReview
          onBack={goToMenu}
          showToast={showToast}
        />
      )}

      {/* Regular Review - FULL SCREEN */}
      {currentView === 'regular-review' && (
        <RegularReview
          onBack={goToMenu}
          showToast={showToast}
        />
      )}

      {/* Main Container - hidden when full screen modes are active */}
      {currentView !== 'mutashabihat' && currentView !== 'masked-review' && currentView !== 'regular-review' && (
        <div className="container py-3 py-md-4">


          {/* Main Menu */}
          {currentView === 'menu' && (
            <MainMenu
              pagesCount={pagesCount}
              onStartMode={startMode}
              onShowPages={showPages}
              lockedModes={getLockedModes()}
              onSmartReview={() => handleStartReview('masked-review')}
              onRegularReview={() => handleStartReview('regular-review')}
              onShowThemes={handleShowThemes}
              onShowMutashabihat={handleShowMutashabihat}
              onShowContact={() => setShowFirstTimeModal(true)}
            />
          )}

          {/* Game Area */}
          {currentView === 'game' && (
            <GameArea
              mode={currentMode}
              score={score}
              onUpdateScore={updateScore}
              onBack={goToMenu}
              showToast={showToast}
            />
          )}



          {/* Themes List */}
          {currentView === 'themes' && (
            <ThemesList
              onBack={goToMenu}
              registerBackHandler={backHandlerRef}
              pushInternalState={pushInternalState}
            />
          )}

          {/* Pages List Selector */}
          {currentView === 'pages' && (
            <PagesList
              onBack={goToMenu}
              registerBackHandler={backHandlerRef}
              pushInternalState={pushInternalState}
            />
          )}

          {/* Settings Page */}
            {currentView === 'settings' && (
              <SettingsPage
                onBack={goToMenu}
                registerBackHandler={backHandlerRef}
                pushInternalState={pushInternalState}
                showToast={showToast}
              />
            )}
        </div>
      )}

      {/* Toast */}
      <ToastNotification
        show={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast(prev => ({ ...prev, show: false }))}
      />
    </>
  )
}

export default App
