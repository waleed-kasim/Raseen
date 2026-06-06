export const ARABIC_NUMERALS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

export function toArabicIndic(num) {
    if (num == null) return '';
    return num.toString().replace(/[0-9]/g, w => ARABIC_NUMERALS[+w]);
}

/**
 * Helper to remove diacritics (tashkeel) from Arabic text
 */
export function removeTashkeel(text) {
    if (!text) return '';
    // Arabic diacritics range 064B - 065F
    return text.replace(/[\u064B-\u065F]/g, '');
}

/**
 * Normalizes common Arabic letters variants to a standard form
 * for accurate searching or comparison
 */
export function normalizeArabicText(text) {
    if (!text) return '';
    return text
        .replace(/[أإآا]/g, 'ا')
        .replace(/[ة]/g, 'ه')
        .replace(/[يى]/g, 'ي')
        .replace(/[ؤئ]/g, 'ء');
}
