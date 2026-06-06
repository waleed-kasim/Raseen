/**
 * Script to generate Quran data JSON
 * Run with: node scripts/generate_quran_data.js
 */

import fs from 'fs';

async function fetchSurah(surahNumber) {
    const response = await fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}/quran-uthmani`);
    const data = await response.json();
    return data.data;
}

async function generateQuranData() {
    console.log('🕌 Fetching Quran data...');

    // Fetch Al-Fatiha and Al-Baqarah
    const fatiha = await fetchSurah(1);
    const baqarah = await fetchSurah(2);

    console.log(`✅ Al-Fatiha: ${fatiha.numberOfAyahs} ayahs`);
    console.log(`✅ Al-Baqarah: ${baqarah.numberOfAyahs} ayahs`);

    // Group ayahs by page
    const pageMap = {};

    // Process Al-Fatiha
    fatiha.ayahs.forEach(ayah => {
        const pageNum = ayah.page;
        if (!pageMap[pageNum]) {
            pageMap[pageNum] = {
                surahNumber: fatiha.number,
                surahName: 'الفاتحة',
                ayahs: []
            };
        }
        pageMap[pageNum].ayahs.push({
            number: ayah.numberInSurah,
            text: ayah.text,
            juz: ayah.juz,
            hizb: ayah.hizbQuarter
        });
    });

    // Process Al-Baqarah
    baqarah.ayahs.forEach(ayah => {
        const pageNum = ayah.page;
        if (!pageMap[pageNum]) {
            pageMap[pageNum] = {
                surahNumber: baqarah.number,
                surahName: 'البقرة',
                ayahs: []
            };
        }
        // Handle pages that span both surahs
        if (pageMap[pageNum].surahNumber !== baqarah.number && pageMap[pageNum].surahName !== 'البقرة') {
            // This page has both surahs, add to existing
        }
        pageMap[pageNum].ayahs.push({
            number: ayah.numberInSurah,
            text: ayah.text,
            juz: ayah.juz,
            hizb: ayah.hizbQuarter
        });
    });

    // Convert to array format with topic field ready
    const pages = Object.entries(pageMap).map(([pageNum, data]) => {
        const ayahs = data.ayahs;
        return {
            pageNumber: parseInt(pageNum),
            surahNumber: data.surahNumber,
            surahName: data.surahName,
            topic: null,  // Ready to be filled later with topic name
            topicId: null, // Ready for topic grouping
            orderInSurah: 0, // Will be calculated
            firstAyah: {
                number: ayahs[0].number,
                text: ayahs[0].text
            },
            lastAyah: {
                number: ayahs[ayahs.length - 1].number,
                text: ayahs[ayahs.length - 1].text
            },
            ayahs: ayahs,
            fullText: ayahs.map(a => a.text).join(' ')
        };
    });

    // Sort by page number
    pages.sort((a, b) => a.pageNumber - b.pageNumber);

    // Calculate orderInSurah
    let currentSurah = null;
    let order = 0;
    pages.forEach(page => {
        if (page.surahName !== currentSurah) {
            currentSurah = page.surahName;
            order = 1;
        }
        page.orderInSurah = order++;
    });

    // Create final structure
    const quranData = {
        version: "1.0",
        generatedAt: new Date().toISOString(),
        description: "Quran data with topic support - Al-Fatiha and Al-Baqarah",
        topicsReady: true,
        surahs: [
            {
                number: 1,
                name: "الفاتحة",
                englishName: "Al-Fatiha",
                ayahCount: 7,
                pageStart: 1,
                pageEnd: 1
            },
            {
                number: 2,
                name: "البقرة",
                englishName: "Al-Baqarah",
                ayahCount: 286,
                pageStart: 2,
                pageEnd: 49,
                // Topics structure ready to be filled
                topics: [
                    { id: "intro", name: "مقدمة السورة وأصناف الناس", startAyah: 1, endAyah: 29, pages: [] },
                    { id: "adam", name: "قصة آدم عليه السلام", startAyah: 30, endAyah: 39, pages: [] },
                    { id: "bani_israel_1", name: "بنو إسرائيل - النعم والعصيان", startAyah: 40, endAyah: 74, pages: [] },
                    { id: "baqarah", name: "قصة البقرة", startAyah: 67, endAyah: 74, pages: [] },
                    { id: "bani_israel_2", name: "بنو إسرائيل - قسوة القلوب", startAyah: 75, endAyah: 103, pages: [] },
                    { id: "ibrahim", name: "إبراهيم وإسماعيل والبيت الحرام", startAyah: 124, endAyah: 141, pages: [] },
                    { id: "qiblah", name: "تحويل القبلة", startAyah: 142, endAyah: 152, pages: [] },
                    { id: "ahkam_1", name: "أحكام متنوعة", startAyah: 153, endAyah: 177, pages: [] },
                    { id: "siyam", name: "أحكام الصيام", startAyah: 183, endAyah: 187, pages: [] },
                    { id: "hajj", name: "أحكام الحج والقتال", startAyah: 189, endAyah: 203, pages: [] },
                    { id: "infaq", name: "الإنفاق في سبيل الله", startAyah: 254, endAyah: 274, pages: [] },
                    { id: "kursi", name: "آية الكرسي", startAyah: 255, endAyah: 257, pages: [] },
                    { id: "riba", name: "تحريم الربا", startAyah: 275, endAyah: 281, pages: [] },
                    { id: "dayn", name: "آية الدَّين", startAyah: 282, endAyah: 283, pages: [] },
                    { id: "khatimah", name: "خاتمة السورة", startAyah: 284, endAyah: 286, pages: [] }
                ]
            }
        ],
        pages: pages
    };

    // Write to file
    const outputPath = './public/data/quran_data.json';
    fs.writeFileSync(outputPath, JSON.stringify(quranData, null, 2), 'utf8');

    console.log(`\n✅ Generated ${pages.length} pages`);
    console.log(`📁 Saved to: ${outputPath}`);
    console.log('\n📋 Topics structure ready for Al-Baqarah');
}

generateQuranData().catch(console.error);
