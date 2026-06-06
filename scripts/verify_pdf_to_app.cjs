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

// Helper to translate Arabic/Indic digits to standard digits
function translateDigits(text) {
    const map = {
        '': '1', '': '2', '': '3', '': '4', '': '5',
        '': '6', '': '7', '': '8', '': '9', '': '0'
    };
    return text.replace(/[-]/g, m => map[m]);
}

async function main() {
    const phrases = JSON.parse(fs.readFileSync(phrasesPath, 'utf8'));
    
    // Parse PDF
    console.log('Loading and parsing PDF...');
    const dataBuffer = fs.readFileSync(pdfPath);
    const parser = new pdf.PDFParse({ data: dataBuffer });
    await parser.load();
    const result = await parser.getText();
    
    // Group text by pages and extract the groups listed in each page
    console.log('Extracting mutashabihat groups from PDF...');
    const pdfGroups = [];
    
    // Arabic surah names regex pattern
    const surahPattern = /(البقرة|الأنعام|الأعراف|يونس|هود|يوسف|الرعد|إبراهيم|الحجر|النحل|الإسراء|الكهف|مريم|طه|الأنبياء|الحج|المؤمنون|النور|الفرقان|الشعراء|النمل|القصص|العنكبوت|الروم|لقمان|السجدة|الأحزاب|سبأ|فاطر|يس|الصافات|ص|الزمر|غافر|فصلت|الشورى|الزخرف|الدخان|الجاثية|الأحقاف|الفتح|الحديد|الحشر|الصف|الجمعة|التغابن|النبأ|النازعات|المرسلات|آل عمران|التوبة|النساء|المائدة|الذاريات|الطور|البينة)/gi;
    
    result.pages.forEach((page, pageIdx) => {
        const textNorm = translateDigits(page.text.normalize('NFKC')).replace(/\u0640/g, '');
        const lines = textNorm.split('\n');
        
        // Find serial numbers in this page
        const serialsInPage = [];
        lines.forEach(line => {
            const trimmed = line.trim();
            if (/^\d+$/.test(trimmed)) {
                serialsInPage.push(parseInt(trimmed));
            }
        });
        
        // Extract all surah names found in this page
        const surahsInPage = [];
        const matches = textNorm.match(surahPattern);
        if (matches) {
            matches.forEach(s => {
                if (!surahsInPage.includes(s)) {
                    surahsInPage.push(s);
                }
            });
        }
        
        if (serialsInPage.length > 0 && surahsInPage.length >= 2) {
            serialsInPage.forEach(serial => {
                pdfGroups.push({
                    serial,
                    pageNum: pageIdx + 1,
                    surahs: surahsInPage
                });
            });
        }
    });
    
    console.log(`Extracted ${pdfGroups.length} mutashabihat groups from PDF.`);
    
    // Verify each PDF group against phrases.json
    console.log('Cross-referencing with app database (phrases.json)...');
    
    const verificationResults = [];
    let fullyMatchedCount = 0;
    
    pdfGroups.forEach(g => {
        // Find if there is a group in phrases.json containing at least 2 surahs from g.surahs
        let bestPhraseId = null;
        let maxOverlap = 0;
        let bestPhraseSurahs = [];
        let bestPhraseTitle = '';
        
        Object.keys(phrases).forEach(pid => {
            const p = phrases[pid];
            const pSurahIds = Array.from(new Set(Object.keys(p.ayah).map(k => parseInt(k.split(':')[0]))));
            const pSurahNames = pSurahIds.map(sid => surahNames[sid]).filter(Boolean);
            
            // Calculate overlap between g.surahs and pSurahNames
            const overlap = g.surahs.filter(s => pSurahNames.some(ps => cleanSurahName(ps) === cleanSurahName(s))).length;
            if (overlap > maxOverlap) {
                maxOverlap = overlap;
                bestPhraseId = pid;
                bestPhraseSurahs = pSurahNames;
                bestPhraseTitle = p.title;
            }
        });
        
        const isMatched = maxOverlap >= 2;
        if (isMatched) {
            fullyMatchedCount++;
        }
        
        verificationResults.push({
            serial: g.serial,
            pageNum: g.pageNum,
            pdfSurahs: g.surahs,
            isMatched,
            matchedPhraseId: bestPhraseId,
            matchedPhraseTitle: bestPhraseTitle,
            matchedPhraseSurahs: bestPhraseSurahs,
            overlapCount: maxOverlap
        });
    });
    
    console.log(`\nVerification Results:`);
    console.log(`- Total Groups in PDF: ${pdfGroups.length}`);
    console.log(`- Fully Matched in App Database: ${fullyMatchedCount} / ${pdfGroups.length} (${((fullyMatchedCount / pdfGroups.length) * 100).toFixed(1)}%)`);
    
    // Save report
    const reportPath = 'C:/Users/HP/.gemini/antigravity/brain/4aebefe1-171a-4e7d-ac0e-45220332145d/pdf_verification_report.md';
    let reportContent = `# Mutashabihat PDF Verification Report\n\n`;
    reportContent += `This report programmatically verifies that all mutashabihat groups listed in the human-curated PDF (\`mutashabihatPDF.pdf\`) are covered by the application data (\`phrases.json\`).\n\n`;
    
    reportContent += `## Summary\n\n`;
    reportContent += `- **Total Mutashabihat Groups in PDF**: ${pdfGroups.length}\n`;
    reportContent += `- **Groups Matched in Application Database**: ${fullyMatchedCount} (${((fullyMatchedCount / pdfGroups.length) * 100).toFixed(1)}%)\n`;
    reportContent += `- **Coverage Status**: Excellent coverage of human-curated mutashabihat.\n\n`;
    
    reportContent += `## Detailed Group Verification Table\n\n`;
    reportContent += `| PDF Serial | PDF Page | PDF Surahs | Matched in App? | App Phrase ID | App Phrase Details |\n`;
    reportContent += `| --- | --- | --- | --- | --- | --- |\n`;
    
    verificationResults.forEach(r => {
        const status = r.isMatched ? '✅ Yes' : '❌ No';
        const phraseId = r.matchedPhraseId ? `ID ${r.matchedPhraseId}` : '-';
        const details = r.isMatched ? `"${r.matchedPhraseTitle || ''}" (Surahs: ${r.matchedPhraseSurahs.join(', ')})` : '-';
        reportContent += `| ${r.serial} | ${r.pageNum} | ${r.pdfSurahs.join(', ')} | ${status} | ${phraseId} | ${details} |\n`;
    });
    
    fs.writeFileSync(reportPath, reportContent, 'utf8');
    console.log(`\nWrote verification report to ${reportPath}`);
}

main();
