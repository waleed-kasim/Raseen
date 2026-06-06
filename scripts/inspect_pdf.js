const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

const pdfPath = path.join(__dirname, '../MutashabihatulQuran/mutashabihatPDF.pdf');

async function main() {
    console.log('Reading PDF from path:', pdfPath);
    const dataBuffer = fs.readFileSync(pdfPath);
    
    console.log('Parsing PDF...');
    try {
        const data = await pdf(dataBuffer);
        console.log('PDF parsed successfully!');
        console.log('Number of pages:', data.numpages);
        console.log('Text length:', data.text.length);
        
        // Write snippet
        const snippetPath = path.join(__dirname, 'pdf_snippet.txt');
        fs.writeFileSync(snippetPath, data.text.substring(0, 10000), 'utf8');
        console.log('Wrote first 10,000 characters to scripts/pdf_snippet.txt');
    } catch (e) {
        console.error('Error parsing PDF:', e);
    }
}

main();
