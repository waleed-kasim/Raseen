import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// مسار الملف الأصلي
const fullTextPath = path.join(__dirname, 'quran_full_text.json');

console.log('جاري قراءة الملف...');
const rawData = fs.readFileSync(fullTextPath, 'utf8');
const quranData = JSON.parse(rawData);

console.log('جاري توحيد البيانات (تغيير المعرفات لتتطابق مع quran_to_Albaqara.json)...');
const unifiedData = quranData.map(surah => {
    return {
        number: surah.id,
        name: surah.name,
        englishName: surah.transliteration,
        type: surah.type,
        ayahCount: surah.total_verses,
        ayahs: surah.verses.map(verse => ({
            number: verse.id,
            text: verse.text
        }))
    };
});

const finalStructure = {
    version: "1.0",
    generatedAt: new Date().toISOString(),
    description: "Full Quran data unified structure",
    topicsReady: false,
    surahs: unifiedData,
    pages: [] // Requires manual or algorithmic page mapping later if needed
};

fs.writeFileSync(fullTextPath, JSON.stringify(finalStructure, null, 2), 'utf8');
console.log('✅ تم توحيد بيانات القرآن بنجاح! يمكنك الآن إخبار المساعد ليكمل عمله.');
