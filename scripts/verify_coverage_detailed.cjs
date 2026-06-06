const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

const pdfPath = path.join(__dirname, '../MutashabihatulQuran/mutashabihatPDF.pdf');
const phrasesPath = path.join(__dirname, '../MutashabihatulQuran/phrases.json');

const surahNames = {
    1: "الفاتحة", 2: "البقرة", 3: "آل عمران", 4: "النساء", 5: "المائدة",
    6: "الأنعام", 7: "الأعراف", 8: "الأنفال", 9: "التوبة", 10: "يونس",
    11: "هود", 12: "يوسف", 13: "الرعد", 14: "إبراهيم", 15: "الحجر",
    16: "النحل", 17: "الإسراء", 18: "الكهف", 19: "مريم", 20: "طه",
    21: "الأنبياء", 22: "الحج", 23: "المؤمنون", 24: "النور", 25: "الفرقان",
    26: "الشعراء", 27: "النمل", 28: "القصص", 29: "العنكبوت", 30: "الروم",
    31: "لقمان", 32: "السجدة", 33: "الأحزاب", 34: "سبأ", 35: "فاطر",
    36: "يس", 37: "الصافات", 38: "ص", 39: "الزمر", 40: "غافر",
    41: "فصلت", 42: "الشورى", 43: "الزخرف", 44: "الدخان", 45: "الجاثية",
    46: "الأحقاف", 47: "محمد", 48: "الفتح", 49: "الحجرات", 50: "ق",
    51: "الذاريات", 52: "الطور", 53: "النجم", 54: "القمر", 55: "الرحمن",
    56: "الواقعة", 57: "الحديد", 58: "المجادلة", 59: "الحشر", 60: "الممتحنة",
    61: "الصف", 62: "الجمعة", 63: "المنافقون", 64: "التغابن", 65: "الطلاق",
    66: "التحريم", 67: "الملك", 68: "القلم", 69: "الحاقة", 70: "المعارج",
    71: "نوح", 72: "الجن", 73: "المزمل", 74: "المدثر", 75: "القيامة",
    76: "الإنسان", 77: "المرسلات", 78: "النبأ", 79: "النازعات", 80: "عبس",
    81: "التكوير", 82: "الانفطار", 83: "المطففين", 84: "الانشقاق", 85: "البروج",
    86: "الطارق", 87: "الأعلى", 88: "الغاشية", 89: "الفجر", 90: "البلد",
    91: "الشمس", 92: "الليل", 93: "الضحى", 94: "الشرح", 95: "التين",
    96: "العلق", 97: "القدر", 98: "البينة", 99: "الزلزلة", 100: "العاديات",
    101: "القارعة", 102: "التكاثر", 103: "العصر", 104: "الهمزة", 105: "الفيل",
    106: "قريش", 107: "الماعون", 108: "الكوثر", 109: "الكافرون", 110: "النصر",
    111: "المسد", 112: "الإخلاص", 113: "الفلق", 114: "الناس"
};

// Clean surah name for matching
function cleanSurahName(name) {
    return name.replace(/\s+/g, '').replace(/ال/g, '').replace(/أ/g, 'ا').replace(/إ/g, 'ا').replace(/آ/g, 'ا');
}

async function main() {
    console.log('Loading phrases.json...');
    const phrases = JSON.parse(fs.readFileSync(phrasesPath, 'utf8'));
    const phraseList = Object.keys(phrases).map(id => {
        const item = phrases[id];
        const surahIds = Array.from(new Set(Object.keys(item.ayah).map(k => parseInt(k.split(':')[0]))));
        return {
            id,
            title: item.title,
            surahIds,
            surahNames: surahIds.map(sid => surahNames[sid] || `سورة ${sid}`)
        };
    });
    
    console.log(`Total phrases in database: ${phraseList.length}`);
    
    console.log('Parsing PDF...');
    const dataBuffer = fs.readFileSync(pdfPath);
    const parser = new pdf.PDFParse({ data: dataBuffer });
    await parser.load();
    const result = await parser.getText();
    
    const pages = result.pages.map((p, idx) => {
        // Normalize text
        const normText = p.text.normalize('NFKC').replace(/\u0640/g, '');
        const cleanText = cleanSurahName(normText);
        return {
            pageNum: idx + 1,
            text: cleanText,
            rawText: normText
        };
    });
    
    console.log('Verifying coverage...');
    
    const matchedPhrases = [];
    const unmatchedPhrases = [];
    
    for (const phrase of phraseList) {
        // Find which pages in the PDF mention all surahs in this phrase group
        const matchedPages = [];
        for (const page of pages) {
            const allSurahsMatched = phrase.surahNames.every(sname => {
                const cleanedSname = cleanSurahName(sname);
                return page.text.includes(cleanedSname);
            });
            if (allSurahsMatched) {
                matchedPages.push(page.pageNum);
            }
        }
        
        if (matchedPages.length > 0) {
            matchedPhrases.push({
                ...phrase,
                pages: matchedPages
            });
        } else {
            unmatchedPhrases.push(phrase);
        }
    }
    
    console.log(`\nCoverage Results:`);
    console.log(`Matched Phrases: ${matchedPhrases.length} / ${phraseList.length} (${((matchedPhrases.length / phraseList.length) * 100).toFixed(1)}%)`);
    console.log(`Unmatched Phrases: ${unmatchedPhrases.length} / ${phraseList.length}`);
    
    if (unmatchedPhrases.length > 0) {
        console.log('\nSample Unmatched Phrases:');
        unmatchedPhrases.slice(0, 15).forEach(p => {
            console.log(`- ID ${p.id}: "${p.title}" | Surahs: ${p.surahNames.join(', ')}`);
        });
    }
    
    // Save full report to artifact file for user
    const reportPath = 'C:/Users/HP/.gemini/antigravity/brain/4aebefe1-171a-4e7d-ac0e-45220332145d/coverage_report.md';
    let reportContent = `# Mutashabihat PDF Coverage Verification Report\n\n`;
    reportContent += `## Summary\n\n`;
    reportContent += `- **Total Mutashabihat Groups in Database**: ${phraseList.length}\n`;
    reportContent += `- **Matched Groups in PDF**: ${matchedPhrases.length} (${((matchedPhrases.length / phraseList.length) * 100).toFixed(1)}%)\n`;
    reportContent += `- **Unmatched Groups in PDF**: ${unmatchedPhrases.length}\n\n`;
    
    reportContent += `## Unmatched Groups Details\n\n`;
    if (unmatchedPhrases.length === 0) {
        reportContent += `All groups matched perfectly!\n`;
    } else {
        unmatchedPhrases.forEach(p => {
            reportContent += `- **ID ${p.id}**: "${p.title}" | Surahs: ${p.surahNames.join(', ')}\n`;
        });
    }
    
    fs.writeFileSync(reportPath, reportContent, 'utf8');
    console.log(`\nWrote complete verification report to ${reportPath}`);
}

main();
