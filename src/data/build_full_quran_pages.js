import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fullPath = path.join(__dirname, 'quran_full_text.json');
const outputPath = path.join(__dirname, 'quran_full_pages.json');

async function buildQuranPages() {
    console.log('Fetching Quran metadata from Alquran.cloud...');
    const res = await fetch('http://api.alquran.cloud/v1/quran/quran-uthmani');
    const apiData = await res.json();
    
    if (apiData.code !== 200) {
        console.error('Failed to fetch data from API');
        return;
    }

    console.log('Reading local quran_full_text.json...');
    let rawData = fs.readFileSync(fullPath, 'utf8');
    
    // Data Sanitization & Normalization
    // \u0657 (Inverted Damma) -> \u08F0 (Arabic Open Fathatan)
    // \u065E (Fatha with two dots) -> \u08F1 (Arabic Open Dammatan)
    // \u0656 (Subscript Alef) -> \u08F2 (Arabic Open Kasratan)
    rawData = rawData.replace(/\u0657/g, '\u08F0')
                     .replace(/\u065E/g, '\u08F1')
                     .replace(/\u0656/g, '\u08F2');

    const localFullData = JSON.parse(rawData);
    
    const textMap = {};
    localFullData.forEach(surah => {
        textMap[surah.id] = {};
        surah.verses.forEach(verse => {
            textMap[surah.id][verse.id] = verse.text;
        });
    });

    console.log('Building page-based structure...');
    const surahsMeta = [];
    const pagesMap = {}; 

    apiData.data.surahs.forEach(surah => {
        let pageStart = 604;
        let pageEnd = 1;
        
        surah.ayahs.forEach(ayah => {
            if (ayah.page < pageStart) pageStart = ayah.page;
            if (ayah.page > pageEnd) pageEnd = ayah.page;
            
            const pageNum = ayah.page;
            if (!pagesMap[pageNum]) {
                pagesMap[pageNum] = {};
            }
            if (!pagesMap[pageNum][surah.number]) {
                pagesMap[pageNum][surah.number] = {
                    pageNumber: pageNum,
                    surahNumber: surah.number,
                    surahName: surah.name,
                    topic: null,
                    topicId: null,
                    ayahs: []
                };
            }
            
            const localText = textMap[surah.number]?.[ayah.numberInSurah];
            
            pagesMap[pageNum][surah.number].ayahs.push({
                number: ayah.numberInSurah,
                text: localText || ayah.text,
                juz: ayah.juz,
                hizb: Math.ceil(ayah.hizbQuarter / 4)
            });
        });

        const localSurah = localFullData.find(s => s.id === surah.number);
        surahsMeta.push({
            number: surah.number,
            name: localSurah ? localSurah.name : surah.name,
            englishName: localSurah ? localSurah.transliteration : surah.englishName,
            ayahCount: surah.ayahs.length,
            pageStart: pageStart,
            pageEnd: pageEnd
        });
    });

    const surahPageCounters = {};
    const pagesArray = [];

    const pageNumbers = Object.keys(pagesMap).map(Number).sort((a,b) => a - b);
    
    for (const pageNum of pageNumbers) {
        const surahsInPage = pagesMap[pageNum];
        const surahNumbers = Object.keys(surahsInPage).map(Number).sort((a,b) => a - b);
        
        for (const sNum of surahNumbers) {
            if (!surahPageCounters[sNum]) surahPageCounters[sNum] = 0;
            surahPageCounters[sNum]++;
            
            const pageChunk = surahsInPage[sNum];
            
            const localSurah = localFullData.find(s => s.id === sNum);
            if(localSurah) pageChunk.surahName = localSurah.name;
            
            pageChunk.orderInSurah = surahPageCounters[sNum];
            pageChunk.firstAyahId = pageChunk.ayahs[0].number;
            pageChunk.lastAyahId = pageChunk.ayahs[pageChunk.ayahs.length - 1].number;
            
            pagesArray.push(pageChunk);
        }
    }

    const finalStructure = {
        version: "1.0",
        generatedAt: new Date().toISOString(),
        description: "Full Quran paginated text based on user correct text",
        topicsReady: false,
        surahs: surahsMeta,
        pages: pagesArray
    };

    fs.writeFileSync(outputPath, JSON.stringify(finalStructure, null, 2), 'utf8');
    console.log(`✅ Saved full paginated Quran to ${outputPath}`);
}

buildQuranPages().catch(console.error);
