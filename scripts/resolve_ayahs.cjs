const fs = require('fs');
const path = require('path');

const quranPath = path.join(__dirname, '../src/data/quran_full_text.json');

function getAyahDetails(globalIndex, pages) {
    let count = 0;
    // Iterate over pages 1 to 604
    for (let pNum = 1; pNum < pages.length; pNum++) {
        const page = pages[pNum];
        for (const surahId in page) {
            const surah = page[surahId];
            const name = surah.titleAr;
            const verses = surah.text || [];
            for (const verse of verses) {
                count++;
                if (count === globalIndex) {
                    return {
                        surahId: parseInt(surahId),
                        surahName: name,
                        ayahNum: parseInt(verse.verseNumber),
                        text: verse.text
                    };
                }
            }
        }
    }
    return null;
}

function main() {
    const quran = JSON.parse(fs.readFileSync(quranPath, 'utf8'));
    
    // Resolve: 9, 1162, 3161, 3472
    const indices = [9, 1162, 3161, 3472];
    indices.forEach(idx => {
        const details = getAyahDetails(idx, quran);
        console.log(`Global ${idx}:`, details ? `${details.surahName} (${details.ayahNum}): ${details.text}` : 'Not found');
    });
}

main();
