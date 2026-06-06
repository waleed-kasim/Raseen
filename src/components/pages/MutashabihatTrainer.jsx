import React, { useState, useEffect, useRef, useCallback } from 'react'
import BackButton from '../ui/BackButton'
import TutorialOverlay from '../ui/TutorialOverlay'
import { StorageService } from '../../services/storage'
import mutashabihatPhrases from '../../data/mutashabihat_phrases.json'
import mutashabihatVerses from '../../data/mutashabihat_verses.json'
import { 
    calculateJaccardSimilarity, 
    calculateCosineSimilarity, 
    calculateCCI, 
    getLCSIndices 
} from '../../utils/similarity'
import { MUTASHABIHAT_DATA } from '../../data/mutashabihat'
import ReviewEngine from '../game/engine/ReviewEngine'

const SAT_COLORS = ['#0dcaf0', '#ffc107', '#fd7e14', '#adb5bd']

const getGroupCCIBadge = (group) => {
    if (!group) return { label: 'تداخل سطحي 🟢', color: '#10b981' }
    if (group.badgeColor && group.badgeLabel) {
        return { label: group.badgeLabel, color: group.badgeColor }
    }
    const docFreq = group.items.length
    let totalCCI = 0, cciCount = 0
    for (let a = 0; a < group.items.length; a++) {
        for (let b = 0; b < group.items.length; b++) {
            if (a !== b) {
                totalCCI += calculateCCI(group.items[a].text, group.items[b].text, docFreq)
                cciCount++
            }
        }
    }
    const avgCCI = cciCount > 0 ? totalCCI / cciCount : 0.5
    let badgeColor = '#ef4444', badgeLabel = 'تداخل حرج 🔴'
    if (avgCCI < 0.40) { badgeColor = '#10b981'; badgeLabel = 'تداخل سطحي 🟢' }
    else if (avgCCI < 0.75) { badgeColor = '#ffc107'; badgeLabel = 'تداخل متوسط 🟡' }

    group.badgeColor = badgeColor
    group.badgeLabel = badgeLabel
    return { label: badgeLabel, color: badgeColor }
}

// Seeded random helper for deterministic dynamic positions
function seededRandomHelper(seedStr) {
    let hash = 0;
    for (let i = 0; i < seedStr.length; i++) {
        hash = seedStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    return function() {
        hash = (hash * 9301 + 49297) % 233280;
        return hash / 233280;
    };
}

// Distance from point (x, y) to rectangle box
function distanceToRectHelper(x, y, box) {
    const dx = Math.max(box.x1 - x, 0, x - box.x2);
    const dy = Math.max(box.y1 - y, 0, y - box.y2);
    return Math.sqrt(dx * dx + dy * dy);
}

// Helper to merge quadrants as fallback for Left-Center if needed
// Dynamically calculate safe non-overlapping quadrant-bound coordinates for exactly 4 moons
function calculateDynamicLayout(width, height, topicId) {
    const rand = seededRandomHelper(topicId);
    
    // 1. Satellite dimensions
    const satW = Math.max(120, Math.min(175, width * 0.13));
    const r = satW / 2;
    const rEff = r + 15; // 15px extra buffer spacing

    // 2. Central card boundaries
    const cardW = Math.max(300, Math.min(680, width * 0.45));
    const cardH = height * 0.52;
    
    const cardLeft = (width - cardW) / 2;
    const cardRight = cardLeft + cardW;
    const cardTop = (height - cardH) / 2;
    const cardBottom = cardTop + cardH;

    // 3. Define unsafe rectangular zones
    const topBar = { x1: 0, y1: 0, x2: width, y2: 75 };
    
    const btmBarW = Math.min(width * 0.90, 550);
    const btmBarLeft = (width - btmBarW) / 2;
    const bottomBar = { x1: btmBarLeft, y1: height - 80, x2: btmBarLeft + btmBarW, y2: height };
    
    const centralCard = { x1: cardLeft, y1: cardTop, x2: cardRight, y2: cardBottom };
    const leftArrow = { x1: cardLeft - 50, y1: height / 2 - 21, x2: cardLeft - 8, y2: height / 2 + 21 };
    const rightArrow = { x1: cardRight + 8, y1: height / 2 - 21, x2: cardRight + 50, y2: height / 2 + 21 };

    const unsafeBoxes = [topBar, bottomBar, centralCard, leftArrow, rightArrow];

    // 4. Scan coordinates on a detailed grid of 80x80 search sectors
    const topRightPool = [];
    const bottomRightPool = [];
    const bottomLeftPool = [];
    const topLeftPool = [];

    const stepX = width / 80;
    const stepY = height / 80;

    // Scan with 25px side padding and 20px top/bottom padding to ensure outer edges never touch screen edges
    for (let x = rEff + 25; x < width - rEff - 25; x += stepX) {
        for (let y = rEff + 20; y < height - rEff - 20; y += stepY) {
            let collision = false;
            for (const box of unsafeBoxes) {
                if (distanceToRectHelper(x, y, box) < rEff) {
                    collision = true;
                    break;
                }
            }
            if (!collision) {
                // Vertical gap (yGap = rEff) to prevent top and bottom satellites from touching
                const yGap = rEff;

                // Right side
                if (x >= width / 2) {
                    if (y <= height / 2 - yGap) topRightPool.push({ x, y });
                    if (y >= height / 2 + yGap) bottomRightPool.push({ x, y });
                }

                // Left side
                if (x < width / 2) {
                    if (y <= height / 2 - yGap) topLeftPool.push({ x, y });
                    if (y >= height / 2 + yGap) bottomLeftPool.push({ x, y });
                }
            }
        }
    }

    // 5. Select sectors for exactly 4 moons
    const sectors = [topRightPool, bottomRightPool, bottomLeftPool, topLeftPool];
    const moons = [];
    const fallbackPct = [
        { top: 23, left: 88 },
        { top: 72, left: 88 },
        { top: 72, left: 12 },
        { top: 23, left: 12 }
    ];

    for (let i = 0; i < 4; i++) {
        const pool = sectors[i];
        if (!pool || pool.length === 0) {
            moons.push({
                top: `${fallbackPct[i].top }%`,
                left: `${fallbackPct[i].left }%`
            });
            continue;
        }

        const idx = Math.floor(rand() * pool.length);
        const pt = pool[idx];

        moons.push({
            top: `${((pt.y / height) * 100 ).toFixed(2)}%`,
            left: `${((pt.x / width) * 100 ).toFixed(2)}%`
        });
    }

    return moons;
}

function MutashabihatTrainer({ onBack }) {
    const [filteredData, setFilteredData] = useState([])
    const [activeIndex, setActiveIndex] = useState(0)
    const [subIndex, setSubIndex] = useState(0)
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
    const [ayahMap, setAyahMap] = useState({})
    const [revealNext, setRevealNext] = useState(false)
    const [showGroupModal, setShowGroupModal] = useState(false)
    const [groupSearchQuery, setGroupSearchQuery] = useState('')
    const [modalSelectedSurah, setModalSelectedSurah] = useState(null) // surahId or null
    const [visibleSurahCount, setVisibleSurahCount] = useState(24)
    const [visibleTopicCount, setVisibleTopicCount] = useState(15)

    // Reset visibility counts when modal state changes
    useEffect(() => {
        setVisibleSurahCount(24)
        setVisibleTopicCount(15)
    }, [modalSelectedSurah, groupSearchQuery, showGroupModal])

    // Load and compile mutashabihat groups on mount or storage update
    useEffect(() => {
        const allPages = StorageService.getSortedPages()
        const memorizedPageIds = new Set(StorageService.getMemorizedPageIds())

        // 1. Build global ayah text and page mapping
        const tempAyahMap = {}
        allPages.forEach(p => {
            if (p.ayahs) {
                p.ayahs.forEach(a => {
                    tempAyahMap[`${p.surahId}:${a.number}`] = {
                        text: a.text,
                        page: p.pageNumber,
                        surahId: p.surahId,
                        surahName: p.surahName,
                        ayahNum: a.number,
                        pageId: p.id
                    }
                })
            }
        })

        // Add context (prev/next) using adjacent keys
        for (const key of Object.keys(tempAyahMap)) {
            const [sId, aNum] = key.split(':').map(Number)
            const prevKey = `${sId}:${aNum - 1}`
            const nextKey = `${sId}:${aNum + 1}`
            tempAyahMap[key].context = {
                prev: tempAyahMap[prevKey]?.text || '',
                next: tempAyahMap[nextKey]?.text || ''
            }
        }
        setAyahMap(tempAyahMap)

        // 2. Compile mutashabihat groups containing ONLY memorized verses
        const compiledGroups = []
        for (const [phraseId, phraseData] of Object.entries(mutashabihatPhrases)) {
            const ayahKeys = Object.keys(phraseData.ayah)
            
            const groupItems = ayahKeys.map(key => {
                const info = tempAyahMap[key]
                if (!info) return null
                const isMemorized = memorizedPageIds.has(info.pageId)
                if (!isMemorized) return null // Exclude unmemorized verses completely

                const ranges = phraseData.ayah[key]
                return {
                    key,
                    surah: info.surahId,
                    surahName: info.surahName,
                    ayah: info.ayahNum,
                    page: info.page,
                    pageId: info.pageId,
                    text: info.text,
                    context: info.context,
                    ranges,
                    isMemorized: true
                }
            }).filter(Boolean)

            // Keep groups only if they contain at least 2 memorized verses
            if (groupItems.length >= 2) {
                const srcKey = phraseData.source.key
                const srcInfo = tempAyahMap[srcKey]
                let phraseText = ''
                if (srcInfo) {
                    const words = srcInfo.text.split(/\s+/)
                    phraseText = words.slice(phraseData.source.from, phraseData.source.to).join(' ')
                }

                compiledGroups.push({
                    id: phraseId,
                    phraseText,
                    sourceKey: srcKey,
                    items: groupItems,
                    title: phraseText ? `متشابهة: ${phraseText}` : 'عبارة متشابهة مشتركة',
                    description: `تتكرر هذه العبارة في ${groupItems.length} مواضع محفوظة في القرآن الكريم.`,
                })
            }
        }

        // Sort by page number of first item
        compiledGroups.sort((a, b) => a.items[0].page - b.items[0].page)
        setFilteredData(compiledGroups)
        setActiveIndex(0)
        setSubIndex(0)
    }, [])

    // Tutorial Logic
    const [showTutorial, setShowTutorial] = useState(false)
    const [tutorialSteps] = useState([
        {
            title: "المتشابهات القرآنية 🧠",
            description: "يعرض هذا القسم آيات القرآن التي تتشابه في عبارات معينة. يتم تصفية النتائج لتقتصر فقط على الصفحات التي قمت بحفظها.",
            icon: "🪐"
        },
        {
            title: "التنقل والمقارنة 🔄",
            description: "تنقل بين مواضع التشابه بالأسفل لتستعرض سياق الآية في المصحف وتثبيت الحفظ من خلال المقارنة البصرية.",
            icon: "🧭"
        }
    ])

    useEffect(() => {
        const hasSeen = StorageService.hasSeenTutorial('mutashabihat_intro')
        if (!hasSeen && filteredData.length > 0) {
            setShowTutorial(true)
        }
    }, [filteredData])

    const handleTutorialComplete = () => {
        StorageService.markTutorialAsSeen('mutashabihat_intro')
        setShowTutorial(false)
    }

    const handleSkipAllTutorials = () => {
        StorageService.setSkipAllTutorials(true)
        setShowTutorial(false)
    }

    // Draggable satellite offsets (4 satellites) - kept in a Ref to avoid React re-renders during drag
    const satOffsets = useRef([
        { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }
    ])
    const dragContext = useRef(null)
    const [dragging, setDragging] = useState(null)
    const dragStart = useRef({ x: 0, y: 0 })
    const springAnimIds = useRef([null, null, null, null])

    // Refs for dynamic line calculation
    const containerRef = useRef(null)
    const hubRef = useRef(null)
    const sat0 = useRef(null)
    const sat1 = useRef(null)
    const sat2 = useRef(null)
    const sat3 = useRef(null)
    const satRefsList = [sat0, sat1, sat2, sat3]

    // Line refs to modify SVG attributes directly
    const line0 = useRef(null)
    const line1 = useRef(null)
    const line2 = useRef(null)
    const line3 = useRef(null)
    const lineRefsList = [line0, line1, line2, line3]

    // Cached coordinates of SVG lines to restore them on React renders
    const lineCoords = useRef([
        { x1: 0, y1: 0, x2: 0, y2: 0 },
        { x1: 0, y1: 0, x2: 0, y2: 0 },
        { x1: 0, y1: 0, x2: 0, y2: 0 },
        { x1: 0, y1: 0, x2: 0, y2: 0 }
    ])

    const currentGroup = filteredData[activeIndex]
    const currentItem = currentGroup ? currentGroup.items[subIndex] : null

    // Responsive
    useEffect(() => {
        const onResize = () => setIsMobile(window.innerWidth < 768)
        window.addEventListener('resize', onResize)
        return () => window.removeEventListener('resize', onResize)
    }, [])

    // Keyboard Navigation for cycling subIndex
    useEffect(() => {
        const handleKey = (e) => {
            if (e.key === 'ArrowRight') handlePrevSub()
            if (e.key === 'ArrowLeft') handleNextSub()
        }
        window.addEventListener('keydown', handleKey)
        return () => window.removeEventListener('keydown', handleKey)
    }, [activeIndex, subIndex, filteredData])

    // Reset satellite positions when switching items
    useEffect(() => {
        satOffsets.current = [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }]
        satRefsList.forEach(ref => {
            if (ref.current) {
                ref.current.style.transform = 'translate(-50%, -50%)'
            }
        })
        setRevealNext(false)
        const timer = setTimeout(calculateLines, 50)
        return () => clearTimeout(timer)
    }, [activeIndex, subIndex])

    // Group navigation
    const handleNextGroup = () => {
        if (activeIndex < filteredData.length - 1) {
            setActiveIndex(activeIndex + 1)
            setSubIndex(0)
        }
    }
    const handlePrevGroup = () => {
        if (activeIndex > 0) {
            setActiveIndex(activeIndex - 1)
            setSubIndex(0)
        }
    }

    // Sub-group navigation (no cycling within the same group)
    const handleNextSub = () => {
        if (currentGroup && currentGroup.items.length > 0) {
            if (subIndex < currentGroup.items.length - 1) {
                setSubIndex(subIndex + 1)
            }
        }
    }
    const handlePrevSub = () => {
        if (currentGroup && currentGroup.items.length > 0) {
            if (subIndex > 0) {
                setSubIndex(subIndex - 1)
            }
        }
    }

    // Dynamic heuristic for ayah position on its page
    let positionText = 'وسط الصفحة'
    if (currentItem && Object.keys(ayahMap).length > 0) {
        const pageAyahs = Object.values(ayahMap).filter(a => a.page === currentItem.page && a.surahId === currentItem.surah)
        const ayahNums = pageAyahs.map(a => a.ayahNum).sort((a, b) => a - b)
        const first = ayahNums[0] || 1
        const last = ayahNums[ayahNums.length - 1] || 1
        const total = last - first
        const relative = total > 0 ? (currentItem.ayah - first) / total : 0.5
        if (relative <= 0.2) positionText = 'أول الصفحة'
        else if (relative >= 0.8) positionText = 'آخر الصفحة'
    }

    // Helper to strip diacritics for normalization
    const stripDiacritics = (text) => {
        if (!text) return '';
        return text.replace(/[\u064B-\u065F\u0670]/g, "");
    };

    // Helper to normalize letters (Alif, Ta-Marbuta, Ya)
    const normalizeArabic = (text) => {
        if (!text) return '';
        return stripDiacritics(text)
            .replace(/[أإآٱ]/g, 'ا')
            .replace(/ة/g, 'ه')
            .replace(/ى/g, 'ي')
            .trim();
    };

    // 1. Check for manual memory aids in the hardcoded Baqarah mutashabihat data
    let manualAid = null;
    if (currentItem) {
        const verseKey = `${currentItem.surah}:${currentItem.ayah}`;
        for (const group of MUTASHABIHAT_DATA) {
            const matchedItem = group.group.find(item => `${item.surah}:${item.ayah}` === verseKey);
            if (matchedItem) {
                manualAid = {
                    rule: matchedItem.rule,
                    notes: matchedItem.notes
                };
                break;
            }
        }
    }

    // 2. Generate dynamic memory aids for other verses
    let dynamicAid = null;
    let endingText = '';
    if (currentItem && currentGroup) {
        // Extract verse ending (last 3 words)
        const wordsList = currentItem.text.trim().split(/\s+/);
        endingText = wordsList.slice(-3).join(' ');

        // Find unique words in this verse compared to others in the group
        const currentWords = currentItem.text.split(/\s+/).map(w => w.replace(/[^\u0621-\u064A]/g, ''));
        const otherNormalizedWords = new Set();
        currentGroup.items.forEach(item => {
            if (item.key !== currentItem.key) {
                item.text.split(/\s+/).forEach(word => {
                    const clean = word.replace(/[^\u0621-\u064A]/g, '');
                    if (clean) {
                        otherNormalizedWords.add(normalizeArabic(clean));
                    }
                });
            }
        });
        const unique = [];
        currentWords.forEach(word => {
            const clean = word.replace(/[^\u0621-\u064A]/g, '');
            if (clean && clean.length > 2) {
                const norm = normalizeArabic(clean);
                if (!otherNormalizedWords.has(norm)) {
                    unique.push(word);
                }
            }
        });
        let uniqueText = unique.slice(0, 3).join(' ، ');

        // Fallback: Show the words following the shared phrase (continuation)
        if (!uniqueText && currentItem.ranges && currentItem.ranges.length > 0) {
            const endIdx = currentItem.ranges[0][1];
            const allWords = currentItem.text.split(/\s+/);
            const continuation = allWords.slice(endIdx, endIdx + 3).join(' ');
            if (continuation) {
                uniqueText = `${continuation}...`;
            }
        }

        dynamicAid = {
            uniqueWords: uniqueText ? `${uniqueText}` : 'تشابه تام في الألفاظ'
        };
    }

    // Calculate CCI score and category for the current verse compared to others in the group
    let cciScore = 0;
    let cciCategory = null;
    if (currentItem && currentGroup) {
        const docFreq = currentGroup.items.length;
        let totalCCI = 0;
        let comparisonCount = 0;
        currentGroup.items.forEach(item => {
            if (item.key !== currentItem.key) {
                const score = calculateCCI(currentItem.text, item.text, docFreq);
                totalCCI += score;
                comparisonCount++;
            }
        });
        cciScore = comparisonCount > 0 ? totalCCI / comparisonCount : 0;
        
        if (cciScore >= 0.75) {
            cciCategory = { label: 'تداخل حرج 🔴', color: '#ef4444' };
        } else if (cciScore >= 0.40) {
            cciCategory = { label: 'تداخل متوسط 🟡', color: '#ffc107' };
        } else {
            cciCategory = { label: 'تداخل سطحي 🟢', color: '#10b981' };
        }
    }

    // Satellite data mapping (4 satellites focused on distinguishing mutashabihat)
    const satellites = currentItem ? [
        { label: 'الموقع البصري', icon: 'bi-geo-alt', content: `ص ${currentItem.page} | ${positionText}` },
        { label: 'الموضع القرآني', icon: 'bi-book', content: `سورة ${currentItem.surahName}\nآية ${currentItem.ayah}` },
        { 
            label: manualAid ? 'القاعدة الحفظية' : 'خاتمة الآية', 
            icon: manualAid ? 'bi-bookmark-star' : 'bi-text-right', 
            content: manualAid ? manualAid.rule : `... ${endingText}` 
        },
        { 
            label: manualAid ? 'شرح التوجيه' : 'توجيه الفروق', 
            icon: 'bi-lightbulb', 
            content: manualAid ? manualAid.notes : (dynamicAid ? dynamicAid.uniqueWords : 'لا توجد فروق لفظية') 
        }
    ] : []

    const [moonPositions, setMoonPositions] = useState([]);

    useEffect(() => {
        if (!currentItem || !currentGroup) return;

        const updateLayout = () => {
            const width = window.innerWidth;
            const height = window.innerHeight;
            if (width < 768) return;

            const layout = calculateDynamicLayout(width, height, currentGroup.id);
            setMoonPositions(layout);
        };

        updateLayout();
        window.addEventListener('resize', updateLayout);
        return () => window.removeEventListener('resize', updateLayout);
    }, [activeIndex, subIndex, currentGroup?.id]);

    const getMoonPosition = (i) => {
        if (moonPositions && moonPositions[i]) {
            return moonPositions[i];
        }
        const fallback = [
            { top: '23%', left: '88%' },  // Top-Right
            { top: '72%', left: '88%' },  // Bottom-Right
            { top: '72%', left: '12%' },  // Bottom-Left
            { top: '23%', left: '12%' }   // Top-Left
        ];
        return fallback[i] || { top: '50%', left: '50%' };
    };

    // =============================================
    // DYNAMIC SPRING SNAPPING PHYSICS ANIMATION
    // =============================================
    const animateWiggleInPlace = (idx) => {
        if (springAnimIds.current[idx]) {
            cancelAnimationFrame(springAnimIds.current[idx])
        }

        const releasedX = satOffsets.current[idx].x
        const releasedY = satOffsets.current[idx].y
        const startTime = Date.now()
        const duration = 500 // ms - snappy 0.5s wiggle in place

        if (!containerRef.current || !hubRef.current) return
        const cRect = containerRef.current.getBoundingClientRect()
        const hRect = hubRef.current.getBoundingClientRect()
        const hCx = hRect.left - cRect.left + hRect.width / 2
        const hCy = hRect.top - cRect.top + hRect.height / 2
        const hHalfW = hRect.width / 2
        const hHalfH = hRect.height / 2

        const satEl = satRefsList[idx].current
        if (!satEl) return
        const sRect = satEl.getBoundingClientRect()
        const sR = sRect.width / 2

        // Determine base center without drag offset
        const initialCx = sRect.left - cRect.left + sR - releasedX
        const initialCy = sRect.top - cRect.top + sR - releasedY

        const step = () => {
            const elapsed = (Date.now() - startTime) / 1000 // seconds
            const totalDurationSec = duration / 1000

            if (elapsed >= totalDurationSec) {
                // Settle exactly at released position
                satOffsets.current[idx] = { x: releasedX, y: releasedY }
                if (satEl) {
                    satEl.style.transform = `translate(calc(-50% + ${releasedX}px), calc(-50% + ${releasedY}px)) scale(1) rotate(0deg)`
                }
                
                // Recalculate static lines to be perfect
                calculateLines()
                springAnimIds.current[idx] = null
                return
            }

            // Exponential decay: e^(-8t) - quick fade out of wiggle
            const decay = Math.exp(-8 * elapsed)
            
            // Rapid oscillation frequencies
            const freqX = 45 // rad/s
            const freqY = 40 // rad/s
            const freqRot = 50 // rad/s
            
            // Amplitudes (fixed size wiggle around current coordinates)
            const ampX = 16 // px
            const ampY = 16 // px
            const ampRot = 12 // deg
            const ampScale = 0.10 // 10% scale squash/stretch

            const wiggleX = ampX * Math.sin(freqX * elapsed) * decay
            const wiggleY = ampY * Math.cos(freqY * elapsed) * decay
            const wiggleRot = ampRot * Math.sin(freqRot * elapsed) * decay
            const wiggleScale = 1 + ampScale * Math.cos(freqX * 2 * elapsed) * decay

            const x = releasedX + wiggleX
            const y = releasedY + wiggleY

            // 1. Update offset ref
            satOffsets.current[idx] = { x, y }

            // 2. Update satellite style directly with scale and rotation
            if (satEl) {
                satEl.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(${wiggleScale}) rotate(${wiggleRot}deg)`
            }

            // 3. Update line and gradient
            const sCx = initialCx + x
            const sCy = initialCy + y

            const angle = Math.atan2(sCy - hCy, sCx - hCx)
            const cos = Math.cos(angle)
            const sin = Math.sin(angle)

            const scaleX = cos !== 0 ? Math.abs(hHalfW / cos) : Infinity
            const scaleY = sin !== 0 ? Math.abs(hHalfH / sin) : Infinity
            const hubScale = Math.min(scaleX, scaleY)

            const x1 = hCx + cos * hubScale
            const y1 = hCy + sin * hubScale
            const x2 = sCx - cos * sR
            const y2 = sCy - sin * sR

            const lineEl = lineRefsList[idx].current
            if (lineEl) {
                lineEl.setAttribute('x1', x1)
                lineEl.setAttribute('y1', y1)
                lineEl.setAttribute('x2', x2)
                lineEl.setAttribute('y2', y2)
            }

            const grad = document.getElementById(`mut-lg${idx}`)
            if (grad) {
                grad.setAttribute('x1', x1)
                grad.setAttribute('y1', y1)
                grad.setAttribute('x2', x2)
                grad.setAttribute('y2', y2)
            }

            lineCoords.current[idx] = { x1, y1, x2, y2 }

            springAnimIds.current[idx] = requestAnimationFrame(step)
        }

        springAnimIds.current[idx] = requestAnimationFrame(step)
    }

    // =============================================
    // DRAG HANDLERS (Pointer Events for mouse+touch)
    // =============================================
    const onPointerDown = useCallback((i, e) => {
        if (isMobile || !containerRef.current || !hubRef.current) return

        // Instantly cancel bounce back animation if user grabs it mid-flight
        if (springAnimIds.current[i]) {
            cancelAnimationFrame(springAnimIds.current[i])
            springAnimIds.current[i] = null
        }

        setDragging(i)
        
        // Cache geometry once at start of drag to avoid layout thrashing during drag
        const cRect = containerRef.current.getBoundingClientRect()
        const hRect = hubRef.current.getBoundingClientRect()
        const hCx = hRect.left - cRect.left + hRect.width / 2
        const hCy = hRect.top - cRect.top + hRect.height / 2
        const hHalfW = hRect.width / 2
        const hHalfH = hRect.height / 2
        
        const satellites = satRefsList.map((ref, idx) => {
            const el = ref.current
            if (!el) return null
            const sRect = el.getBoundingClientRect()
            const currentOffset = satOffsets.current[idx]
            const sR = sRect.width / 2
            return {
                initialCx: sRect.left - cRect.left + sR - currentOffset.x,
                initialCy: sRect.top - cRect.top + sR - currentOffset.y,
                radius: sR
            }
        })

        dragContext.current = {
            cRect,
            hCx,
            hCy,
            hHalfW,
            hHalfH,
            satellites
        }

        dragStart.current = {
            x: e.clientX - satOffsets.current[i].x,
            y: e.clientY - satOffsets.current[i].y
        }
        
        e.currentTarget.setPointerCapture(e.pointerId)
        e.preventDefault()
    }, [isMobile])

    const onPointerMove = useCallback((e) => {
        if (dragging === null || !dragContext.current) return
        
        const deltaX = e.clientX - dragStart.current.x
        const deltaY = e.clientY - dragStart.current.y
        
        // 1. Update offset ref
        satOffsets.current[dragging] = { x: deltaX, y: deltaY }
        
        // 2. Update satellite element style directly (no React state trigger)
        const satEl = satRefsList[dragging].current
        if (satEl) {
            satEl.style.transform = `translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px))`
        }
        
        // 3. Update matching SVG line & gradient directly
        const ctx = dragContext.current
        const sat = ctx.satellites[dragging]
        if (sat) {
            const sCx = sat.initialCx + deltaX
            const sCy = sat.initialCy + deltaY
            const hCx = ctx.hCx
            const hCy = ctx.hCy
            const hHalfW = ctx.hHalfW
            const hHalfH = ctx.hHalfH

            const angle = Math.atan2(sCy - hCy, sCx - hCx)
            const cos = Math.cos(angle)
            const sin = Math.sin(angle)

            const scaleX = cos !== 0 ? Math.abs(hHalfW / cos) : Infinity
            const scaleY = sin !== 0 ? Math.abs(hHalfH / sin) : Infinity
            const hubScale = Math.min(scaleX, scaleY)

            const x1 = hCx + cos * hubScale
            const y1 = hCy + sin * hubScale
            const x2 = sCx - cos * sat.radius
            const y2 = sCy - sin * sat.radius

            const lineEl = lineRefsList[dragging].current
            if (lineEl) {
                lineEl.setAttribute('x1', x1)
                lineEl.setAttribute('y1', y1)
                lineEl.setAttribute('x2', x2)
                lineEl.setAttribute('y2', y2)
            }

            const grad = document.getElementById(`mut-lg${dragging}`)
            if (grad) {
                grad.setAttribute('x1', x1)
                grad.setAttribute('y1', y1)
                grad.setAttribute('x2', x2)
                grad.setAttribute('y2', y2)
            }

            // Sync to lineCoords ref for persistence across react renders
            lineCoords.current[dragging] = { x1, y1, x2, y2 }
        }
    }, [dragging])

    const onPointerUp = useCallback(() => {
        if (dragging !== null) {
            animateWiggleInPlace(dragging)
        }
        setDragging(null)
        dragContext.current = null
    }, [dragging])

    // =============================================
    // DYNAMIC SVG LINES (border-to-border)
    // =============================================
    const calculateLines = useCallback(() => {
        if (isMobile || !hubRef.current || !containerRef.current) return

        const cRect = containerRef.current.getBoundingClientRect()
        const hRect = hubRef.current.getBoundingClientRect()
        const hCx = hRect.left - cRect.left + hRect.width / 2
        const hCy = hRect.top - cRect.top + hRect.height / 2
        const hHalfW = hRect.width / 2
        const hHalfH = hRect.height / 2

        satRefsList.forEach((ref, i) => {
            const el = ref.current
            if (!el) return
            const sRect = el.getBoundingClientRect()
            const sCx = sRect.left - cRect.left + sRect.width / 2
            const sCy = sRect.top - cRect.top + sRect.height / 2
            const sR = sRect.width / 2

            const angle = Math.atan2(sCy - hCy, sCx - hCx)
            const cos = Math.cos(angle)
            const sin = Math.sin(angle)

            const scaleX = cos !== 0 ? Math.abs(hHalfW / cos) : Infinity
            const scaleY = sin !== 0 ? Math.abs(hHalfH / sin) : Infinity
            const hubScale = Math.min(scaleX, scaleY)

            const x1 = hCx + cos * hubScale
            const y1 = hCy + sin * hubScale
            const x2 = sCx - cos * sR
            const y2 = sCy - sin * sR

            // Update SVG line directly
            const lineEl = lineRefsList[i].current
            if (lineEl) {
                lineEl.setAttribute('x1', x1)
                lineEl.setAttribute('y1', y1)
                lineEl.setAttribute('x2', x2)
                lineEl.setAttribute('y2', y2)
            }

            // Update linearGradient directly
            const grad = document.getElementById(`mut-lg${i}`)
            if (grad) {
                grad.setAttribute('x1', x1)
                grad.setAttribute('y1', y1)
                grad.setAttribute('x2', x2)
                grad.setAttribute('y2', y2)
            }

            // Sync to lineCoords ref
            lineCoords.current[i] = { x1, y1, x2, y2 }
        })
    }, [isMobile])

    // Recalculate lines on resize/resize observer events
    useEffect(() => {
        if (isMobile) return
        const onResize = () => setTimeout(calculateLines, 100)
        window.addEventListener('resize', onResize)
        const initTimer = setTimeout(calculateLines, 150)
        return () => {
            window.removeEventListener('resize', onResize)
            clearTimeout(initTimer)
        }
    }, [calculateLines, isMobile])
    // =============================================
    // SHARED COMPONENTS
    // =============================================
    const AyahMarker = ({ num }) => (
        <span style={{ userSelect: 'none', margin: '0 4px', color: 'var(--accent-gold)', fontSize: '0.75em', fontFamily: 'sans-serif' }}>
            ﴿{num}﴾
        </span>
    )

    const getCCICategory = (item) => {
        if (!item || !currentGroup) return null
        const docFreq = currentGroup.items.length
        let totalCCI = 0
        let comparisonCount = 0
        currentGroup.items.forEach(other => {
            if (other.key !== item.key) {
                const score = calculateCCI(item.text, other.text, docFreq)
                totalCCI += score
                comparisonCount++
            }
        })
        const score = comparisonCount > 0 ? totalCCI / comparisonCount : 0
        
        if (score >= 0.75) {
            return { label: 'تداخل حرج 🔴', color: '#ef4444' }
        } else if (score >= 0.40) {
            return { label: 'تداخل متوسط 🟡', color: '#ffc107' }
        } else {
            return { label: 'تداخل سطحي 🟢', color: '#10b981' }
        }
    }

    // =============================================
    // QuranText — pure inline flow, wraps naturally
    // =============================================
    const QuranText = ({ item = currentItem, fontSize = '1.5rem' }) => {
        if (!item) return null
        const words = item.text.split(/\s+/)
        const prevText = item.context?.prev || ''
        const nextText = item.context?.next || ''
        return (
            <p className="mut-quran-text" style={{ fontSize }}>
                {prevText && (
                    <React.Fragment>
                        <span className="mut-ctx">{prevText}</span>
                        <AyahMarker num={item.ayah - 1} />
                        {' '}
                    </React.Fragment>
                )}
                {words.map((word, i) => {
                    const isShared = item.ranges.some(([s, e]) => i >= s && i < e)
                    return (
                        <React.Fragment key={i}>
                            <span className={isShared ? 'mut-word-shared' : undefined}>{word}</span>
                            {' '}
                        </React.Fragment>
                    )
                })}
                <AyahMarker num={item.ayah} />
                {nextText && (
                    <React.Fragment>
                        {' '}
                        <span className="mut-ctx">{nextText}</span>
                        <AyahMarker num={item.ayah + 1} />
                    </React.Fragment>
                )}
            </p>
        )
    }

    // ---- Modal data (memoized) ----
    const surahsInData = React.useMemo(() => {
        const map = new Map()
        filteredData.forEach(group => {
            group.items.forEach(item => {
                if (!map.has(item.surah)) {
                    map.set(item.surah, { surahId: item.surah, surahName: item.surahName, groupCount: 0 })
                }
                map.get(item.surah).groupCount++
            })
        })
        return Array.from(map.values()).sort((a, b) => a.surahId - b.surahId)
    }, [filteredData])

    // Groups that contain the selected surah, optionally filtered by search query
    const groupsForSelectedSurah = React.useMemo(() => {
        if (!modalSelectedSurah) return []
        const query = groupSearchQuery ? normalizeArabic(groupSearchQuery.toLowerCase()) : ''
        return filteredData.filter(group => {
            const hasSurah = group.items.some(it => it.surah === modalSelectedSurah)
            if (!hasSurah) return false
            if (!query) return true
            return normalizeArabic(group.phraseText).toLowerCase().includes(query)
        })
    }, [filteredData, modalSelectedSurah, groupSearchQuery])

    // Surahs filtered by search when no surah selected
    const filteredSurahs = React.useMemo(() => {
        if (!groupSearchQuery) return surahsInData
        const query = normalizeArabic(groupSearchQuery.toLowerCase())
        return surahsInData.filter(s => normalizeArabic(s.surahName).toLowerCase().includes(query))
    }, [surahsInData, groupSearchQuery])

    // ── Modal close helper ──
    const closeModal = () => {
        React.startTransition(() => {
            setShowGroupModal(false)
            setModalSelectedSurah(null)
            setGroupSearchQuery('')
        })
    }

    // ── GroupModal component ──
    const GroupModal = () => {
        const [localSearchQuery, setLocalSearchQuery] = useState(groupSearchQuery)

        useEffect(() => {
            setLocalSearchQuery(groupSearchQuery)
        }, [groupSearchQuery])

        return (
            <div className="mut-overlay" onClick={closeModal}>
                <div className="mut-modal" onClick={e => e.stopPropagation()}>

                    {/* Header */}
                    <div className="mut-modal-hdr">
                        {modalSelectedSurah ? (
                            <button className="mut-modal-back-btn" onClick={() => {
                                React.startTransition(() => {
                                    setModalSelectedSurah(null);
                                    setGroupSearchQuery('');
                                });
                            }}>
                                <i className="bi bi-arrow-right me-1"></i>
                                السور
                            </button>
                        ) : (
                            <span className="mut-modal-title">
                                <i className="bi bi-journals me-2 text-gold"></i>
                                اختر سورة
                            </span>
                        )}
                        {modalSelectedSurah && (
                            <span className="mut-modal-surah-name">
                                {surahsInData.find(s => s.surahId === modalSelectedSurah)?.surahName}
                                <span className="mut-modal-cnt">({groupsForSelectedSurah.length} موضوع)</span>
                            </span>
                        )}
                        <button className="mut-modal-close-btn" onClick={closeModal} aria-label="إغلاق">✕</button>
                    </div>

                    {/* Search */}
                    <div className="mut-modal-search-row">
                        <i className="bi bi-search mut-search-ico"></i>
                        <input
                            className="mut-search-inp"
                            type="text"
                            placeholder={modalSelectedSurah ? 'ابحث في المواضيع...' : 'ابحث عن سورة...'}
                            value={localSearchQuery}
                            onChange={e => {
                                const val = e.target.value;
                                setLocalSearchQuery(val);
                                React.startTransition(() => {
                                    setGroupSearchQuery(val);
                                });
                            }}
                            autoFocus
                        />
                        {localSearchQuery && (
                            <button className="mut-search-clr" onClick={() => {
                                setLocalSearchQuery('');
                                React.startTransition(() => {
                                    setGroupSearchQuery('');
                                });
                            }}>✕</button>
                        )}
                    </div>

                    {/* Body */}
                    <div 
                        className="mut-modal-body"
                        onScroll={(e) => {
                            const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
                            if (scrollHeight - scrollTop - clientHeight < 100) {
                                if (!modalSelectedSurah) {
                                    setVisibleSurahCount(prev => Math.min(filteredSurahs.length, prev + 24));
                                } else {
                                    setVisibleTopicCount(prev => Math.min(groupsForSelectedSurah.length, prev + 15));
                                }
                            }
                        }}
                    >
                        {!modalSelectedSurah ? (
                            /* Level 1: Surah grid */
                            <div className="mut-surah-grid">
                                {filteredSurahs.slice(0, visibleSurahCount).map(surah => {
                                    const groupsInSurah = filteredData.filter(g => g.items.some(it => it.surah === surah.surahId))
                                    const isActive = filteredData[activeIndex]?.items.some(it => it.surah === surah.surahId)
                                    return (
                                        <button
                                            key={surah.surahId}
                                            className={`mut-surah-card${isActive ? ' active' : ''}`}
                                            onClick={() => {
                                                React.startTransition(() => {
                                                    setModalSelectedSurah(surah.surahId);
                                                    setGroupSearchQuery('');
                                                });
                                            }}
                                        >
                                            <span className="mut-surah-cnt-badge">{groupsInSurah.length} موضوع</span>
                                            <span className="mut-surah-name-txt">{surah.surahName}</span>
                                        </button>
                                    )
                                })}
                            </div>
                        ) : (
                            /* Level 2: Topics list */
                            <div className="mut-topics-list">
                                {groupsForSelectedSurah.slice(0, visibleTopicCount).map(group => {
                                    const isActive = filteredData[activeIndex]?.id === group.id
                                    const locations = group.items.map(it => `${it.surahName} ${it.ayah}`).join(' ← ')
                                    return (
                                        <div
                                            key={group.id}
                                            className={`mut-topic-card${isActive ? ' active' : ''}`}
                                            onClick={() => {
                                                const idx = filteredData.findIndex(g => g.id === group.id)
                                                if (idx !== -1) {
                                                    React.startTransition(() => {
                                                        setActiveIndex(idx);
                                                        setSubIndex(0);
                                                        closeModal();
                                                    });
                                                }
                                            }}
                                        >
                                            <div className="mut-topic-hdr">
                                                <span className="mut-cci-tag" style={{ color: getGroupCCIBadge(group).color, borderColor: getGroupCCIBadge(group).color + '50', backgroundColor: getGroupCCIBadge(group).color + '18' }}>
                                                    {getGroupCCIBadge(group).label}
                                                </span>
                                                <span className="mut-topic-places">{group.items.length} مواضع</span>
                                            </div>
                                            <div className="mut-topic-phrase">{group.phraseText || 'عبارة متشابهة'}</div>
                                            <div className="mut-topic-locs">{locations}</div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    // ── Empty State ──
    if (filteredData.length === 0) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
                <div style={{ position: 'absolute', top: 16, right: 20 }}>
                    <BackButton onClick={onBack} direction="left" />
                </div>
                <div className="alert alert-warning text-center" style={{ maxWidth: 480, margin: '0 1rem' }}>
                    <i className="bi bi-exclamation-triangle-fill d-block fs-1 mb-3"></i>
                    <h4>لا توجد متشابهات متاحة</h4>
                    <p>لم يتم العثور على متشابهات متكررة في الصفحات التي قمت بحفظها.</p>
                    <p className="small text-muted mb-0">قم بحفظ المزيد من الصفحات لفتح تدريبات المتشابهات.</p>
                </div>
            </div>
        )
    }

    if (!currentItem) return null

    // =============================================
    // MOBILE LAYOUT
    // position:fixed full-screen, flex-column, natural flow inside
    // =============================================
    if (isMobile) {
        return (
            <div className="mut-page-mobile">

                {/* ── Header ── */}
                <div className="mut-mob-hdr">
                    <BackButton onClick={onBack} direction="left" />
                    <div className="mut-mob-hdr-mid">
                        <div className="mut-mob-phrase-short">
                            {currentGroup.phraseText
                                ? currentGroup.phraseText.split(/\s+/).slice(0, 4).join(' ')
                                : 'متشابهة قرآنية'}
                        </div>
                        <div className="mut-mob-prog">{activeIndex + 1} / {filteredData.length}</div>
                    </div>
                    <button className="mut-browse-btn" onClick={() => setShowGroupModal(true)}>
                        <i className="bi bi-layers"></i>
                        <span>السور</span>
                    </button>
                </div>

                {/* ── Body (natural scroll) ── */}
                <div className="mut-mob-body">

                    {/* Quran Card — NO fixed height, content drives height */}
                    <div className="mut-quran-card">
                        <div className="mut-quran-card-hdr">
                            <span className="mut-surah-tag">
                                <i className="bi bi-book me-1"></i>
                                {currentItem.surahName}
                            </span>
                            <span className="mut-ayah-tag">آية {currentItem.ayah} · ص {currentItem.page}</span>
                        </div>
                        {/* Text area: max-height + scroll only if needed */}
                        <ReviewEngine
                            pages={currentGroup.items}
                            initialIndex={subIndex}
                            viewMode="horizontal"
                            onIndexChange={setSubIndex}
                            className="mut-quran-card-body"
                            renderPage={(item) => (
                                <QuranText item={item} fontSize="1.2rem" />
                            )}
                        />
                    </div>

                    {/* Item navigator: prev arrow · dots · next arrow */}
                    <div className="mut-item-nav">
                        <button
                            className="mut-nav-arrow-btn"
                            onClick={handlePrevSub}
                            disabled={subIndex === 0}
                            aria-label="الآية السابقة"
                        >
                            <i className="bi bi-chevron-right"></i>
                        </button>
                        <div className="mut-dots-row">
                            {currentGroup.items.map((it, idx) => (
                                <button
                                    key={idx}
                                    className={`mut-dot${idx === subIndex ? ' active' : ''}`}
                                    onClick={() => setSubIndex(idx)}
                                    title={`${it.surahName} ${it.ayah}`}
                                />
                            ))}
                        </div>
                        <button
                            className="mut-nav-arrow-btn"
                            onClick={handleNextSub}
                            disabled={subIndex === currentGroup.items.length - 1}
                            aria-label="الآية التالية"
                        >
                            <i className="bi bi-chevron-left"></i>
                        </button>
                    </div>

                    {/* Info cards 2×2 — no absolute, natural grid flow */}
                    <div className="mut-info-grid">
                        {satellites.map((sat, i) => (
                            <div key={i} className="mut-info-card" style={{ '--sat-clr': SAT_COLORS[i] }}>
                                <i className={`bi ${sat.icon} mut-info-ico`}></i>
                                <div className="mut-info-lbl">{sat.label}</div>
                                <div className="mut-info-val">{sat.content}</div>
                            </div>
                        ))}
                    </div>

                    {/* CCI difficulty badge */}
                    <div className="text-center">
                        <span className="mut-cci-tag" style={{ color: getGroupCCIBadge(currentGroup).color, borderColor: getGroupCCIBadge(currentGroup).color + '50', backgroundColor: getGroupCCIBadge(currentGroup).color + '18' }}>
                            {getGroupCCIBadge(currentGroup).label}
                        </span>
                    </div>

                    {/* Shared phrase */}
                    {currentGroup.phraseText && (
                        <div className="mut-phrase-row">
                            <i className="bi bi-link-45deg me-1"></i>
                            العبارة المشتركة:&nbsp;
                            <span className="mut-phrase-txt">{currentGroup.phraseText}</span>
                        </div>
                    )}

                </div>{/* end body */}

                {/* ── Fixed Footer ── */}
                <div className="mut-mob-footer">
                    <button
                        className="mut-foot-btn secondary"
                        onClick={handlePrevGroup}
                        disabled={activeIndex === 0}
                    >
                        <i className="bi bi-arrow-right me-1"></i>
                        السابق
                    </button>
                    <span className="mut-foot-counter">{activeIndex + 1} / {filteredData.length}</span>
                    <button
                        className="mut-foot-btn primary"
                        onClick={handleNextGroup}
                        disabled={activeIndex === filteredData.length - 1}
                    >
                        التالي
                        <i className="bi bi-arrow-left ms-1"></i>
                    </button>
                </div>

                {showGroupModal && <GroupModal />}
                <TutorialOverlay
                    steps={tutorialSteps}
                    isOpen={showTutorial}
                    onClose={handleTutorialComplete}
                />
            </div>
        )
    }

    // =============================================
    // DESKTOP LAYOUT
    // CSS Grid orbit: 3×3 grid — hub center, sats in cross positions
    // No absolute positioning for satellites → zero overlap guaranteed
    // =============================================
    return (
        <div
            ref={containerRef}
            className="mut-page-desktop"
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            style={{ cursor: dragging !== null ? 'grabbing' : 'default' }}
        >            {/* SVG Lines — fullscreen absolute overlay, pointer-events:none */}
            <svg className="mut-svg-overlay" aria-hidden="true">
                <defs>
                    {SAT_COLORS.map((color, i) => (
                        <linearGradient
                            key={i} id={`mut-lg${i}`}
                            x1={lineCoords.current[i]?.x1 ?? 0} y1={lineCoords.current[i]?.y1 ?? 0}
                            x2={lineCoords.current[i]?.x2 ?? 0} y2={lineCoords.current[i]?.y2 ?? 0}
                            gradientUnits="userSpaceOnUse"
                        >
                            <stop offset="0%" stopColor="var(--accent-gold)" stopOpacity="0.4" />
                            <stop offset="100%" stopColor={color} stopOpacity="0.4" />
                        </linearGradient>
                    ))}
                </defs>
                {lineRefsList.map((ref, i) => (
                    <line key={i}
                        ref={ref}
                        x1={lineCoords.current[i]?.x1 ?? 0} y1={lineCoords.current[i]?.y1 ?? 0}
                        x2={lineCoords.current[i]?.x2 ?? 0} y2={lineCoords.current[i]?.y2 ?? 0}
                        stroke={`url(#mut-lg${i})`}
                        strokeWidth="1.5"
                        strokeDasharray="7 4"
                    />
                ))}
            </svg>

            {/* ── Top Bar — flex row, relative flow ── */}
            <div className="mut-desk-topbar">
                <button className="mut-browse-btn-desk" onClick={() => setShowGroupModal(true)}>
                    <i className="bi bi-layers me-2"></i>
                    استعراض السور ({surahsInData.length})
                </button>
                <div className="mut-desk-topbar-mid" style={{ position: "relative", left: "10vh" }}>
                    <span className="mut-cci-badge-desk"
                        style={{ color: getGroupCCIBadge(currentGroup).color, borderColor: getGroupCCIBadge(currentGroup).color + '40', backgroundColor: getGroupCCIBadge(currentGroup).color + '12' }}>
                        {getGroupCCIBadge(currentGroup).label}
                    </span>
                </div>
                <BackButton onClick={onBack} />
            </div>
            
            {/* ── Orbit Grid — the heart of the layout ──
                3 columns: [sat-side] [hub-area] [sat-side]
                3 rows:    [sat-top]  [hub+sats] [sat-bottom]
                Hub occupies col2/row2. Sats in cross positions.
                No element can visually overlap another.
            ── */}
            <div className="mut-orbit-grid">

                {/* SAT 0 — Top-Right quadrant */}
                <div
                    ref={sat0}
                    className="mut-satellite"
                    onPointerDown={(e) => onPointerDown(0, e)}
                    style={{
                        position: 'absolute',
                        top: getMoonPosition(0).top,
                        left: getMoonPosition(0).left,
                        transform: `translate(calc(-50% + ${satOffsets.current[0].x}px), calc(-50% + ${satOffsets.current[0].y}px))`,
                        '--sat-clr': SAT_COLORS[0],
                        cursor: dragging === 0 ? 'grabbing' : 'grab',
                        zIndex: dragging === 0 ? 25 : 12,
                        animation: 'satAppear 0.35s ease 0s both',
                    }}
                >
                    <i className={`bi ${satellites[0]?.icon} mut-sat-ico`}></i>
                    <div className="mut-sat-lbl">{satellites[0]?.label}</div>
                    <div className="mut-sat-val">{satellites[0]?.content}</div>
                </div>

                {/* SAT 1 — Bottom-Right quadrant */}
                <div
                    ref={sat1}
                    className="mut-satellite"
                    onPointerDown={(e) => onPointerDown(1, e)}
                    style={{
                        position: 'absolute',
                        top: getMoonPosition(1).top,
                        left: getMoonPosition(1).left,
                        transform: `translate(calc(-50% + ${satOffsets.current[1].x}px), calc(-50% + ${satOffsets.current[1].y}px))`,
                        '--sat-clr': SAT_COLORS[1],
                        cursor: dragging === 1 ? 'grabbing' : 'grab',
                        zIndex: dragging === 1 ? 25 : 12,
                        animation: 'satAppear 0.35s ease 0.08s both',
                    }}
                >
                    <i className={`bi ${satellites[1]?.icon} mut-sat-ico`}></i>
                    <div className="mut-sat-lbl">{satellites[1]?.label}</div>
                    <div className="mut-sat-val">{satellites[1]?.content}</div>
                </div>

                {/* SAT 2 — Bottom-Left quadrant */}
                <div
                    ref={sat2}
                    className="mut-satellite"
                    onPointerDown={(e) => onPointerDown(2, e)}
                    style={{
                        position: 'absolute',
                        top: getMoonPosition(2).top,
                        left: getMoonPosition(2).left,
                        transform: `translate(calc(-50% + ${satOffsets.current[2].x}px), calc(-50% + ${satOffsets.current[2].y}px))`,
                        '--sat-clr': SAT_COLORS[2],
                        cursor: dragging === 2 ? 'grabbing' : 'grab',
                        zIndex: dragging === 2 ? 25 : 12,
                        animation: 'satAppear 0.35s ease 0.16s both',
                    }}
                >
                    <i className={`bi ${satellites[2]?.icon} mut-sat-ico`}></i>
                    <div className="mut-sat-lbl">{satellites[2]?.label}</div>
                    <div className="mut-sat-val">{satellites[2]?.content}</div>
                </div>

                {/* SAT 3 — Top-Left quadrant */}
                <div
                    ref={sat3}
                    className="mut-satellite"
                    onPointerDown={(e) => onPointerDown(3, e)}
                    style={{
                        position: 'absolute',
                        top: getMoonPosition(3).top,
                        left: getMoonPosition(3).left,
                        transform: `translate(calc(-50% + ${satOffsets.current[3].x}px), calc(-50% + ${satOffsets.current[3].y}px))`,
                        '--sat-clr': SAT_COLORS[3],
                        cursor: dragging === 3 ? 'grabbing' : 'grab',
                        zIndex: dragging === 3 ? 25 : 12,
                        animation: 'satAppear 0.35s ease 0.24s both',
                    }}
                >
                    <i className={`bi ${satellites[3]?.icon} mut-sat-ico`}></i>
                    <div className="mut-sat-lbl">{satellites[3]?.label}</div>
                    <div className="mut-sat-val">{satellites[3]?.content}</div>
                </div>

                {/* ── Central Hub — col2/row2 ── */}
                <div className="mut-hub-cell" style={{ gridColumn: '2', gridRow: '2' }}>

                    {/* Sub-navigation arrow RIGHT (prev sub) */}
                    <button
                        className="mut-sub-arrow"
                        onClick={handlePrevSub}
                        disabled={subIndex === 0}
                        aria-label="الآية السابقة"
                        style={{ marginInlineEnd: '8px' }}
                    >
                        <i className="bi bi-chevron-right"></i>
                    </button>

                    {/* Hub Card */}
                    <div ref={hubRef} className="mut-hub-card">

                        {/* Hub Header — surah info */}
                        <div className="mut-hub-hdr">
                            <div className="mut-hub-loc">
                                <i className="bi bi-book text-gold me-2"></i>
                                <span>سورة {currentItem.surahName}</span>
                                <span className="mut-sep">·</span>
                                <span>آية {currentItem.ayah}</span>
                                <span className="mut-sep">·</span>
                                <span>ص {currentItem.page}</span>
                            </div>
                        </div>

                        {/* Hub Body — swipeable Quran text */}
                        <ReviewEngine
                            pages={currentGroup.items}
                            initialIndex={subIndex}
                            viewMode="horizontal"
                            onIndexChange={setSubIndex}
                            className="mut-hub-body"
                            renderPage={(item) => (
                                <QuranText item={item} fontSize="clamp(1.2rem, 1.7vw, 1.6rem)" />
                            )}
                        />

                        {/* Hub Footer — pills to jump between items */}
                        <div className="mut-hub-footer">
                            {currentGroup.items.map((it, idx) => (
                                <button
                                    key={idx}
                                    className={`mut-hub-pill${idx === subIndex ? ' active' : ''}`}
                                    onClick={() => setSubIndex(idx)}
                                >
                                    {it.surahName} {it.ayah}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Sub-navigation arrow LEFT (next sub) */}
                    <button
                        className="mut-sub-arrow"
                        onClick={handleNextSub}
                        disabled={subIndex === currentGroup.items.length - 1}
                        aria-label="الآية التالية"
                        style={{ marginInlineStart: '8px' }}
                    >
                        <i className="bi bi-chevron-left"></i>
                    </button>

                </div>{/* end hub-cell */}

            </div>{/* end orbit-grid */}

            {/* ── Bottom Bar — flex row, relative flow ── */}
            <div className="mut-desk-btmbar">
                <button
                    className="mut-group-btn secondary"
                    onClick={handlePrevGroup}
                    disabled={activeIndex === 0}
                >
                    <i className="bi bi-arrow-right me-1"></i>
                    الموضوع السابق
                </button>
                <span className="mut-group-counter">{activeIndex + 1} / {filteredData.length}</span>
                <button
                    className="mut-group-btn primary"
                    onClick={handleNextGroup}
                    disabled={activeIndex === filteredData.length - 1}
                >
                    الموضوع التالي
                    <i className="bi bi-arrow-left ms-1"></i>
                </button>
            </div>

            {showGroupModal && <GroupModal />}
            <TutorialOverlay
                steps={tutorialSteps}
                isOpen={showTutorial}
                onClose={handleTutorialComplete}
            />
            
        </div>
        
    )
}

export default MutashabihatTrainer

