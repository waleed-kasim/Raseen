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
    
    // Normalize and translate digits
    const normText = translateDigits(result.text.normalize('NFKC'));
    
    // Find all numbers that appear as isolated digits in lines (which represents the serial numbers)
    const lines = normText.split('\n');
    const serialNumbers = new Set();
    
    lines.forEach(line => {
        const trimmed = line.trim();
        if (/^\d+$/.test(trimmed)) {
            serialNumbers.add(parseInt(trimmed));
        }
    });
    
    console.log('Serial numbers found in PDF:', Array.from(serialNumbers).sort((a,b)=>a-b));
    console.log('Max serial number:', Math.max(...Array.from(serialNumbers)));
}

main();
