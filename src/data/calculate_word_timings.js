import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fullTextPath = path.join(__dirname, 'quran_full_text.json');
const outputPath = path.join(__dirname, 'quran_word_weights.json');

const isQuranSymbol = (word) => {
    if (!word) return false;
    const trimmed = word.trim();
    const singleCharSymbols = ['ج', 'ط', 'م', 'ص', 'ق', 'س', 'ز', 'ع', '۞', '۩', '\uFFFD'];
    const multiCharSymbols = ['صلى', 'قلى', 'صل', 'لا', 'لَا', 'قف'];
    if (singleCharSymbols.includes(trimmed) || multiCharSymbols.includes(trimmed)) return true;
    if (trimmed.length === 1) {
        const code = trimmed.charCodeAt(0);
        if (code >= 0x06D6 && code <= 0x06DC) return true;
    }
    return false;
};

const stripDiacritics = (text) => {
    // Range of Arabic Tashkeel/combining characters: U+064B to U+065F, U+0670 (superscript alef), and U+0640 (Tatweel) etc.
    return text.replace(/[\u064B-\u065F\u0670\u0671\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED\u0640]/g, '');
};

const muqattaatList = ["الم", "المص", "الر", "المر", "كهيعص", "طه", "طسم", "طس", "يس", "ص", "حم", "عسق", "ق", "ن"];

const detectMadLazim = (word) => {
    const maddRegex = /[\u0653\u06E4~]/;
    const match = word.match(maddRegex);
    if (!match) return false;
    
    const maddIndex = match.index;
    const afterMadd = word.slice(maddIndex + 1);
    
    return /^[\u0600-\u061F\u064B-\u0650\u0652\u0670-\u06D5]*[\u0621-\u064A\u0671-\u06D3][\u0651]/.test(afterMadd);
};

const calculateWeight = (wordText, isEndOfAyah) => {
    const tokens = wordText.split(' ');
    let baseWord = '';
    const symbols = [];
    
    for (const t of tokens) {
        if (isQuranSymbol(t)) {
            symbols.push(t);
        } else {
            baseWord = t;
        }
    }
    
    // Fallback in case there is no baseWord (extremely rare)
    if (!baseWord) {
        baseWord = tokens[0] || '';
    }
    
    // New base weight timing formula: dampened stripped length multiplier
    const stripped = stripDiacritics(baseWord);
    const M_stripped = 4.15;
    let multiplier = 0.4 + 0.6 * (stripped.length / M_stripped);
    
    // 1. Waqf Stop Bonus (excluding prohibited stop 'la', Rub el Hizb, Sajdah, etc.)
    if (symbols.length > 0) {
        let hasValidStop = false;
        for (const sym of symbols) {
            const cleanSymbol = stripDiacritics(sym);
            // Ignore non-stop symbols and prohibited stops
            if (
                cleanSymbol !== 'لا' && 
                cleanSymbol !== 'لَا' && 
                cleanSymbol !== '۞' && 
                cleanSymbol !== '۩' && 
                cleanSymbol !== '\uFFFD'
            ) {
                hasValidStop = true;
            }
        }
        if (hasValidStop) {
            multiplier += 0.2; // Add pause time for allowed stops
        }
    }
    
    // 2. End of Ayah & Mad Arid Lis-Sukun
    if (isEndOfAyah) {
        const strippedBase = stripDiacritics(baseWord);
        const secondLastChar = strippedBase[strippedBase.length - 2];
        if (['ا', 'و', 'ي', 'ى'].includes(secondLastChar)) {
            multiplier += 0.4; // Mad Arid Lis-Sukun (4 harakat)
        } else {
            multiplier += 0.2; // Regular end of Ayah stop
        }
    }
    
    // 3. Muqatta'at Word Check
    const strippedBase = stripDiacritics(baseWord);
    if (muqattaatList.includes(strippedBase)) {
        multiplier += 1.5; // Spelling pronunciation golden bonus
    } else {
        // 4. Madd & Mad Lazim (6 harakat)
        const hasMadd = baseWord.includes('\u06DC') || baseWord.includes('\u06E4') || baseWord.includes('\u0653') || baseWord.includes('~');
        
        if (hasMadd) {
            if (detectMadLazim(baseWord)) {
                multiplier += 0.6; // True Mad Lazim (6 harakat)
            } else {
                multiplier += 0.1; // Standard Madd (2/4 harakat)
            }
        }
    }
    
    // --- Store original weight ---
    const oldWeight = multiplier;
    let newWeight = oldWeight;
    
    // --- Arabic NLP Rules for Precise Pronunciation ---
    
    // 1. Alif Khanjariyah (\u0670): pronounced but small, needs time.
    if (baseWord.includes('\u0670')) {
        newWeight += 0.25;
    }
    
    // 2. Ghunnah: Noon (ن) or Meem (م) with Shaddah (\u0651).
    if (/[نم][\u064B-\u0650\u0652-\u065F]*\u0651/.test(baseWord)) {
        newWeight += 0.3;
    }
    
    // 3. Lam Shamsiyyah: Lam (ل) followed by a Shaddah letter (written but not pronounced).
    if (/ل[\u064B-\u065F]*[^\s][\u064B-\u0650\u0652-\u065F]*\u0651/.test(baseWord)) {
        newWeight -= 0.15;
    }
    
    // 4. Hamzat Al-Wasl (\u0671): (written but usually skipped).
    if (baseWord.includes('\u0671')) {
        newWeight -= 0.1;
    }
    
    // 5. Silent Alif: Alif + Zero-vowel (\u06DF) or `وا` end.
    if (baseWord.includes('\u0627\u06DF')) {
        newWeight -= 0.15;
    } else if (strippedBase.endsWith('وا')) {
        newWeight -= 0.15;
    }
    
    // Average old and new to prevent drastic changes
    multiplier = (oldWeight + newWeight) / 2;
    
    // Safety check to ensure weight never drops too low or goes negative
    if (multiplier < 0.2) multiplier = 0.2;
    
    return Number(multiplier.toFixed(2));
};

async function generateWeights() {
    console.log('Reading full Quran text...');
    if (!fs.existsSync(fullTextPath)) {
        console.error(`Error: full text file not found at ${fullTextPath}`);
        return;
    }
    const data = JSON.parse(fs.readFileSync(fullTextPath, 'utf8'));
    const weightsMap = {};

    let totalWords = 0;

    data.forEach((page, pageIdx) => {
        const surahKeys = Object.keys(page).filter(k => !isNaN(k) && k !== '');
        
        surahKeys.forEach(surahKey => {
            const surahData = page[surahKey];
            if (!surahData.text) return;

            const surahId = Number(surahKey);

            surahData.text.forEach(verse => {
                const rawWords = verse.text.split(/\s+/).filter(w => w.trim() !== '');
                
                const mergedWords = [];
                let pendingPrependSymbol = '';
                for (let i = 0; i < rawWords.length; i++) {
                    const token = rawWords[i];
                    if (isQuranSymbol(token)) {
                        if (mergedWords.length > 0) {
                            mergedWords[mergedWords.length - 1] += ' ' + token;
                        } else {
                            pendingPrependSymbol = (pendingPrependSymbol ? pendingPrependSymbol + ' ' : '') + token;
                        }
                    } else {
                        if (pendingPrependSymbol) {
                            mergedWords.push(pendingPrependSymbol + ' ' + token);
                            pendingPrependSymbol = '';
                        } else {
                            mergedWords.push(token);
                        }
                    }
                }
                if (pendingPrependSymbol) {
                    mergedWords.push(pendingPrependSymbol);
                }

                const ayahNumber = Number(verse.verseNumber);

                mergedWords.forEach((wordText, wordIdx) => {
                    const isEndOfAyah = wordIdx === mergedWords.length - 1;
                    const weight = calculateWeight(wordText, isEndOfAyah);
                    
                    const wordId = `${surahId}_${ayahNumber}_${wordIdx}`;
                    weightsMap[wordId] = weight;
                    totalWords++;
                });
            });
        });
    });

    fs.writeFileSync(outputPath, JSON.stringify(weightsMap, null, 2), 'utf8');
    console.log(`✅ Success! Generated weights for ${totalWords} words.`);
    console.log(`Saved output to ${outputPath}`);
}

generateWeights().catch(console.error);
