/**
 * Storage Service
 * Loads Quran pages from JSON file automatically
 */
import { annotationService } from './annotations'

// Surahs data - 114 Surahs
const SURAHS_DATA = [
    { id: 1, name: "الفاتحة" },
    { id: 2, name: "البقرة" },
    { id: 3, name: "آل عمران" },
    { id: 4, name: "النساء" },
    { id: 5, name: "المائدة" },
    { id: 6, name: "الأنعام" },
    { id: 7, name: "الأعراف" },
    { id: 8, name: "الأنفال" },
    { id: 9, name: "التوبة" },
    { id: 10, name: "يونس" },
    { id: 11, name: "هود" },
    { id: 12, name: "يوسف" },
    { id: 13, name: "الرعد" },
    { id: 14, name: "إبراهيم" },
    { id: 15, name: "الحجر" },
    { id: 16, name: "النحل" },
    { id: 17, name: "الإسراء" },
    { id: 18, name: "الكهف" },
    { id: 19, name: "مريم" },
    { id: 20, name: "طه" },
    { id: 21, name: "الأنبياء" },
    { id: 22, name: "الحج" },
    { id: 23, name: "المؤمنون" },
    { id: 24, name: "النور" },
    { id: 25, name: "الفرقان" },
    { id: 26, name: "الشعراء" },
    { id: 27, name: "النمل" },
    { id: 28, name: "القصص" },
    { id: 29, name: "العنكبوت" },
    { id: 30, name: "الروم" },
    { id: 31, name: "لقمان" },
    { id: 32, name: "السجدة" },
    { id: 33, name: "الأحزاب" },
    { id: 34, name: "سبأ" },
    { id: 35, name: "فاطر" },
    { id: 36, name: "يس" },
    { id: 37, name: "الصافات" },
    { id: 38, name: "ص" },
    { id: 39, name: "الزمر" },
    { id: 40, name: "غافر" },
    { id: 41, name: "فصلت" },
    { id: 42, name: "الشورى" },
    { id: 43, name: "الزخرف" },
    { id: 44, name: "الدخان" },
    { id: 45, name: "الجاثية" },
    { id: 46, name: "الأحقاف" },
    { id: 47, name: "محمد" },
    { id: 48, name: "الفتح" },
    { id: 49, name: "الحجرات" },
    { id: 50, name: "ق" },
    { id: 51, name: "الذاريات" },
    { id: 52, name: "الطور" },
    { id: 53, name: "النجم" },
    { id: 54, name: "القمر" },
    { id: 55, name: "الرحمن" },
    { id: 56, name: "الواقعة" },
    { id: 57, name: "الحديد" },
    { id: 58, name: "المجادلة" },
    { id: 59, name: "الحشر" },
    { id: 60, name: "الممتحنة" },
    { id: 61, name: "الصف" },
    { id: 62, name: "الجمعة" },
    { id: 63, name: "المنافقون" },
    { id: 64, name: "التغابن" },
    { id: 65, name: "الطلاق" },
    { id: 66, name: "التحريم" },
    { id: 67, name: "الملك" },
    { id: 68, name: "القلم" },
    { id: 69, name: "الحاقة" },
    { id: 70, name: "المعارج" },
    { id: 71, name: "نوح" },
    { id: 72, name: "الجن" },
    { id: 73, name: "المزمل" },
    { id: 74, name: "المدثر" },
    { id: 75, name: "القيامة" },
    { id: 76, name: "الإنسان" },
    { id: 77, name: "المرسلات" },
    { id: 78, name: "النبأ" },
    { id: 79, name: "النازعات" },
    { id: 80, name: "عبس" },
    { id: 81, name: "التكوير" },
    { id: 82, name: "الانفطار" },
    { id: 83, name: "المطففين" },
    { id: 84, name: "الانشقاق" },
    { id: 85, name: "البروج" },
    { id: 86, name: "الطارق" },
    { id: 87, name: "الأعلى" },
    { id: 88, name: "الغاشية" },
    { id: 89, name: "الفجر" },
    { id: 90, name: "البلد" },
    { id: 91, name: "الشمس" },
    { id: 92, name: "الليل" },
    { id: 93, name: "الضحى" },
    { id: 94, name: "الشرح" },
    { id: 95, name: "التين" },
    { id: 96, name: "العلق" },
    { id: 97, name: "القدر" },
    { id: 98, name: "البينة" },
    { id: 99, name: "الزلزلة" },
    { id: 100, name: "العاديات" },
    { id: 101, name: "القارعة" },
    { id: 102, name: "التكاثر" },
    { id: 103, name: "العصر" },
    { id: 104, name: "الهمزة" },
    { id: 105, name: "الفيل" },
    { id: 106, name: "قريش" },
    { id: 107, name: "الماعون" },
    { id: 108, name: "الكوثر" },
    { id: 109, name: "الكافرون" },
    { id: 110, name: "النصر" },
    { id: 111, name: "المسد" },
    { id: 112, name: "الإخلاص" },
    { id: 113, name: "الفلق" },
    { id: 114, name: "الناس" }
]

// Cached pages from JSON
let cachedPages = []
let memorizedPageIds = new Set() // Set of strings (page IDs)
let isLoaded = false

// ─── Data Migration Guard ───────────────────────────────────────────────────
// Bump this version whenever localStorage data format changes significantly.
// This ensures old user data is safely migrated instead of silently breaking.
const CURRENT_DATA_VERSION = '0.0.3'

const runMigrationIfNeeded = async (pages) => {
    try {
        const storedVersion = localStorage.getItem('data_version')
        if (storedVersion === CURRENT_DATA_VERSION) return // Up to date, nothing to do

        console.log(`🔄 Migrating data from ${storedVersion || 'unknown'} → ${CURRENT_DATA_VERSION}`)

        // ── Migration: unknown / 0.0.1 / 0.0.2 → 0.0.3 ───────────────────
        // We migrate all data keyed by page-${pageNum} to page-${pageNum}-${surahId}
        
        // 1. Migrate memorizedPageIds in localStorage
        const saved = localStorage.getItem('memorizedPageIds')
        if (saved) {
            try {
                const oldIds = JSON.parse(saved)
                if (Array.isArray(oldIds)) {
                    const newIds = new Set()
                    oldIds.forEach(id => {
                        if (typeof id === 'string' && id.startsWith('page-') && id.split('-').length === 2) {
                            const pageNum = parseInt(id.split('-')[1])
                            const matchingChunks = pages.filter(p => p.pageNumber === pageNum)
                            matchingChunks.forEach(chunk => {
                                newIds.add(chunk.id)
                            })
                        } else {
                            newIds.add(id)
                        }
                    })
                    localStorage.setItem('memorizedPageIds', JSON.stringify(Array.from(newIds)))
                    console.log('✅ Migrated memorizedPageIds successfully')
                }
            } catch (e) {
                console.error('Failed to migrate memorizedPageIds', e)
            }
        }

        // 2. Migrate global bookmark
        const bookmark = localStorage.getItem('globalBookmarkPageId')
        if (bookmark) {
            if (typeof bookmark === 'string' && bookmark.startsWith('page-') && bookmark.split('-').length === 2) {
                const pageNum = parseInt(bookmark.split('-')[1])
                const matchingChunk = pages.find(p => p.pageNumber === pageNum)
                if (matchingChunk) {
                    localStorage.setItem('globalBookmarkPageId', matchingChunk.id)
                    console.log('✅ Migrated global bookmark successfully')
                }
            }
        }

        // 3. Migrate SRS data and annotations in IndexedDB
        const { annotationService } = await import('./annotations.js')
        
        // Migrate SRS data
        try {
            const allSRS = await annotationService.getAllSRS()
            for (const [oldId, srs] of Object.entries(allSRS)) {
                if (oldId.startsWith('page-') && oldId.split('-').length === 2) {
                    const pageNum = parseInt(oldId.split('-')[1])
                    const matchingChunks = pages.filter(p => p.pageNumber === pageNum)
                    
                    // Save a new record for each chunk
                    for (const chunk of matchingChunks) {
                        const newSrs = { ...srs, pageId: chunk.id }
                        await annotationService.saveSRSData(chunk.id, newSrs)
                    }
                    
                    // Delete old record
                    await annotationService.deleteSRSData(oldId)
                }
            }
            console.log('✅ Migrated SRS data successfully')
        } catch (e) {
            console.error('Failed to migrate SRS data', e)
        }

        // Migrate annotations
        try {
            const allAnns = await annotationService.getAllAnnotations()
            for (const ann of allAnns) {
                if (ann.pageId && ann.pageId.startsWith('page-') && ann.pageId.split('-').length === 2) {
                    const pageNum = parseInt(ann.pageId.split('-')[1])
                    
                    // Determine surahId
                    let surahId = ann.surah
                    if (!surahId && ann.wordIds && ann.wordIds.length > 0) {
                        surahId = parseInt(ann.wordIds[0].split('_')[0])
                    }
                    if (!surahId && ann.id && ann.id.includes('_')) {
                        surahId = parseInt(ann.id.split('_')[0])
                    }
                    
                    if (surahId) {
                        const matchingChunk = pages.find(p => p.pageNumber === pageNum && p.surahId === surahId)
                        if (matchingChunk) {
                            ann.pageId = matchingChunk.id
                            ann.surah = surahId
                            await annotationService.saveAnnotation(ann)
                        }
                    } else {
                        // Fallback to first matching chunk
                        const matchingChunk = pages.find(p => p.pageNumber === pageNum)
                        if (matchingChunk) {
                            ann.pageId = matchingChunk.id
                            await annotationService.saveAnnotation(ann)
                        }
                    }
                }
            }
            console.log('✅ Migrated annotations successfully')
        } catch (e) {
            console.error('Failed to migrate annotations', e)
        }

        // Mark as migrated
        localStorage.setItem('data_version', CURRENT_DATA_VERSION)
        console.log(`✅ Data migration to ${CURRENT_DATA_VERSION} complete`)
    } catch (e) {
        console.error('Migration failed:', e)
    }
}


export const StorageService = {
    // Load pages from JSON file
    async loadFromJSON() {
        if (isLoaded && cachedPages.length > 0) return cachedPages

        try {
            // Updated: Use dynamic import instead of fetch to avoid network/path issues in Electron
            // @ts-ignore
            const module = await import('../data/quran_full_pages.json')
            const data = module.default || module

            // New structure: pages are at root level
            const pages = data.pages.map(page => ({
                id: `page-${page.pageNumber}-${page.surahNumber}`,
                pageNumber: page.pageNumber,
                surahId: page.surahNumber,
                surahName: page.surahName,
                orderInSurah: page.orderInSurah,
                topic: page.topic,
                topicId: page.topicId,
                ayahs: page.ayahs,
                firstAyahId: page.firstAyahId,
                lastAyahId: page.lastAyahId
            }))

            cachedPages = pages

            // Run data migration check on first load
            await runMigrationIfNeeded(pages)

            // Load memorized pages from localStorage
            try {
                const saved = localStorage.getItem('memorizedPageIds')
                if (saved) {
                    memorizedPageIds = new Set(JSON.parse(saved))
                } else {
                    // Default: empty
                }
            } catch (e) {
                console.error('Failed to load memorized pages setting', e)
            }

            isLoaded = true
            console.log(`✅ تم تحميل ${pages.length} صفحة من القرآن`)
            return pages
        } catch (error) {
            console.error('❌ خطأ في تحميل بيانات القرآن:', error)
            return []
        }
    },

    async init() {
        await this.loadFromJSON()
    },

    getSurahs() {
        return SURAHS_DATA
    },

    getSortedPages() {
        return [...cachedPages].sort((a, b) => a.pageNumber - b.pageNumber)
    },

    isDataLoaded() {
        return isLoaded
    },

    // --- Memorized Pages Management ---

    getMemorizedPageIds() {
        return Array.from(memorizedPageIds)
    },

    isPageMemorized(pageId) {
        return memorizedPageIds.has(pageId)
    },

    togglePageMemorized(pageId) {
        let isMemorized = false
        if (memorizedPageIds.has(pageId)) {
            memorizedPageIds.delete(pageId)
        } else {
            memorizedPageIds.add(pageId)
            isMemorized = true
            this._resetPhysicalPageSRSIfNeeded(pageId)
        }
        this._saveMemorized()
        return isMemorized
    },

    setPageMemorized(pageId, isMemorized) {
        const wasMemorized = memorizedPageIds.has(pageId)
        if (isMemorized) {
            memorizedPageIds.add(pageId)
            if (!wasMemorized) {
                this._resetPhysicalPageSRSIfNeeded(pageId)
            }
        } else {
            memorizedPageIds.delete(pageId)
        }
        this._saveMemorized()
    },

    async _resetPhysicalPageSRSIfNeeded(pageId) {
        try {
            const chunk = cachedPages.find(p => p.id === pageId)
            if (!chunk) return
            const allChunks = cachedPages.filter(p => p.pageNumber === chunk.pageNumber)
            if (allChunks.length > 1) {
                const hasMemorizedSibling = allChunks.some(c => c.id !== pageId && memorizedPageIds.has(c.id))
                if (hasMemorizedSibling) {
                    console.log(`[StorageService] Sibling chunk already memorized on page ${chunk.pageNumber}. Resetting SRS for all chunks on this page.`)
                    for (const c of allChunks) {
                        await annotationService.deleteSRSData(c.id)
                    }
                }
            }
        } catch (e) {
            console.error('Error in _resetPhysicalPageSRSIfNeeded:', e)
        }
    },

    /**
     * Get a specific ayah by Surah and Ayah number
     * Efficiently finds the ayah from cached pages
     */
    getAyahBySurahAndNumber(surahNumber, ayahNumber) {
        if (!cachedPages.length) return null;

        // Find the page that contains this ayah
        // We can optimize this by knowing page ranges, but iteration is fast enough for < 604 pages
        const page = cachedPages.find(p => {
            // Check if page covers this surah
            if (p.surahId !== surahNumber && p.ayahs.every(a => a.surahNumber !== surahNumber)) return false; // Optimization: Skip if page is purely another surah (though pages can share surahs)

            // Actually, simplest is to check if the ayah exists in the page's ayahs array
            // Since pages have `ayahs` array with `number` (ayah number in surah)
            // But wait, `quran_data.json` ayahs might lack `surahId` inside them? 
            // Let's check `quran_data.json` structure again.
            // `ayahs` in page object has `number` and `text`, but page has `surahNumber`.
            // IF a page crosses two surahs, does it handle it?
            // `quran_data.json` structure showed `surahNumber` at page level. 
            // If a page has mixed surahs, `surahNumber` might be the dominant one?
            // Let's look at `ayahs` content in `quran_data.json` again or rely on search.

            // SAFE APPROACH: Iterate all pages, iterate all ayahs.
            // Optimization: `surahNumber` matches page's `surahNumber` OR we just search.
            // Given 604 pages, a simple find is ~600 checks. 
            return p.ayahs.some(a => a.number === ayahNumber && p.surahId === surahNumber);
            // WAIT. `quran_data.json` schema:
            // "pages": [ { "surahNumber": 1, "ayahs": [ { "number": 1, ... } ] } ]
            // If a page has multiple surahs, `surahNumber` might not differ per ayah in the list?
            // Standard `quran_data.json` usually splits verses. 
            // Let's assume for now searching by `page.surahNumber` + `ayah.number` is safe for Al-Baqarah.
            // But for general purpose, we should return the first match.
        });

        // Correct approach:
        for (const page of cachedPages) {
            // Optimization: Skip pages that definitely don't have this surah if possible.
            // But strict checking is better.
            if (page.surahId === surahNumber) {
                const ayah = page.ayahs.find(a => a.number === ayahNumber);
                if (ayah) return ayah;
            }
        }
        return null;
    },

    // Get ONLY memorized pages (for games)
    getMemorizedPages() {
        if (memorizedPageIds.size === 0) return []
        return cachedPages.filter(p => memorizedPageIds.has(p.id))
    },

    // --- Composite Pages (Shared pages between surahs) ---

    /**
     * Get all chunks for a given physical page number
     * e.g. page 583 → [chunk for Naba, chunk for Nazi'at]
     */
    getPageChunks(pageNumber) {
        return cachedPages.filter(p => p.pageNumber === pageNumber)
    },

    /**
     * Build composite memorized pages — groups chunks sharing the same
     * physical page number into a single object.
     * Non-memorized sibling chunks are included with isMemorized=false
     * so the UI can render them with blur effect.
     *
     * Returns array sorted by pageNumber, each item has:
     *   { pageNumber, id, chunks[], isComposite, surahName, ayahs, ... }
     */
    getCompositeMemorizedPages() {
        if (memorizedPageIds.size === 0) return []

        const memorizedChunks = cachedPages.filter(p => memorizedPageIds.has(p.id))
        // Unique physical page numbers that have at least one memorized chunk
        const pageNumbers = [...new Set(memorizedChunks.map(p => p.pageNumber))].sort((a, b) => a - b)

        return pageNumbers.map(pageNum => {
            const allChunks = cachedPages.filter(p => p.pageNumber === pageNum)

            // Single chunk page — fast path (majority of pages)
            if (allChunks.length === 1) {
                const chunk = allChunks[0]
                return {
                    ...chunk,
                    chunks: [{ ...chunk, isMemorized: memorizedPageIds.has(chunk.id) }],
                    isComposite: false,
                    isFullyMemorized: memorizedPageIds.has(chunk.id),
                    isPartiallyMemorized: false
                }
            }

            // Multi-chunk (shared) page
            const enrichedChunks = allChunks
                .sort((a, b) => a.surahId - b.surahId)
                .map(c => ({ ...c, isMemorized: memorizedPageIds.has(c.id) }))

            const primaryChunk = enrichedChunks.find(c => c.isMemorized) || enrichedChunks[0]
            const allMemorized = enrichedChunks.every(c => c.isMemorized)
            const someMemorized = enrichedChunks.some(c => c.isMemorized)

            return {
                ...primaryChunk,
                pageNumber: pageNum,
                chunks: enrichedChunks,
                isComposite: true,
                isFullyMemorized: allMemorized,
                isPartiallyMemorized: someMemorized && !allMemorized,
                surahName: enrichedChunks
                    .map(c => c.surahName)
                    .filter((v, i, a) => a.indexOf(v) === i)
                    .join(' / '),
                ayahs: enrichedChunks.flatMap(c => c.ayahs),
                firstAyahId: enrichedChunks[0].firstAyahId,
                lastAyahId: enrichedChunks[enrichedChunks.length - 1].lastAyahId
            }
        })
    },

    // --- Global Bookmark (Reference Page) ---
    getGlobalBookmark() {
        try {
            return localStorage.getItem('globalBookmarkPageId') || null
        } catch {
            return null
        }
    },

    setGlobalBookmark(pageId) {
        if (pageId) {
            try {
                localStorage.setItem('globalBookmarkPageId', pageId)
            } catch (e) {
                console.error(e)
            }
        } else {
            try {
                localStorage.removeItem('globalBookmarkPageId')
            } catch (e) {
                console.error(e)
            }
        }
    },

    // --- Tutorial / Onboarding ---
    hasSeenTutorial(featureId) {
        const settings = this._getTutorialSettings()
        if (settings.skipAll) return true
        return !!settings.seen[featureId]
    },

    markTutorialAsSeen(featureId) {
        const settings = this._getTutorialSettings()
        settings.seen[featureId] = true
        this._saveTutorialSettings(settings)
    },

    setSkipAllTutorials(skip) {
        const settings = this._getTutorialSettings()
        settings.skipAll = skip
        this._saveTutorialSettings(settings)
    },

    _getTutorialSettings() {
        try {
            const stored = localStorage.getItem('tutorialSettings')
            return stored ? JSON.parse(stored) : { seen: {}, skipAll: false }
        } catch {
            return { seen: {}, skipAll: false }
        }
    },

    _saveTutorialSettings(settings) {
        try {
            localStorage.setItem('tutorialSettings', JSON.stringify(settings))
        } catch (e) {
            console.error(e)
        }
    },

    // --- Onboarding / Visited Sections ---

    hasVisitedSection(sectionId) {
        const visited = this._getVisitedSections()
        return !!visited[sectionId]
    },

    markSectionVisited(sectionId) {
        const visited = this._getVisitedSections()
        if (!visited[sectionId]) {
            visited[sectionId] = true
            this._saveVisitedSections(visited)
            return true // Indication that it was just marked
        }
        return false
    },

    _getVisitedSections() {
        try {
            const stored = localStorage.getItem('visitedSections')
            return stored ? JSON.parse(stored) : {}
        } catch {
            return {}
        }
    },

    _saveVisitedSections(visited) {
        try {
            localStorage.setItem('visitedSections', JSON.stringify(visited))
        } catch (e) {
            console.error(e)
        }
    },

    // First Time Launch
    isFirstTimeAppLaunch() {
        try {
            return !localStorage.getItem('appHasLaunchedBefore')
        } catch {
            return true
        }
    },

    setAppLaunched() {
        try {
            localStorage.setItem('appHasLaunchedBefore', 'true')
        } catch (e) {
            console.error(e)
        }
    },



    /**
     * ⚠️ DEVELOPMENT UTILITY ⚠️
     * Resets all user data (LocalStorage + IndexedDB).
     * Usage: Run reset() in the console.
     */
    resetAllData() {
        console.warn('⚠️ TRIGGERING FULL RESET (LocalStorage + DB)...')
        try {
            localStorage.clear()
        } catch (e) {
            console.error(e)
        }

        // Force close DB connection to prevent "blocked" event
        try {
            if (annotationService && typeof annotationService.close === 'function') {
                annotationService.close()
            }
        } catch (e) {
            console.warn('Could not close DB:', e)
        }

        // Delete IndexedDB
        const req = window.indexedDB.deleteDatabase('QuranToolDB')

        // Reload when done or if blocked/error (force reload clears connections)
        req.onsuccess = () => window.location.reload()
        req.onerror = () => window.location.reload()
        req.onblocked = () => window.location.reload()

        // Fallback safety
        setTimeout(() => window.location.reload(), 500)
    },

    _saveMemorized() {
        try {
            localStorage.setItem('memorizedPageIds', JSON.stringify(Array.from(memorizedPageIds)))
        } catch (e) {
            console.error(e)
        }
    }
}

// Global short command for developer
window.reset = () => StorageService.resetAllData()
window.StorageService = StorageService

export default StorageService
