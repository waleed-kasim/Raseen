import { useState, useEffect, useRef, useCallback } from 'react'
import { annotationService } from '../../services/annotations'
import AnnotationContextMenu from './AnnotationContextMenu'
import AnnotationInputModal from './AnnotationInputModal'
import AnnotationTooltip from './AnnotationTooltip'
import MobileAnnotationViewer from './MobileAnnotationViewer'
import AnnotationToast from './AnnotationToast'
import AyahSeparator from './AyahSeparator'
import { toArabicIndic } from '../../utils/javascUtil/arabicUtils'
import mutashabihatPhrases from '../../data/mutashabihat_phrases.json'
import mutashabihatVerses from '../../data/mutashabihat_verses.json'
import { StorageService } from '../../services/storage'
import { calculateCCI, getLCSIndices, normalizeArabic } from '../../utils/similarity'

function WordRenderer({ ayahs, surahId, pageId, fontFamily, fontWeight, fontStyle, onJumpToPageNumber }) {
    // State
    const [annotations, setAnnotations] = useState({})
    const [selectedWordIds, setSelectedWordIds] = useState(new Set())
    const [contextMenu, setContextMenu] = useState(null) // { x, y }
    const [tooltip, setTooltip] = useState(null) // { x, y, wordId, annotation }
    const [mobileViewer, setMobileViewer] = useState(null) // { annotation }
    const [mobileToast, setMobileToast] = useState(null) // { annotations, position }
    const [inputModal, setInputModal] = useState({ show: false, type: null, initialValue: '', capturedWordIds: [] })
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
    const [mobileAnchor, setMobileAnchor] = useState(null)
    const [activeMutashabihah, setActiveMutashabihah] = useState(null)
    const [highlightablePhrases, setHighlightablePhrases] = useState(new Set())

    const getMutashabihahPhrase = useCallback((ayahNum, wordIdx) => {
        const key = `${surahId}:${ayahNum}`
        const phraseIds = mutashabihatVerses[key]
        if (!phraseIds) return null
        
        for (const phraseId of phraseIds) {
            if (!highlightablePhrases.has(phraseId)) continue
            const phraseData = mutashabihatPhrases[phraseId]
            if (!phraseData) continue
            const ranges = phraseData.ayah[key]
            if (ranges) {
                for (const [start, end] of ranges) {
                    if (wordIdx >= start && wordIdx < end) {
                        return { phraseId, phraseData }
                    }
                }
            }
        }
        return null
    }, [surahId, highlightablePhrases])

    // Compute highlightable phrases for the current page
    useEffect(() => {
        const memorizedPageIds = new Set(StorageService.getMemorizedPageIds())
        const sortedPages = StorageService.getSortedPages()
        
        // If current page itself is not memorized, hide all mutashabihat completely
        const isCurrentPageMemorized = StorageService.isPageMemorized(pageId)
        if (!isCurrentPageMemorized) {
            setHighlightablePhrases(new Set())
            return
        }

        const active = new Set()
        
        // Gather phraseIds present in the ayahs of the current page
        const pagePhraseIds = new Set()
        ayahs.forEach(ayah => {
            const key = `${surahId}:${ayah.number}`
            const ids = mutashabihatVerses[key]
            if (ids) {
                ids.forEach(id => pagePhraseIds.add(id))
            }
        })
        
        // Only highlight if the group has at least 2 memorized occurrences
        for (const phraseId of pagePhraseIds) {
            const phraseData = mutashabihatPhrases[phraseId]
            if (phraseData) {
                const keys = Object.keys(phraseData.ayah)
                let memorizedCount = 0
                for (const key of keys) {
                    const [sId, aNum] = key.split(':').map(Number)
                    const pageObj = sortedPages.find(p => p.surahId === sId && p.ayahs.some(a => a.number === aNum))
                    if (pageObj && memorizedPageIds.has(pageObj.id)) {
                        memorizedCount++
                    }
                }
                if (memorizedCount >= 2) {
                    active.add(phraseId)
                }
            }
        }
        
        setHighlightablePhrases(active)
    }, [ayahs, surahId, pageId])

    // Refs for optimization
    const containerRef = useRef(null)
    const justSelectedRef = useRef(false)
    const longPressTimerRef = useRef(null)
    const isLongPressRef = useRef(false)

    // Load Annotations
    useEffect(() => {
        let mounted = true
        const load = async () => {
            if (!pageId) return
            try {
                const data = await annotationService.getAnnotationsForPage(pageId)
                if (mounted) {
                    if (data) {
                        setAnnotations(data)
                    } else {
                        setAnnotations({})
                    }
                }
            } catch (err) {
                console.error('Failed to load annotations:', err)
            }
        }
        load()
        return () => { mounted = false }
    }, [pageId])

    // Handle Resize
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768)
        window.addEventListener('resize', handleResize)

        // Handle native selection
        const handleSelectionChange = () => {
            // We mainly rely on mouseup/touchend, but could track state here if needed
        }

        document.addEventListener('selectionchange', handleSelectionChange)
        return () => {
            window.removeEventListener('resize', handleResize)
            document.removeEventListener('selectionchange', handleSelectionChange)
        }
    }, [])

    // Handle Text Selection Finalization
    const handleTextSelection = useCallback(() => {
        const selection = window.getSelection()
        if (!selection || selection.isCollapsed) return

        let range
        try {
            range = selection.getRangeAt(0)
        } catch (e) {
            return
        }

        const container = containerRef.current

        // Check if selection is within our container
        if (!container || !container.contains(range.commonAncestorContainer)) return

        // Find all interactive words within the range
        // Simplest robust way: iterate all words and check if they are intersected by selection

        const allWords = container.querySelectorAll('.interactive-word')
        const newSelectedIds = new Set()

        allWords.forEach(wordSpan => {
            if (selection.containsNode(wordSpan, true)) {
                newSelectedIds.add(wordSpan.getAttribute('data-word-id'))
            }
        })

        if (newSelectedIds.size > 0) {
            setSelectedWordIds(newSelectedIds)
            justSelectedRef.current = true

            // Calculate position for menu
            // const rect = range.getBoundingClientRect()
            // setContextMenu({
            //     x: rect.left + (rect.width / 2),
            //     y: rect.bottom + 10
            // })
            setContextMenu(null)

            // Clear native selection to clean up UI (we show our own highlighting)
            selection.removeAllRanges()
        }
    }, [])

    const handleWordClick = (wordId, e) => {
        e.stopPropagation()

        // If it was a long press, do nothing (handled in onTouchEnd)
        if (isLongPressRef.current) {
            isLongPressRef.current = false
            return
        }

        // Check if word has mutashabihah and selection isn't active
        const parts = wordId.split('_')
        const wordAyahNum = parseInt(parts[1])
        const wordIdx = parseInt(parts[2])
        const mutashabihahInfo = getMutashabihahPhrase(wordAyahNum, wordIdx)
        
        if (mutashabihahInfo && selectedWordIds.size === 0 && !mobileAnchor) {
            setActiveMutashabihah({
                phraseId: mutashabihahInfo.phraseId,
                currentAyahKey: `${surahId}:${wordAyahNum}`
            })
            return
        }

        // Case 1: Start Selection (First Click)
        if (!mobileAnchor) {
            setMobileAnchor(wordId)
            setSelectedWordIds(new Set([wordId]))
            setContextMenu(null) // Do NOT show menu yet
            return
        }

        // Case 2: Confirm Single Word Selection (Second Click on same word)
        if (mobileAnchor === wordId) {
            // Check if menu is already open? If so, maybe close it? 
            // Or just ensure it's open. User said "Show options if clicked twice".
            // So we open it.
            const rect = e?.target?.getBoundingClientRect() || { left: 0, bottom: 0, width: 0 }
            setContextMenu({ x: rect.left + rect.width / 2, y: rect.bottom + 10 })
            // We keep mobileAnchor set so range selection is still possible if they change their mind?
            // Actually, usually once menu is open, interaction might shift to menu. 
            return
        }

        // Case 3: Range Selection (Clicking a different word)
        const container = containerRef.current
        if (container) {
            const allWords = Array.from(container.querySelectorAll('.interactive-word'))
            const anchorIdx = allWords.findIndex(el => el.getAttribute('data-word-id') === mobileAnchor)
            const endIdx = allWords.findIndex(el => el.getAttribute('data-word-id') === wordId)

            if (anchorIdx !== -1 && endIdx !== -1) {
                const start = Math.min(anchorIdx, endIdx)
                const end = Math.max(anchorIdx, endIdx)
                const rangeIds = new Set()
                for (let i = start; i <= end; i++) {
                    rangeIds.add(allWords[i].getAttribute('data-word-id'))
                }
                setSelectedWordIds(rangeIds)
                // We keep mobileAnchor null? Or set it to null to "finish" selection state?
                // Usually range selection finishes the "anchoring" phase.
                // But we strictly want the menu now.
                // setMobileAnchor(null) // Optional: keeping it allows re-adjusting? Let's clear to be clean.

                // Wait, if I clear mobileAnchor, I can't adjust range easily. 
                // But standard behavior is usually: select -> range -> done.
                // Let's clear anchor purely to match "selection confirmed" state.
                // Actually, let's keep it consistent with previous logic which cleared it.
                setMobileAnchor(null)

                justSelectedRef.current = true
                const lastEl = allWords[endIdx] // Or middle of range? Previous logic used lastEl.
                const rect = lastEl.getBoundingClientRect()
                setContextMenu({ x: rect.left + rect.width / 2, y: rect.bottom + 10 })
            }
        }
    }

    const handleWordHover = (wordId, e) => {
        if (isMobile || selectedWordIds.size > 0) return

        const wordAnns = Object.values(annotations).filter(ann =>
            (ann.wordIds && ann.wordIds.includes(wordId)) || ann.id === wordId
        )

        if (wordAnns.length > 0) {
            setTooltip({
                x: e.clientX,
                y: e.clientY,
                wordId,
                allAnnotations: wordAnns // Pass all annotations for the word
            })
        } else {
            setTooltip(null)
        }
    }

    const handleMouseLeave = () => {
        if (!isMobile) setTooltip(null)
    }

    // Helper to get text for an ID or range
    const getAnnotationText = (ann) => {
        const ids = ann.wordIds || [ann.id] // If it's a single word annotation, its ID is the wordId
        if (!ids || ids.length === 0) return ''

        // Find text for each ID and join
        // Optimization: ids usually sorted by position? Not guaranteed.
        // But for display we can just find them.
        return ids.map(id => {
            const parts = id.toString().split('_')
            if (parts.length < 3) return ''
            const ayah = ayahs.find(a => a.number === parseInt(parts[1]))
            if (!ayah) return ''
            const words = ayah.text.split(/\s+/)
            return words[parseInt(parts[2])] || ''
        }).join(' ')
    }

    // Helper to get annotations in range with text (Deduplicated)
    const getRangeAnnotations = () => {
        const selectedIds = Array.from(selectedWordIds)
        const rangeAnns = new Set() // Use a Set to store unique annotation objects
        Object.values(annotations).forEach(ann => {
            if (ann.wordIds) {
                if (ann.wordIds.some(id => selectedIds.includes(id))) {
                    rangeAnns.add(ann)
                }
            } else if (selectedIds.includes(ann.id)) { // For single-word annotations
                rangeAnns.add(ann)
            }
        })
        return Array.from(rangeAnns).map(ann => ({ ...ann, wordText: getAnnotationText(ann) }))
    }

    // Determine active annotation for context menu (Strict Match)
    const activeAnnotation = (() => {
        if (selectedWordIds.size === 0) return null
        const ids = Array.from(selectedWordIds).sort() // Sort for consistent comparison

        // Find an annotation whose wordIds exactly match selectedWordIds
        const foundAnn = Object.values(annotations).find(ann => {
            if (!ann.wordIds) { // Single word annotation
                return ids.length === 1 && ann.id === ids[0]
            }
            // Multi-word annotation
            const annWordIdsSorted = [...ann.wordIds].sort()
            return annWordIdsSorted.length === ids.length &&
                annWordIdsSorted.every((val, index) => val === ids[index])
        })
        return foundAnn || null
    })()

    // Context Menu Actions
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

            // If there's an active annotation, update it
            if (activeAnnotation) {
                const updatedAnn = { ...activeAnnotation, difficulty: level, difficultyColor: difficultyColor }
                setAnnotations(prev => ({ ...prev, [updatedAnn.id]: updatedAnn }))
                await annotationService.saveAnnotation(updatedAnn)
            } else {
                // If no active annotation, create new annotations for each selected word
                // Or, if it's a range, create a new range annotation
                const newAnnId = `ann_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                const newAnn = {
                    id: newAnnId,
                    pageId,
                    surah: surahId,
                    wordIds: selectedIds,
                    difficulty: level,
                    difficultyColor: difficultyColor,
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

        } else if (action === 'copy') {
            // Reconstruct text from selectedIds
            const sortedIds = selectedIds.sort((a, b) => {
                const [, , idxA] = a.split('_').map(Number)
                const [, , idxB] = b.split('_').map(Number)
                return idxA - idxB
            })

            const textToCopy = sortedIds.map(id => {
                const parts = id.split('_')
                if (parts.length < 3) return ''
                const ayahNum = parseInt(parts[1])
                const wordIdx = parseInt(parts[2])
                const ayah = ayahs.find(a => a.number === ayahNum)
                if (!ayah) return ''
                const words = ayah.text.split(/\s+/)
                return words[wordIdx] || ''
            }).join(' ')

            if (textToCopy) {
                navigator.clipboard.writeText(textToCopy).then(() => {
                    // Could show a toast here?
                    console.log('Copied:', textToCopy)
                }).catch(err => console.error('Copy failed', err))
            }
            setContextMenu(null)
            setSelectedWordIds(new Set())

        } else if (action.startsWith('add-') || action.startsWith('edit-')) {
            const type = action.includes('reflection') ? 'reflection' : 'notes'
            const isEdit = action.startsWith('edit-')

            // Determine target ID for APPEND/EDIT
            let targetId = null
            let initialText = ''

            if (isEdit) {
                // Find strict match to edit
                if (activeAnnotation) {
                    targetId = activeAnnotation.id
                    initialText = activeAnnotation[type] || ''
                } else {
                    // Fallback to finding one if activeAnnotation failed?
                    // Should rely on activeAnnotation logic which matches selection.
                }
            }
            // If Add, targetId remains null (Create New)

            setInputModal({
                show: true,
                type: type, // 'reflection' or 'notes'
                initialValue: initialText,
                targetId,
                capturedWordIds: selectedIds // Capture IDs at this moment
            })
            setContextMenu(null)

            // COMPATIBILITY: Handle old 'reflection' / 'notes' actions from logic fallback if any?
            // We updated ContextMenu to use add-/edit- prefixes, so this block handles them.
        } else if (action === 'reflection' || action === 'notes') {
            // Fallback for any other callers (e.g. if we missed updating one)
            // Default to Add new? Or try to guess? 
            // Let's assume Add for safety.
            setInputModal({
                show: true,
                type: action,
                initialValue: '',
                targetId: null,
                capturedWordIds: selectedIds
            })
            setContextMenu(null)
        }
    }

    const handleInputSave = async (text) => {
        const { type, targetId, capturedWordIds } = inputModal
        // Use captured IDs if available, fallback to current selection (though selection might be gone)
        const wordIdsToUse = capturedWordIds || Array.from(selectedWordIds)

        if (wordIdsToUse.length === 0 && !targetId) {
            console.error("No words selected for annotation")
            return
        }

        let targetAnn = null
        if (targetId) {
            targetAnn = annotations[targetId]
        }

        const annId = targetId || `ann_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

        const newAnn = {
            ...(targetAnn || {}),
            id: annId,
            pageId,
            surah: surahId,
            wordIds: targetAnn ? targetAnn.wordIds : wordIdsToUse,
            // Overwrite text (Edit mode) instead of appending
            [type]: text,
            updatedAt: Date.now()
        }
        if (!targetAnn) newAnn.createdAt = Date.now()

        // Apply UI Updates
        setAnnotations(prev => ({
            ...prev,
            [annId]: newAnn
        }))

        setSelectedWordIds(new Set())
        setInputModal({ show: false, type: null, initialValue: '', capturedWordIds: [] })

        // Save DB
        await annotationService.saveAnnotation(newAnn)
    }

    const sortedAyahs = [...(ayahs || [])].sort((a, b) => a.number - b.number)

    const handleEmptyClick = (e) => {
        if (justSelectedRef.current) {
            justSelectedRef.current = false
            return
        }
        if (!e.target.closest('.interactive-word')) {
            setSelectedWordIds(new Set());
            setContextMenu(null);
            setMobileAnchor(null);
            setTooltip(null);
            setMobileToast(null);
        }
    }

    return (
        <div
            ref={containerRef}
            className="word-renderer-container"
            onMouseLeave={handleMouseLeave}
            onTouchEnd={handleTextSelection}
            onMouseUp={handleTextSelection}
            onClick={handleEmptyClick}
        >
            {sortedAyahs.map(ayah => {
                const words = ayah.text.split(/\s+/) // Split by whitespace
                return (
                    <span key={ayah.number} className="ayah-container">
                        {words.map((word, index) => {
                            if (!word) return null
                            const wordId = `${surahId}_${ayah.number}_${index}`

                            // Find all matching annotations
                            const wordAnns = Object.values(annotations).filter(ann =>
                                (ann.wordIds && ann.wordIds.includes(wordId)) || ann.id === wordId
                            )

                            const isSelected = selectedWordIds.has(wordId)
                            const isAnchor = mobileAnchor === wordId

                            // Mutashabihah check
                            const wordParts = wordId.split('_')
                            const wordAyahNum = parseInt(wordParts[1])
                            const wordIdx = parseInt(wordParts[2])
                            const mutashabihahInfo = getMutashabihahPhrase(wordAyahNum, wordIdx)
                            const hasMutashabihah = !!mutashabihahInfo

                            // Determine display flags
                            const hasDifficultyHigh = wordAnns.some(a => a.difficulty === 'high')
                            const hasDifficultyMedium = wordAnns.some(a => a.difficulty === 'medium')
                            const hasReflection = wordAnns.some(a => a.reflection)
                            const hasNote = wordAnns.some(a => a.notes)

                            // Indicators are shown based on wordAnns existence
                            let classes = 'interactive-word'
                            if (isSelected) classes += ' word-selected'
                            if (isAnchor) classes += ' word-anchor'
                            if (hasDifficultyHigh) classes += ' word-difficulty-high'
                            else if (hasDifficultyMedium) classes += ' word-difficulty-medium'
                            if (hasReflection) classes += ' word-has-reflection'
                            if (hasNote) classes += ' word-has-note'
                            if (hasMutashabihah) classes += ' word-has-mutashabihah'

                            return (
                                <span
                                    key={wordId}
                                    className={classes}
                                    data-word-id={wordId}
                                    onMouseEnter={(e) => wordAnns.length > 0 && handleWordHover(wordId, e)}
                                    // Mobile Hold Logic
                                    onTouchStart={(e) => {
                                        if (wordAnns.length > 0) {
                                            const touch = e.touches[0]
                                            const pos = { x: touch.clientX, y: touch.clientY }

                                            // Start simple timer
                                            longPressTimerRef.current = setTimeout(() => {
                                                isLongPressRef.current = true
                                                setMobileToast({ annotations: wordAnns, position: pos })
                                                // Vibration feedback if supported
                                                if (navigator.vibrate) navigator.vibrate(50)
                                            }, 500) // 500ms for long press
                                        }
                                    }}
                                    onTouchEnd={(e) => {
                                        if (longPressTimerRef.current) {
                                            clearTimeout(longPressTimerRef.current)
                                            longPressTimerRef.current = null
                                        }
                                        if (!isLongPressRef.current) {
                                            handleTextSelection() // Continue with normal selection if not long press
                                        }
                                    }}
                                    onTouchMove={() => {
                                        // Cancel long press if finger moves
                                        if (longPressTimerRef.current) {
                                            clearTimeout(longPressTimerRef.current)
                                            longPressTimerRef.current = null
                                        }
                                    }}
                                    onMouseLeave={handleMouseLeave}

                                    // onClick handles single click for word notes vs selection
                                    // If Long Press occurred, onClick event usually still fires on some browsers?
                                    // We guard it with isLongPressRef in handleWordClick
                                    onClick={(e) => {
                                        if (hasMutashabihah) {
                                            setActiveMutashabihah({
                                                phraseId: mutashabihahInfo.phraseId,
                                                currentAyahKey: `${surahId}:${ayah.number}`
                                            });
                                            e.stopPropagation();
                                            return;
                                        }
                                        handleWordClick(wordId, e);
                                    }}
                                >
                                    {word}{' '}
                                </span>
                            )
                        })}
                        <AyahSeparator number={ayah.number} />
                    </span>
                )
            })}



            {/* Context Menu */}
            {contextMenu && (
                <AnnotationContextMenu
                    position={contextMenu}
                    onOptionClick={handleMenuAction}
                    onClose={() => {
                        setContextMenu(null)
                        setSelectedWordIds(new Set())
                    }}
                    isMobile={isMobile}
                    annotation={activeAnnotation}
                    rangeAnnotations={getRangeAnnotations()}
                    selectedWordIds={selectedWordIds}
                />
            )}

            {/* Tooltip (Desktop) */}
            {tooltip && !isMobile && (
                <AnnotationTooltip
                    allAnnotations={tooltip.allAnnotations}
                    position={tooltip}
                    visible={true}
                />
            )}

            {/* Mobile Toast (Hold Preview) */}
            {mobileToast && (
                <AnnotationToast
                    annotations={mobileToast.annotations}
                    position={mobileToast.position}
                    onClose={() => setMobileToast(null)}
                />
            )}

            {/* Mobile Viewer (Bottom Sheet) - Only for explicit "View" action */}
            {mobileViewer && (
                <MobileAnnotationViewer
                    annotations={Array.isArray(mobileViewer) ? mobileViewer : null}
                    annotation={!Array.isArray(mobileViewer) ? mobileViewer : null}
                    onClose={() => setMobileViewer(null)}
                    onEdit={(item, type) => {
                        // Close viewer
                        setMobileViewer(null)
                        // Open Input Modal
                        setInputModal({
                            show: true,
                            type: type, // 'reflection' or 'notes'
                            initialValue: item[type] || '',
                            targetId: item.id,
                            capturedWordIds: item.wordIds
                        })
                    }}
                    onDelete={async (item) => {
                        if (window.confirm('هل أنت متأكد من حذف هذه الملاحظة؟')) {
                            try {
                                await annotationService.deleteAnnotation(item.id)
                                setAnnotations(prev => {
                                    const next = { ...prev }
                                    delete next[item.id]
                                    return next
                                })
                                // If viewer has more items, keep it open? Or close it?
                                // Simple logic: Close viewer to refresh state or handle list update logic
                                // But handling list update inside viewer is complex without re-fetching range annotations.
                                // Let's close for now for simplicity.
                                setMobileViewer(null)
                            } catch (err) {
                                console.error(err)
                            }
                        }
                    }}
                />
            )}

            {/* Input Modal */}
            <AnnotationInputModal
                show={inputModal.show}
                onHide={() => setInputModal({ show: false, type: null, initialValue: '' })}
                onSave={handleInputSave}
                type={inputModal.type}
                initialValue={inputModal.initialValue}
            />

            {activeMutashabihah && (
                <MutashabihatViewerModal
                    phraseId={activeMutashabihah.phraseId}
                    currentAyahKey={activeMutashabihah.currentAyahKey}
                    onClose={() => setActiveMutashabihah(null)}
                    onJumpToPage={onJumpToPageNumber}
                />
            )}

            <style>{`
                .interactive-word {
                    display: inline-block;
                    cursor: text;
                    padding: 0 1px;
                    border-radius: 4px;
                    transition: all 0.2s ease;
                    position: relative;
                    line-height: 1.6;
                    font-family: ${fontFamily || 'var(--font-quran)'}, serif;
                    font-weight: ${fontWeight || 'inherit'};
                    font-style: ${fontStyle || 'inherit'};
                    color: var(--text-quran);
                    
                    /* Tajweed and Quranic Ligatures support */
                    font-variant-ligatures: all !important;
                    font-feature-settings: "ccmp", "locl", "calt", "liga", "kern" !important;
                    font-synthesis: none;
                    text-rendering: optimizeLegibility;
                    
                    /* Prevent text selection on mobile hold */
                    -webkit-touch-callout: none;
                    -webkit-user-select: none;
                    user-select: none;
                }

                .interactive-word::selection {
                    background-color: rgba(212, 175, 55, 0.3);
                    color: white;
                }
                .aya-text {
                    /* ensure this matches index.css overrides */
                }
                .ayah-marker {
                    display: inline-block;
                    font-family: ${fontFamily || 'var(--font-quran)'}, serif;
                    font-weight: ${fontWeight || 'inherit'};
                    font-style: ${fontStyle || 'inherit'};
                    user-select: none;
                }
                .word-anchor {
                    background-color: rgba(212, 175, 55, 0.3) !important;
                    box-shadow: 0 0 0 2px var(--gold);
                    animation: anchorPulse 1.5s infinite;
                }
                .word-has-mutashabihah {
                    border-bottom: 2px dashed rgba(212, 175, 55, 0.75) !important;
                    cursor: help !important;
                }
                .word-has-mutashabihah:hover {
                    background-color: rgba(212, 175, 55, 0.15) !important;
                }
                @keyframes anchorPulse {
                    0%, 100% { box-shadow: 0 0 0 2px var(--gold); }
                    50% { box-shadow: 0 0 8px 2px var(--gold); }
                }
                .mobile-select-hint {
                    position: fixed;
                    bottom: 80px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: var(--gold);
                    color: #1a1a2e;
                    padding: 8px 20px;
                    border-radius: 20px;
                    font-size: 0.85rem;
                    font-weight: 600;
                    z-index: 1000;
                    animation: slideUp 0.3s ease;
                    white-space: nowrap;
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateX(-50%) translateY(10px); }
                    to { opacity: 1; transform: translateX(-50%) translateY(0); }
                }
            `}</style>
        </div>
    )
}

export function MutashabihatViewerModal({ phraseId, currentAyahKey, onClose, onJumpToPage }) {
    const activePhrase = mutashabihatPhrases[phraseId]
    if (!activePhrase) return null

    const srcKey = activePhrase.source.key
    const srcAyah = StorageService.getAyahBySurahAndNumber(
        parseInt(srcKey.split(':')[0]), 
        parseInt(srcKey.split(':')[1])
    )
    let phraseText = ''
    if (srcAyah) {
        const words = srcAyah.text.split(/\s+/)
        phraseText = words.slice(activePhrase.source.from, activePhrase.source.to).join(' ')
    }

    const sortedPages = StorageService.getSortedPages()
    const items = Object.keys(activePhrase.ayah).map(key => {
        const [sId, aNum] = key.split(':').map(Number)
        const ayahObj = StorageService.getAyahBySurahAndNumber(sId, aNum)
        const pageObj = sortedPages.find(p => p.surahId === sId && p.ayahs.some(a => a.number === aNum))
        const isMemorized = pageObj ? StorageService.isPageMemorized(pageObj.id) : false
        if (!isMemorized) return null // Hide completely if not memorized

        return {
            key,
            surahId: sId,
            surahName: pageObj ? pageObj.surahName : `سورة ${sId}`,
            ayahNum: aNum,
            pageNumber: pageObj ? pageObj.pageNumber : null,
            text: ayahObj ? ayahObj.text : '',
            ranges: activePhrase.ayah[key],
            isCurrent: key === currentAyahKey,
            isMemorized: true
        }
    }).filter(Boolean)

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(0, 0, 0, 0.75)', zIndex: 2000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '15px', backdropFilter: 'blur(8px)'
        }} onClick={onClose}>
            <div style={{
                background: '#1a1a2e', border: '2px solid #d4af37',
                borderRadius: '16px', width: '100%', maxWidth: '600px',
                maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
                boxShadow: '0 0 30px rgba(212, 175, 55, 0.2)'
            }} onClick={e => e.stopPropagation()}>
                <div className="p-3 border-bottom border-secondary d-flex justify-content-between align-items-center bg-dark">
                    <h5 className="text-gold mb-0 fw-bold">
                        <i className="bi bi-stars me-2"></i>
                        متشابهات: <span className="text-white">{phraseText}</span>
                    </h5>
                    <button className="btn-close btn-close-white" onClick={onClose}></button>
                </div>
                
                <div className="p-3 overflow-auto flex-grow-1 custom-scrollbar text-end" style={{ direction: 'rtl' }}>
                    <p className="text-muted small mb-3">هذه العبارة تتكرر في {items.length} مواضع محفوظة في محفوظك:</p>
                    
                    <div className="d-flex flex-column gap-3">
                        {(() => {
                            const currentAyahItem = items.find(item => item.key === currentAyahKey);
                            return items.map((item, idx) => {
                                const words = item.text.split(/\s+/)

                                // Calculate CCI score if comparing to current active ayah
                                let cardCci = null;
                                if (currentAyahItem && currentAyahItem.key !== item.key) {
                                    const score = calculateCCI(currentAyahItem.text, item.text, items.length);
                                    if (score >= 0.75) {
                                        cardCci = { label: 'تداخل حرج 🔴', color: '#ef4444' };
                                    } else if (score >= 0.40) {
                                        cardCci = { label: 'تداخل متوسط 🟡', color: '#ffc107' };
                                    } else {
                                        cardCci = { label: 'تداخل سطحي 🟢', color: '#10b981' };
                                    }
                                }

                                // Align words with the current active ayah to highlight differences
                                let lcsIndices = new Set();
                                if (currentAyahItem && currentAyahItem.key !== item.key) {
                                    const tokensCurrent = words;
                                    const tokensComparison = currentAyahItem.text.split(/\s+/);
                                    const normCurrent = tokensCurrent.map(w => normalizeArabic(w.replace(/[^\u0621-\u064A]/g, '')));
                                    const normComparison = tokensComparison.map(w => normalizeArabic(w.replace(/[^\u0621-\u064A]/g, '')));
                                    lcsIndices = getLCSIndices(normCurrent, normComparison);
                                }

                                return (
                                    <div key={idx} className="p-3 rounded-3" style={{
                                        background: item.isCurrent ? 'rgba(212, 175, 55, 0.1)' : '#111',
                                        border: item.isCurrent ? '1px solid #d4af37' : '1px solid #333'
                                    }}>
                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                            <span className="text-gold fw-bold" style={{ fontSize: '0.9rem' }}>
                                                سورة {item.surahName} : آية {item.ayahNum}
                                            </span>
                                            <div className="d-flex gap-2 align-items-center flex-wrap">
                                                {cardCci && (
                                                    <span className="badge rounded-pill animate-fade-in" style={{
                                                        backgroundColor: `${cardCci.color}15`,
                                                        color: cardCci.color,
                                                        border: `1px solid ${cardCci.color}30`,
                                                        fontSize: '0.65rem',
                                                        padding: '2px 8px'
                                                    }}>
                                                        {cardCci.label}
                                                    </span>
                                                )}
                                                {item.isCurrent && <span className="badge bg-warning text-dark small">الموضع الحالي</span>}
                                                <span className="badge bg-secondary small">
                                                    صفحة {toArabicIndic(item.pageNumber)}
                                                </span>
                                                {item.pageNumber && onJumpToPage && (
                                                    <button 
                                                        className="btn btn-sm btn-link p-0 text-decoration-none text-info"
                                                        onClick={() => {
                                                            onJumpToPage(item.pageNumber)
                                                            onClose()
                                                        }}
                                                        style={{ fontSize: '0.75rem' }}
                                                    >
                                                        انتقال ↗
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <p className="mb-0 text-white text-center" style={{ 
                                            lineHeight: '2.2', 
                                            fontSize: '1.2rem', 
                                            fontFamily: 'var(--font-quran)'
                                        }}>
                                            {words.map((word, wIdx) => {
                                                const isSharedPhrase = item.ranges.some(([start, end]) => wIdx >= start && wIdx < end)
                                                
                                                let wordStyle = {}
                                                if (isSharedPhrase) {
                                                    wordStyle = {
                                                        color: '#ef4444', // Red for shared phrase
                                                        fontWeight: 'bold',
                                                        borderBottom: '2px solid #ef4444',
                                                        textUnderlineOffset: '6px'
                                                    }
                                                } else {
                                                    wordStyle = {
                                                        color: 'inherit'
                                                    }
                                                }

                                                return (
                                                    <span key={wIdx} style={{
                                                        whiteSpace: 'nowrap',
                                                        display: 'inline-block',
                                                        transition: 'all 0.2s ease',
                                                        ...wordStyle
                                                    }}>
                                                        {word}{' '}
                                                    </span>
                                                )
                                            })}
                                        </p>
                                    </div>
                                )
                            })
                        })()}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default WordRenderer
