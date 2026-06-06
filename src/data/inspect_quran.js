import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fullTextPath = path.join(__dirname, 'quran_full_text.json');
const data = JSON.parse(fs.readFileSync(fullTextPath, 'utf8'));

const isQuranSymbol = (word) => {
    const w = word.trim();
    if (w === '۞' || w === '۩' || w === '\uFFFD' || w === '') return true;
    const singleCharSymbols = ['ج', 'ط', 'م', 'ص', 'ق', 'س', 'ز', 'ع'];
    const multiCharSymbols = ['صلى', 'قلى', 'صل', 'لا', 'لَا', 'قف'];
    return singleCharSymbols.includes(w) ||
           multiCharSymbols.includes(w) ||
           (w.length === 1 && w.charCodeAt(0) >= 0x06D6 && w.charCodeAt(0) <= 0x06DC);
};

let totalRaw = 0;
let totalMerged = 0;

data.forEach(page => {
    const surahKeys = Object.keys(page).filter(k => !isNaN(k) && k !== '');
    surahKeys.forEach(surahKey => {
        const surahData = page[surahKey];
        if (!surahData.text) return;

        surahData.text.forEach(verse => {
            const rawWords = verse.text.split(/\s+/).filter(w => w.trim() !== '');
            totalRaw += rawWords.length;
            
            const mergedWords = [];
            for (let i = 0; i < rawWords.length; i++) {
                if (isQuranSymbol(rawWords[i]) && mergedWords.length > 0) {
                    mergedWords[mergedWords.length - 1] += ' ' + rawWords[i];
                } else if (isQuranSymbol(rawWords[i]) && mergedWords.length === 0) {
                    // If the verse starts with a symbol, wait and merge it with the first actual word
                    mergedWords.push(rawWords[i]);
                } else {
                    if (mergedWords.length > 0 && isQuranSymbol(mergedWords[0]) && mergedWords.length === 1) {
                        mergedWords[0] += ' ' + rawWords[i];
                    } else {
                        mergedWords.push(rawWords[i]);
                    }
                }
            }
            totalMerged += mergedWords.length;
        });
    });
});

console.log('--- RE-PARSED MERGED WORD COUNTS ---');
console.log(`Raw Words Count: ${totalRaw}`);
console.log(`Merged Words Count: ${totalMerged}`);
