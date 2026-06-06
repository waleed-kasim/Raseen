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
    
    // Normalize unicode compatibility forms and remove tatweel
    const normalizedText = translateDigits(result.text.normalize('NFKC')).replace(/\u0640/g, '');
    
    const lines = normalizedText.split('\n');
    console.log(`Normalized text lines count: ${lines.length}`);
    
    // Let's write the first 100 lines to console to check
    for (let i = 0; i < 200; i++) {
        if (lines[i]) {
            console.log(`Line ${i + 1}: ${lines[i].trim()}`);
        }
    }
}

main();
