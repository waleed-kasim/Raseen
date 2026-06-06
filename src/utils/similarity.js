/**
 * Arabic Text Similarity Utility
 * Normalizes text, tokenizes, and computes Jaccard and Cosine similarity metrics.
 */

/**
 * Removes Arabic diacritics (harakat, shadda, maddah) and Quranic symbols.
 */
export function removeDiacritics(text) {
    if (!text) return '';
    // Regexp matches standard harakat, shadda, maddah, and Quranic punctuation marks/signs
    return text.replace(/[\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]/g, "");
}

/**
 * Normalizes Arabic character variants to standard form for text matching.
 */
export function normalizeArabic(text) {
    if (!text) return '';
    let cleaned = removeDiacritics(text);
    // Replace Alef variants with plain Alef
    cleaned = cleaned.replace(/[أإآٱ]/g, 'ا');
    // Replace Teh Marbuta with Heh
    cleaned = cleaned.replace(/ة/g, 'ه');
    // Replace Ya Maksura with Ya
    cleaned = cleaned.replace(/ى/g, 'ي');
    return cleaned;
}

/**
 * Splits normalized Arabic text into array of tokens.
 */
export function tokenize(text) {
    if (!text) return [];
    return normalizeArabic(text)
        .split(/[\s\p{P}]+/u) // Split on spaces and punctuation marks
        .filter(w => w.trim() !== '');
}

/**
 * Computes Jaccard similarity: |A ∩ B| / |A ∪ B|
 */
export function calculateJaccardSimilarity(text1, text2) {
    const words1 = new Set(tokenize(text1));
    const words2 = new Set(tokenize(text2));
    
    if (words1.size === 0 && words2.size === 0) return 1.0;
    
    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
}

/**
 * Computes Cosine Similarity based on word frequencies (TF count vectors).
 */
export function calculateCosineSimilarity(text1, text2) {
    const tokens1 = tokenize(text1);
    const tokens2 = tokenize(text2);
    
    if (tokens1.length === 0 && tokens2.length === 0) return 1.0;
    if (tokens1.length === 0 || tokens2.length === 0) return 0.0;
    
    const freq1 = {};
    const freq2 = {};
    const uniqueWords = new Set();
    
    tokens1.forEach(word => {
        freq1[word] = (freq1[word] || 0) + 1;
        uniqueWords.add(word);
    });
    
    tokens2.forEach(word => {
        freq2[word] = (freq2[word] || 0) + 1;
        uniqueWords.add(word);
    });
    
    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;
    
    uniqueWords.forEach(word => {
        const val1 = freq1[word] || 0;
        const val2 = freq2[word] || 0;
        dotProduct += val1 * val2;
    });
    
    Object.values(freq1).forEach(val => {
        magnitude1 += val * val;
    });
    
    Object.values(freq2).forEach(val => {
        magnitude2 += val * val;
    });
    
    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);
    
    if (magnitude1 === 0 || magnitude2 === 0) return 0.0;
    
    return dotProduct / (magnitude1 * magnitude2);
}

/**
 * Computes Longest Common Subsequence (LCS) length of two token arrays.
 */
export function getLCS(arr1, arr2) {
    const dp = Array(arr1.length + 1).fill(0).map(() => Array(arr2.length + 1).fill(0));
    for (let i = 1; i <= arr1.length; i++) {
        for (let j = 1; j <= arr2.length; j++) {
            if (arr1[i-1] === arr2[j-1]) {
                dp[i][j] = dp[i-1][j-1] + 1;
            } else {
                dp[i][j] = Math.max(dp[i-1][j], dp[i][j-1]);
            }
        }
    }
    return dp[arr1.length][arr2.length];
}

/**
 * Computes the ratio of the LCS length relative to the shorter verse length.
 */
export function calculateLCSRatio(text1, text2) {
    const tokens1 = tokenize(text1);
    const tokens2 = tokenize(text2);
    if (tokens1.length === 0 || tokens2.length === 0) return 0.0;
    const lcsLen = getLCS(tokens1, tokens2);
    const minLen = Math.min(tokens1.length, tokens2.length);
    return lcsLen / minLen;
}

/**
 * Computes word-level Levenshtein edit distance.
 */
export function calculateWordLevenshtein(text1, text2) {
    const tokens1 = tokenize(text1);
    const tokens2 = tokenize(text2);
    const dp = Array(tokens1.length + 1).fill(0).map(() => Array(tokens2.length + 1).fill(0));
    for (let i = 0; i <= tokens1.length; i++) dp[i][0] = i;
    for (let j = 0; j <= tokens2.length; j++) dp[0][j] = j;
    for (let i = 1; i <= tokens1.length; i++) {
        for (let j = 1; j <= tokens2.length; j++) {
            if (tokens1[i-1] === tokens2[j-1]) {
                dp[i][j] = dp[i-1][j-1];
            } else {
                dp[i][j] = Math.min(dp[i-1][j] + 1, dp[i][j-1] + 1, dp[i-1][j-1] + 1);
            }
        }
    }
    return dp[tokens1.length][tokens2.length];
}

/**
 * Computes character-level Levenshtein edit distance.
 */
export function calculateCharLevenshtein(str1, str2) {
    const s1 = normalizeArabic(str1).replace(/\s+/g, ' ').trim();
    const s2 = normalizeArabic(str2).replace(/\s+/g, ' ').trim();
    const dp = Array(s1.length + 1).fill(0).map(() => Array(s2.length + 1).fill(0));
    for (let i = 0; i <= s1.length; i++) dp[i][0] = i;
    for (let j = 0; j <= s2.length; j++) dp[0][j] = j;
    for (let i = 1; i <= s1.length; i++) {
        for (let j = 1; j <= s2.length; j++) {
            if (s1[i-1] === s2[j-1]) {
                dp[i][j] = dp[i-1][j-1];
            } else {
                dp[i][j] = Math.min(dp[i-1][j] + 1, dp[i][j-1] + 1, dp[i-1][j-1] + 1);
            }
        }
    }
    return dp[s1.length][s2.length];
}

/**
 * Computes Cognitive Confusion Index (CCI) for two verses.
 * docFreq represents how common the shared phrase is in the Quran (N = 6236).
 */
export function calculateCCI(text1, text2, docFreq = 2) {
    const s1 = normalizeArabic(text1).replace(/\s+/g, ' ').trim();
    const s2 = normalizeArabic(text2).replace(/\s+/g, ' ').trim();
    if (!s1 || !s2) return 0.0;
    
    const dist = calculateCharLevenshtein(s1, s2);
    const maxLen = Math.max(s1.length, s2.length);
    const charSim = maxLen > 0 ? 1.0 - (dist / maxLen) : 1.0;
    
    // Calculate IDF Factor (demote extremely common phrases)
    const idf = Math.log10(6236 / (Math.max(1, docFreq) + 1));
    const idfFactor = Math.max(0.6, Math.min(1.0, idf / 3.3));
    
    return charSim * idfFactor;
}

/**
 * Computes the indices in arr1 that are part of the LCS with arr2.
 * Used for aligning words and highlighting differences in Focus Mode.
 */
export function getLCSIndices(arr1, arr2) {
    const m = arr1.length;
    const n = arr2.length;
    const dp = Array(m + 1).fill(0).map(() => Array(n + 1).fill(0));
    
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (arr1[i-1] === arr2[j-1]) {
                dp[i][j] = dp[i-1][j-1] + 1;
            } else {
                dp[i][j] = Math.max(dp[i-1][j], dp[i][j-1]);
            }
        }
    }
    
    const lcsIndices = new Set();
    let i = m, j = n;
    while (i > 0 && j > 0) {
        if (arr1[i-1] === arr2[j-1]) {
            lcsIndices.add(i-1);
            i--;
            j--;
        } else if (dp[i-1][j] >= dp[i][j-1]) {
            i--;
        } else {
            j--;
        }
    }
    return lcsIndices;
}

