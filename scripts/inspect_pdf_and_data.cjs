const fs = require('fs');
const path = require('path');

const quranPath = path.join(__dirname, '../src/data/quran_full_text.json');
const dataPath = path.join(__dirname, '../MutashabihatulQuran/mutashabiha_data.json');

function getAyahDetails(globalIndex, pages) {
    let count = 0;
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
    const mutData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    
    console.log('Juz 1 mutashabihat groups:');
    const juz1 = mutData["1"] || [];
    juz1.slice(0, 15).forEach((g, idx) => {
        const src = getAyahDetails(g.src.ayah, quran);
        const muts = g.muts.map(m => getAyahDetails(m.ayah, quran)).filter(Boolean);
        console.log(`\nGroup ${idx + 1}:`);
        console.log(`Source: ${src.surahName} (${src.ayahNum}) - "${src.text}"`);
        muts.forEach(m => {
            console.log(`  Muts: ${m.surahName} (${m.ayahNum}) - "${m.text}"`);
        });
    });
}

main();
