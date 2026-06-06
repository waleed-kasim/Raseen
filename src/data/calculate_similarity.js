import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { calculateJaccardSimilarity, calculateCosineSimilarity } from '../utils/similarity.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pagesPath = path.join(__dirname, 'quran_full_pages.json');

function main() {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.log('Usage: node calculate_similarity.js <surah1>:<ayah1> <surah2>:<ayah2>');
        console.log('Example: node calculate_similarity.js 2:48 2:123');
        process.exit(1);
    }

    const key1 = args[0];
    const key2 = args[1];

    if (!fs.existsSync(pagesPath)) {
        console.error(`Error: Could not find quran_full_pages.json at ${pagesPath}`);
        process.exit(1);
    }

    const quran = JSON.parse(fs.readFileSync(pagesPath, 'utf8'));
    
    // Create mapping key -> text
    const textMap = {};
    quran.pages.forEach(page => {
        const surahNum = page.surahNumber;
        page.ayahs.forEach(ayah => {
            textMap[`${surahNum}:${ayah.number}`] = ayah.text;
        });
    });

    const text1 = textMap[key1];
    const text2 = textMap[key2];

    if (!text1) {
        console.error(`Error: Verse ${key1} not found in dataset.`);
        process.exit(1);
    }
    if (!text2) {
        console.error(`Error: Verse ${key2} not found in dataset.`);
        process.exit(1);
    }

    const jaccard = calculateJaccardSimilarity(text1, text2);
    const cosine = calculateCosineSimilarity(text1, text2);

    console.log(`\n--- Comparison between ${key1} and ${key2} ---`);
    console.log(`\n[${key1}]:`);
    console.log(text1);
    console.log(`\n[${key2}]:`);
    console.log(text2);
    console.log('\n--- Similarity Scores ---');
    console.log(`Jaccard Word Overlap Similarity: ${(jaccard * 100).toFixed(2)}%`);
    console.log(`Cosine Word Vector Similarity:  ${(cosine * 100).toFixed(2)}%`);
}

main();
