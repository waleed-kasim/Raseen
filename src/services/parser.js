/**
 * Parser Service
 * Handles parsing of Quran page text into ayahs
 */

// Arabic-Indic numerals mapping
const ARABIC_NUMERALS = {
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
}

export const ParserService = {
    /**
     * Convert Arabic-Indic numeral to Western numeral
     */
    convertArabicNumeral(str) {
        return str.replace(/[٠-٩]/g, d => ARABIC_NUMERALS[d])
    },

    /**
     * Parse full text into individual ayahs
     * Splits by Arabic-Indic numerals (١، ٢، ٣...)
     */
    parseAyahs(fullText) {
        if (!fullText) return []

        // Match Arabic-Indic numbers at the end of ayahs
        const pattern = /([٠-٩]+)/g
        const parts = fullText.split(pattern).filter(p => p.trim())

        const ayahs = []
        let currentText = ''

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i].trim()

            if (/^[٠-٩]+$/.test(part)) {
                // This is a number - end of ayah
                if (currentText) {
                    ayahs.push({
                        number: parseInt(this.convertArabicNumeral(part)),
                        text: currentText.trim(),
                        arabicNumber: part
                    })
                    currentText = ''
                }
            } else {
                // This is text
                currentText += ' ' + part
            }
        }

        // Handle any remaining text without a number
        if (currentText.trim()) {
            ayahs.push({
                number: ayahs.length + 1,
                text: currentText.trim(),
                arabicNumber: ''
            })
        }

        return ayahs
    },

    /**
     * Get first ayah from parsed ayahs
     */
    getFirstAyah(ayahs) {
        if (!ayahs || ayahs.length === 0) return null
        return ayahs[0]
    },

    /**
     * Get last ayah from parsed ayahs
     */
    getLastAyah(ayahs) {
        if (!ayahs || ayahs.length === 0) return null
        return ayahs[ayahs.length - 1]
    },

    /**
     * Get ayah by number
     */
    getAyahByNumber(ayahs, number) {
        if (!ayahs) return null
        return ayahs.find(a => a.number === number)
    },

    /**
     * Get a random snippet from page text (first few words)
     */
    getSnippet(text, wordCount = 5) {
        if (!text) return ''
        const words = text.split(/\s+/)
        return words.slice(0, wordCount).join(' ') + (words.length > wordCount ? '...' : '')
    },

    /**
     * Get middle portion of text
     */
    getMiddleSnippet(text, wordCount = 8) {
        if (!text) return ''
        const words = text.split(/\s+/)
        const start = Math.floor((words.length - wordCount) / 2)
        return words.slice(Math.max(0, start), start + wordCount).join(' ')
    }
}

export default ParserService
