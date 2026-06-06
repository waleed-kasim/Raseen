import { StorageService } from './storage'
import { annotationService } from './annotations'

export const SRSService = {
    // BSRS Constants
    INITIAL_EASE: 2.3,
    MIN_EASE: 1.3,
    MAX_EASE: 3.0,
    BASE_MAX_INTERVAL: 180, // days
    
    // التقييمات والحدود
    OPTIMISM_BIAS_PENALTY: 0.05,
    BOUNDARIES: {
        5: { min: 2.6, max: 3.0, shift: 0.25 },  // ممتاز
        4: { min: 2.2, max: 2.6, shift: 0.10 },  // سهل
        3: { min: 1.8, max: 2.2, shift: -0.05 }, // جيد (انحياز تفاؤل)
        2: { min: 1.5, max: 1.8, shift: -0.15 }, // صعب
        1: { min: 1.3, max: 1.5, shift: -0.30 }  // نسيت
    },

    /**
     * Calculate next review schedule based on BSRS logic
     * @param {object} currentSRS 
     * @param {number} grade - 1-5 rating
     */
    calculateNext(currentSRS, grade) {
        const prevEaseFactor = currentSRS?.easeFactor || 2.3
        let { interval, reps, easeFactor, failureCount, history } = currentSRS || {
            interval: 0,
            reps: 0,
            easeFactor: 2.3,
            failureCount: 0,
            history: []
        }

        // Initialize defaults if missing
        easeFactor = easeFactor || 2.3
        failureCount = failureCount || 0
        history = history || []

        // Update History (Keep last 10)
        history.push(grade)
        if (history.length > 10) history.shift()

        // 1. Ease Factor — hard clamp to rated grade's zone boundary (snap to nearest edge)
        const config = this.BOUNDARIES[grade] || { shift: 0, min: 1.3, max: 3.0 }
        easeFactor += config.shift
        easeFactor = Math.max(config.min, Math.min(config.max, easeFactor))
        easeFactor = Math.max(this.MIN_EASE, Math.min(this.MAX_EASE, easeFactor)) // global safety

        // 2. Interval & Reps Calculation
        if (grade >= 3) {
            if (reps === 0) {
                interval = 1
            } else if (reps === 1) {
                interval = 3
            } else {
                interval = Math.round(interval * easeFactor)
            }
            reps += 1
        } else {
            reps = 0
            interval = 1
            failureCount += 1
        }

        // 3. Zone-Jump (bidirectional, all boundaries)
        // Map an EF value to its zone number (1–5) for comparison
        const getZone = (ef) => {
            if (ef >= 2.6) return 5
            if (ef >= 2.2) return 4
            if (ef >= 1.8) return 3
            if (ef >= 1.5) return 2
            return 1
        }
        const prevZone = getZone(prevEaseFactor)
        const newZone  = getZone(easeFactor)
        const zoneDelta = newZone - prevZone // positive = improved, negative = dropped

        if (zoneDelta > 0 && grade >= 4) {
            // Jumped UP zones: reward recovery — multiply interval per zone crossed
            // 1 zone up → ×1.5 | 2 zones → ×2 | 3 zones → ×2.5 | 4 zones → ×3
            const multiplier = 1 + (0.5 * zoneDelta)
            interval = Math.round(interval * multiplier)
            console.log(`[BSRS] Zone ↑ ${prevZone}→${newZone} (+${zoneDelta}): interval ×${multiplier}`)
        } else if (zoneDelta < 0 && grade >= 3) {
            // Dropped DOWN zones on a passing grade: flag sudden weakness
            // 1 zone down → ÷1.5 | 2 zones → ÷2 | 3 zones → ÷2.5 | 4 zones → ÷3
            const divisor = 1 + (0.5 * Math.abs(zoneDelta))
            interval = Math.max(1, Math.round(interval / divisor))
            console.log(`[BSRS] Zone ↓ ${prevZone}→${newZone} (${zoneDelta}): interval ÷${divisor}`)
        }
        // grade 1–2: reps already reset to 0 and interval=1 above — no extra penalty needed

        // 4. Dynamic Ceiling (Stability Score)
        const stabilityScore = Math.log2(reps + 1)
        const maxInterval = Math.round(this.BASE_MAX_INTERVAL * Math.max(1, stabilityScore))
        interval = Math.min(interval, maxInterval)

        // 5. Daily Cooldown — never suggest the same page twice in the same calendar day.
        // nextReview is always at least the start of tomorrow (next midnight).
        const now = Date.now()
        const nextMidnight = new Date()
        nextMidnight.setHours(24, 0, 0, 0)
        const computedNext = now + (interval * 24 * 60 * 60 * 1000)

        return {
            interval,
            reps,
            easeFactor,
            failureCount,
            history,
            lastReview: now,
            nextReview: Math.max(computedNext, nextMidnight.getTime())
        }
    },

    /**
     * BSRS Stratified Selection with Multi-Pool & Intersection
     * الصفحة يمكن أن تنتمي لأكثر من pool في نفس الوقت
     * pool "التقاطع" (intersection) = صفحات مشتركة في 2+ pools → أعلى أولوية
     */
    async getSmartPage(excludeIds = []) {
        const pages = StorageService.getMemorizedPages()
        if (pages.length === 0) return null

        const srsData = await this.getAllSRSData()
        const now = Date.now()

        // --- Step 1: Multi-Pool Classification (بدون return) ---
        const pools = {
            intersection: [], // صفحات مشتركة في 2+ pools (أعلى أولوية)
            due: [],
            risk: [],
            besieged: [],
            new: [],
            shadow: []
        }

        // حساب إتقان السور لميزة "إغلاق الحلقة"
        const surahMastery = {} // { surahId: { total: 0, strong: 0 } }
        pages.forEach(p => {
            const srs = srsData[p.id] || { easeFactor: 2.3 }
            if (!surahMastery[p.surahId]) surahMastery[p.surahId] = { total: 0, strong: 0 }
            surahMastery[p.surahId].total++
            if (srs.easeFactor > 2.5) surahMastery[p.surahId].strong++
        })

        pages.forEach(page => {
            if (excludeIds.includes(page.id)) return

            const srs = srsData[page.id] || { nextReview: 0, reps: 0, easeFactor: 2.3, history: [] }
            const item = { page, srs }
            const memberOf = [] // الحقول التي تنتمي إليها هذه الصفحة

            // "New" Pool — لا يتقاطع مع شيء (صفحة جديدة بالكامل)
            if (srs.reps === 0 && !srs.lastReview) {
                pools.new.push(item)
                return // الجديدة لا تدخل في التقاطع
            }

            // "Due" Pool
            if (srs.nextReview <= now) {
                pools.due.push(item)
                memberOf.push('due')
            }

            // "Risk" Pool (Low Ease OR Shaky history OR High Failures)
            const lastGrades = srs.history?.slice(-2) || []
            const isShaky = lastGrades.length >= 2 && lastGrades.every(g => g === 3)
            if (srs.easeFactor <= 1.7 || isShaky || (srs.failureCount > 5)) {
                pools.risk.push(item)
                memberOf.push('risk')
            }

            // "Besieged" Pool
            if (srs.isBesieged) {
                pools.besieged.push(item)
                memberOf.push('besieged')
            }

            // "Shadow" Pool (Long interval, stable, high ease)
            if (srs.interval >= 90 && srs.easeFactor >= 2.6) {
                pools.shadow.push(item)
                memberOf.push('shadow')
            }

            // --- بناء pool التقاطع ---
            if (memberOf.length >= 2) {
                pools.intersection.push({ ...item, memberOf })
            }
        })

        // --- Step 2: Pool Selection (Roulette) ---
        const hasIntersection = pools.intersection.length > 0
        const hasDue = pools.due.length > 0
        const hasRisk = pools.risk.length > 0
        const hasBesieged = pools.besieged.length > 0
        const hasNew = pools.new.length > 0
        const hasShadow = pools.shadow.length > 0

        // كل الحقول فارغة → Fallback
        if (!hasIntersection && !hasDue && !hasRisk && !hasBesieged && !hasNew && !hasShadow) {
            // "Review Ahead" Fallback Strategy
            let bestCandidate = null
            let minTime = Infinity
            const waitingPages = []

            // Respect daily cooldown even in fallback: skip pages reviewed today
            const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
            const todayMs = todayStart.getTime()

            pages.forEach(page => {
                if (excludeIds.includes(page.id)) return
                const srs = srsData[page.id] || srsData[String(page.id)]

                // Skip pages already reviewed today
                if (srs?.lastReview && srs.lastReview >= todayMs) return

                if (!srs || !srs.nextReview) {
                    waitingPages.push({ page, srs: srs || { nextReview: 0 } })
                    return
                }

                if (srs.nextReview < minTime) {
                    minTime = srs.nextReview
                    bestCandidate = { page, srs }
                }
            })

            if (waitingPages.length > 0) {
                const rnd = Math.floor(Math.random() * waitingPages.length)
                return waitingPages[rnd]
            }

            if (bestCandidate) {
                console.log(`[BSRS] Review Ahead: ${bestCandidate.page.id}`)
                return { ...bestCandidate.page, srs: bestCandidate.srs }
            }

            return null
        }

        // أوزان الحقول: التقاطع=100, محاصرة=80, مستحقة=60, خطر=25, جديدة=15, ظل=5
        let targetPool = 'due'
        const poolOptions = []
        if (hasIntersection) poolOptions.push({ id: 'intersection', weight: 100 })
        if (hasBesieged) poolOptions.push({ id: 'besieged', weight: 80 })
        if (hasDue) poolOptions.push({ id: 'due', weight: 60 })
        if (hasRisk) poolOptions.push({ id: 'risk', weight: 25 })
        if (hasNew) poolOptions.push({ id: 'new', weight: 15 })
        if (hasShadow) poolOptions.push({ id: 'shadow', weight: 5 })

        const totalPoolWeight = poolOptions.reduce((sum, p) => sum + p.weight, 0)
        let randomVal = Math.random() * totalPoolWeight

        for (const option of poolOptions) {
            randomVal -= option.weight
            if (randomVal <= 0) {
                targetPool = option.id
                break
            }
        }

        // Final fallback
        if (!pools[targetPool] || pools[targetPool].length === 0) {
            targetPool = Object.keys(pools).find(k => pools[k].length > 0)
        }

        const selectedPoolForLog = targetPool
        const candidates = pools[targetPool] || []

        if (candidates.length === 0) return null

        // --- Step 3: Weighted Selection within Pool ---
        const weightedCandidates = candidates.map(item => {
            let weight = 1
            const { srs } = item

            if (targetPool === 'intersection') {
                // وزن التقاطع = عدد الحقول المشتركة × وزن مركب
                const poolCount = item.memberOf?.length || 2
                const daysLate = srs.nextReview ? Math.max(0, (now - srs.nextReview) / (86400000)) : 0
                weight = poolCount * Math.pow(daysLate + 1, 1.2) * (2.5 / (srs.easeFactor || 2.3))
                // مضاعف إضافي للمحاصرات في التقاطع
                if (item.memberOf?.includes('besieged')) weight *= 1.5
                if (item.memberOf?.includes('risk')) weight *= 1.3
            }
            else if (targetPool === 'due') {
                const daysLate = Math.max(0, (now - srs.nextReview) / (86400000))
                weight = Math.pow(daysLate + 1, 1.4) * (2.5 / (srs.easeFactor || 2.5))

                const lastGrade = srs.history?.length ? srs.history[srs.history.length - 1] : 5
                if (lastGrade <= 3) weight *= 1.5

                // إغلاق الحلقة
                const mastery = surahMastery[item.page.surahId]
                if (mastery && mastery.total > 1 && (mastery.strong / mastery.total) > 0.8) {
                    weight *= 2.0
                }
            }
            else if (targetPool === 'risk' || targetPool === 'besieged') {
                weight = Math.pow(Math.max(0.1, 2.6 - (srs.easeFactor || 2.3)), 2) * (1 + (srs.failureCount || 0) / 10)
                if (targetPool === 'besieged') weight *= 2.0
            }
            else if (targetPool === 'new') {
                weight = 10
            }
            else if (targetPool === 'shadow') {
                weight = 2
            }

            return { ...item, weight }
        })

        // Pick one
        const totalWeight = weightedCandidates.reduce((sum, item) => sum + item.weight, 0)
        let r = Math.random() * totalWeight

        for (const item of weightedCandidates) {
            r -= item.weight
            if (r <= 0) {
                const poolInfo = item.memberOf ? ` [${item.memberOf.join('+')}]` : ''
                console.log(`[BSRS] Selected: ${item.page.id} from Pool: ${selectedPoolForLog}${poolInfo} (W:${item.weight.toFixed(1)})`)
                return { ...item.page, srs: item.srs }
            }
        }

        if (weightedCandidates.length > 0) {
            return { ...weightedCandidates[0].page, srs: weightedCandidates[0].srs }
        }

        return null
    },

    async saveSRS(pageId, rating) {
        const currentData = await this.getPageSRS(pageId)
        const nextData = this.calculateNext(currentData, rating)
        await annotationService.saveSRSData(pageId, nextData)

        // 1. فحص المحاصرة (Besieged Check)
        await this._checkBesieged(pageId, rating, nextData.easeFactor)

        // 2. تأثير السورة (Surah Impact)
        if (rating < 3) {
            await this._applySurahImpact(pageId)
        }

        return nextData
    },

    /**
     * كشف الصفحات "المحاصرة" (صفحة ضعيفة بين صفحتين قويتين)
     */
    async _checkBesieged(pageId, rating, currentEF) {
        if (!pageId.startsWith('page-')) return
        const parts = pageId.split('-')
        if (parts.length < 3) return
        const pageNum = parseInt(parts[1])
        
        // تحديد نطاق الفحص بناءً على التقييم
        // rating >= 4: فحص الصفحة الحالية فقط لإزالة علامة المحاصرة إن تحسنت
        // rating === 3: نطاق واسع ±2
        // rating < 3: نطاق ±1
        let checkRange = []
        if (rating >= 4) {
            checkRange = [pageNum - 1, pageNum, pageNum + 1]
        } else if (rating === 3) {
            checkRange = [pageNum - 2, pageNum - 1, pageNum, pageNum + 1, pageNum + 2]
        } else {
            checkRange = [pageNum - 1, pageNum, pageNum + 1]
        }

        const allSRS = await this.getAllSRSData()
        
        for (const num of checkRange) {
            if (num < 1 || num > 604) continue
            // Find all matching chunks for this page number from SRS
            // Since they are keyed like `page-${num}-${surahId}`
            const matchingKeys = Object.keys(allSRS).filter(k => k.startsWith(`page-${num}-`))
            if (matchingKeys.length === 0) continue

            // We average neighboring ease factors across all chunks of that page
            const getAverageEF = (n) => {
                const neighborKeys = Object.keys(allSRS).filter(k => k.startsWith(`page-${n}-`))
                if (neighborKeys.length === 0) return null
                let sum = 0
                neighborKeys.forEach(k => { sum += allSRS[k].easeFactor })
                return sum / neighborKeys.length
            }

            const prevAvgEF = getAverageEF(num - 1)
            const nextAvgEF = getAverageEF(num + 1)

            for (const targetId of matchingKeys) {
                const targetSRS = allSRS[targetId]
                if (!targetSRS) continue

                const isWeak = targetSRS.easeFactor < 1.8
                const hasStrongNeighbors = (prevAvgEF !== null && prevAvgEF > 2.5) && (nextAvgEF !== null && nextAvgEF > 2.5)

                if (isWeak && hasStrongNeighbors) {
                    if (!targetSRS.isBesieged) {
                        targetSRS.isBesieged = true
                        await annotationService.saveSRSData(targetId, targetSRS)
                    }
                } else if (targetSRS.isBesieged) {
                    delete targetSRS.isBesieged
                    await annotationService.saveSRSData(targetId, targetSRS)
                }
            }
        }
    },

    /**
     * تطبيق تأثير الفشل على كامل السورة
     */
    async _applySurahImpact(pageId) {
        if (!pageId.startsWith('page-')) return
        const parts = pageId.split('-')
        if (parts.length < 3) return
        const pageNum = parseInt(parts[1])
        const surahId = parseInt(parts[2])
        
        // الحصول على بيانات السورة من التخزين
        const allPages = StorageService.getSortedPages()
        const surahPages = allPages.filter(p => p.surahId === surahId)
        const allSRS = await this.getAllSRSData()

        const goodPenalty = this.BOUNDARIES[3].shift // -0.05
        const surahPenalty = goodPenalty / 5 // -0.01

        for (const p of surahPages) {
            // p.id is page-${p.pageNumber}-${p.surahId}
            if (p.id === pageId) continue // تخطي الصفحة الحالية (تم معالجتها بالفعل)
            
            const targetId = p.id
            const srs = allSRS[targetId]
            if (!srs) continue

            let penalty = surahPenalty
            // الجيران المباشرون يأخذون عقوبة "جيد" كاملة
            if (Math.abs(p.pageNumber - pageNum) === 1) {
                penalty = goodPenalty
            }

            srs.easeFactor = Math.max(this.MIN_EASE, srs.easeFactor + penalty)
            await annotationService.saveSRSData(targetId, srs)
        }
    },

    /**
     * Save SRS for a specific challenge item
     * @param {string} challengeType - e.g. "ayah_to_number"
     * @param {string} itemId - e.g. "2:255" (Surah 2, Ayah 255)
     * @param {number} rating - 1-5 grade
     */
    async saveChallengeSRS(challengeType, itemId, rating) {
        const compositeKey = `${challengeType}:${itemId}`
        // Get existing data or init
        const currentData = await annotationService.getSRSData(compositeKey)
        const nextData = this.calculateNext(currentData, rating)

        // Save with composite key
        await annotationService.saveSRSData(compositeKey, nextData)
        return nextData
    },

    /**
     * Generic BSRS Selection for ANY list of items
     * @param {string} challengeType - To filter SRS data
     * @param {Array} items - List of candidate items (must have unique .id property)
     */
    async getSmartChallengeItem(challengeType, items) {
        if (!items || items.length === 0) return null

        const allSRS = await this.getAllSRSData()
        const now = Date.now()

        // Pre-filter SRS data for this challenge type to optimize
        // data keys are like "challengeType:itemId"
        const prefix = `${challengeType}:`

        // Map items to their SRS data
        const candidates = items.map(item => {
            const key = `${prefix}${item.id}` // item.id must match what we passed to saveChallengeSRS
            const srs = allSRS[key] || { nextReview: 0, reps: 0, easeFactor: 2.5, history: [] }
            return { item, srs }
        })

        // --- Step 1: Pools ---
        const pools = {
            due: [],
            risk: [],
            new: [],
            shadow: []
        }

        candidates.forEach(cand => {
            const { srs } = cand

            // New
            if (srs.reps === 0 && !srs.lastReview) {
                pools.new.push(cand)
                return
            }

            // Due
            if (srs.nextReview <= now) {
                pools.due.push(cand)
                return
            }

            // Risk (Not due but shaky)
            const lastGrades = srs.history?.slice(-2) || []
            // Risk if EF is low OR failed recently
            if (srs.easeFactor <= 1.7 || (srs.failureCount > 3) || lastGrades.includes(1) || lastGrades.includes(2)) {
                pools.risk.push(cand)
                return
            }

            // Shadow (Review ahead for strong items)
            if (srs.interval > 20) {
                pools.shadow.push(cand)
                return
            }
        })

        // --- Step 2: Pool Selection (Weighted Random) ---
        // Weights: Due (60%), Risk (25%), New (10%), Shadow (5%)
        // Note: Modified slightly to prioritize Risk more if Due is empty

        let targetPool = 'due'

        // Dynamic pool weighting based on availability
        const availablePools = []
        if (pools.due.length > 0) availablePools.push({ id: 'due', weight: 60 })
        if (pools.risk.length > 0) availablePools.push({ id: 'risk', weight: 25 })
        if (pools.new.length > 0) availablePools.push({ id: 'new', weight: 10 })
        if (pools.shadow.length > 0) availablePools.push({ id: 'shadow', weight: 5 })

        if (availablePools.length === 0) {
            // Fallback: Just pick random new or random item if everything is "waiting"
            // This happens if user cleared all due/risk and has no new items
            // We just pick a random candidate from full list to "review ahead"
            if (candidates.length > 0) {
                const rnd = Math.floor(Math.random() * candidates.length)
                return candidates[rnd].item
            }
            return null
        }

        const totalWeight = availablePools.reduce((sum, p) => sum + p.weight, 0)
        let randomVal = Math.random() * totalWeight

        for (const p of availablePools) {
            randomVal -= p.weight
            if (randomVal <= 0) {
                targetPool = p.id
                break
            }
        }

        // --- Step 3: Weighted Selection within Pool ---
        const finalPool = pools[targetPool]

        // Calculate item weights within the pool
        const weightedItems = finalPool.map(cand => {
            let weight = 1
            const { srs } = cand

            if (targetPool === 'due') {
                // Prioritize more overdue items
                const daysLate = Math.max(0, (now - srs.nextReview) / (86400000))
                weight = 1 + daysLate // Simple linear increase
                if (srs.easeFactor < 2.5) weight += 1 // Harder items get priority
            }
            else if (targetPool === 'risk') {
                // Prioritize lower ease factor (hardest)
                weight = Math.max(0.1, 3.0 - srs.easeFactor)
            }
            // For New/Shadow, uniform weight is fine (random)

            return { ...cand, weight }
        })

        // Select item
        const poolTotalWeight = weightedItems.reduce((sum, i) => sum + i.weight, 0)
        let itemRandomVal = Math.random() * poolTotalWeight

        for (const item of weightedItems) {
            itemRandomVal -= item.weight
            if (itemRandomVal <= 0) {
                console.log(`[ChallengeSRS] Selected from ${targetPool}: ${item.item.id}`)
                return item.item
            }
        }

        return weightedItems[0].item
    },

    async getPageSRS(pageId) {
        return await annotationService.getSRSData(pageId)
    },

    async getAllSRSData() {
        return await annotationService.getAllSRS()
    }
}
