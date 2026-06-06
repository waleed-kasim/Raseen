const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

const pdfPath = path.join(__dirname, '../MutashabihatulQuran/mutashabihatPDF.pdf');

async function main() {
    console.log('Reading PDF from path:', pdfPath);
    const dataBuffer = fs.readFileSync(pdfPath);
    
    console.log('Parsing PDF...');
    try {
        const parser = new pdf.PDFParse({ data: dataBuffer });
        await parser.load();
        console.log('PDF loaded. Extracting text...');
        
        const result = await parser.getText();
        console.log('PDF parsed successfully!');
        console.log('Number of pages:', result.pages.length);
        console.log('Text length:', result.text.length);
        
        // Write snippet
        const snippetPath = path.join(__dirname, 'pdf_snippet.txt');
        fs.writeFileSync(snippetPath, result.text.substring(0, 10000), 'utf8');
        console.log('Wrote first 10,000 characters to scripts/pdf_snippet.txt');
    } catch (e) {
        console.error('Error parsing PDF:', e);
    }
}

main();
