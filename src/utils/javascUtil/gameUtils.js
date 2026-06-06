export const shuffleArray = (arr) => {
    const shuffled = [...arr]
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
}

export const generateWrongNumbers = (correct, count) => {
    const wrongs = new Set()
    while (wrongs.size < count) {
        const offset = Math.floor(Math.random() * 10) - 5
        const num = correct + offset
        if (num > 0 && num !== correct) {
            wrongs.add(num)
        }
    }
    return [...wrongs]
}

export const truncateText = (text, maxLen = 80) => {
    if (!text) return ''
    return text.length > maxLen ? text.substring(0, maxLen) + '...' : text
}

export const getFirstWords = (text, wordCount = 10) => {
    if (!text) return ''
    const words = text.split(/\s+/)
    if (words.length <= wordCount) return text
    return words.slice(0, wordCount).join(' ') + '...'
}

export const getLastWords = (text, wordCount = 10) => {
    if (!text) return ''
    const words = text.split(/\s+/)
    if (words.length <= wordCount) return text
    return '...' + words.slice(-wordCount).join(' ')
}

export const numberToArabicIndic = (num) => {
    const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']
    return String(num).split('').map(d => arabicNumerals[parseInt(d)] || d).join('')
}

export const getSmartDistractors = (correctItem, allCandidates, count = 3, getId = (item) => item.id) => {
    if (!allCandidates || allCandidates.length === 0) return []

    // Filter out the correct item
    const candidates = allCandidates.filter(c => getId(c) !== getId(correctItem))

    if (candidates.length === 0) return []

    // 1. Proximity Pool: Pages within +/- 5 pages (numeric closeness for confusion)
    const proximityPool = candidates.filter(c => Math.abs(c.pageNumber - correctItem.pageNumber) <= 5 && Math.abs(c.pageNumber - correctItem.pageNumber) > 0)

    // 2. Similarity Pool: Same Surah
    const similarityPool = candidates.filter(c => c.surahId === correctItem.surahId && !proximityPool.includes(c))

    // 3. Random Pool: Everything else
    const randomPool = candidates.filter(c => !proximityPool.includes(c) && !similarityPool.includes(c))

    const selected = []
    const usedIds = new Set()

    const pickFrom = (pool) => {
        if (selected.length >= count) return
        if (pool.length === 0) return

        // Pick random from pool
        const idx = Math.floor(Math.random() * pool.length)
        const item = pool[idx]

        if (!usedIds.has(getId(item))) {
            selected.push(item)
            usedIds.add(getId(item))
            // Remove from pool
            pool.splice(idx, 1)
        }
    }

    // Strategy:
    // 1. Try to get 1 Proximity (Confusing nearby)
    if (proximityPool.length > 0) pickFrom(proximityPool)

    // 2. Try to get 1 Similarity (Same Surah)
    if (similarityPool.length > 0 && selected.length < count) pickFrom(similarityPool)

    // 3. Fill remainder with mixed
    // Merge remaining smart options into a single pool to draw from, avoiding reconstruction in loop
    const remaingSmartAndRandom = [...proximityPool, ...similarityPool, ...randomPool]

    while (selected.length < count && remaingSmartAndRandom.length > 0) {
        pickFrom(remaingSmartAndRandom)
    }

    return shuffleArray(selected)
}
