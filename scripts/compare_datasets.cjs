const fs = require('fs');
const path = require('path');

const quranPath = path.join(__dirname, '../src/data/quran_full_text.json');
const dataPath = path.join(__dirname, '../MutashabihatulQuran/mutashabiha_data.json');
const phrasesPath = path.join(__dirname, '../MutashabihatulQuran/phrases.json');

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
                        key: `${surahId}:${verse.verseNumber}`,
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
    const phrases = JSON.parse(fs.readFileSync(phrasesPath, 'utf8'));
    
    // Convert mutData groups to surah:ayah key sets
    const mutGroups = [];
    for (const juz in mutData) {
        mutData[juz].forEach(g => {
            const srcDetail = getAyahDetails(g.src.ayah, quran);
            if (!srcDetail) return;
            const mutDetails = g.muts.map(m => getAyahDetails(m.ayah, quran)).filter(Boolean);
            const keys = [srcDetail.key, ...mutDetails.map(m => m.key)];
            mutGroups.push({
                juz,
                src: srcDetail.key,
                keys
            });
        });
    }
    
    console.log(`Total groups in mutashabiha_data.json: ${mutGroups.length}`);
    
    // Map of verse key -> list of phrase group IDs in phrases.json
    const phraseVerses = {};
    Object.keys(phrases).forEach(pid => {
        const phrase = phrases[pid];
        Object.keys(phrase.ayah).forEach(vkey => {
            if (!phraseVerses[vkey]) phraseVerses[vkey] = [];
            phraseVerses[vkey].push(pid);
        });
    });
    
    // For each group in mutGroups, check if there is a phrase in phrases.json containing all its keys
    let matchedCount = 0;
    let unmatchedCount = 0;
    
    mutGroups.forEach((g, idx) => {
        // Find if any phrase in phrases.json contains at least 2 of the keys in g.keys
        let matched = false;
        let bestMatch = null;
        let maxOverlap = 0;
        
        Object.keys(phrases).forEach(pid => {
            const pKeys = Object.keys(phrases[pid].ayah);
            const overlap = g.keys.filter(k => pKeys.includes(k)).length;
            if (overlap > maxOverlap) {
                maxOverlap = overlap;
                bestMatch = pid;
            }
        });
        
        if (maxOverlap >= 2) {
            matched = true;
            matchedCount++;
        } else {
            unmatchedCount++;
            if (unmatchedCount <= 10) {
                console.log(`Unmatched group ${idx + 1} (Juz ${g.juz}): src ${g.src}, keys: ${g.keys.join(', ')}`);
                console.log(`Best overlap: ${maxOverlap} in phrase ${bestMatch}`);
            }
        }
    });
    
    console.log(`\nComparison Results:`);
    console.log(`Matched: ${matchedCount}`);
    console.log(`Unmatched: ${unmatchedCount}`);
}

main();
