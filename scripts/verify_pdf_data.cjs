const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

const pdfPath = path.join(__dirname, '../MutashabihatulQuran/mutashabihatPDF.pdf');

// Helper to translate Arabic/Indic digits to standard digits
function translateDigits(text) {
    const map = {
        '': '1', '': '2', '': '3', '': '4', '': '5',
        '': '6', '': '7', '': '8', '': '9', '': '0'
    };
    return text.replace(/[-]/g, m => map[m]);
}

async function main() {
    const dataBuffer = fs.readFileSync(pdfPath);
    const parser = new pdf.PDFParse({ data: dataBuffer });
    await parser.load();
    const result = await parser.getText();
    
    const lines = result.text.split('\n');
    console.log(`Total lines extracted: ${lines.length}`);
    
    // Log lines that look like table rows with surahs and indices
    const surahPattern = /(البقرة|الأنعام|الأعراف|يونس|هود|يوسف|الرعد|إبراهيم|الحجر|النحل|الإسراء|الكهف|مريم|طه|الأنبياء|الحج|المؤمنون|النور|الفرقان|الشعراء|النمل|القصص|العنكبوت|الروم|لقمان|السجدة|الأحزاب|سبأ|فاطر|يس|الصافات|ص|الزمر|غافر|فصلت|الشورى|الزخرف|الدخان|الجاثية|الأحقاف|الفتح|الحديد|الحشر|الصف|الجمعة|التغابن|النبأ|النازعات|المرسلات|آل عمران|التوبة|النساء|المائدة|الذاريات|الطور|البينة)/i;
    
    let matchedLinesCount = 0;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (surahPattern.test(line)) {
            const translated = translateDigits(line);
            console.log(`Line ${i + 1}: ${line} --> ${translated}`);
            matchedLinesCount++;
            if (matchedLinesCount > 100) {
                console.log('... truncated ...');
                break;
            }
        }
    }
}

main();
