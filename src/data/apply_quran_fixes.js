import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const alphaPath = path.join(__dirname, 'quran_to_Albaqara.json');
const fullPath = path.join(__dirname, 'quran_full_text.json');
const topicsPath = path.join(__dirname, 'surah_topics.json');

console.log('📖 قراءة الملفات الحالية...');
const alphaData = JSON.parse(fs.readFileSync(alphaPath, 'utf8'));
const fullData = JSON.parse(fs.readFileSync(fullPath, 'utf8'));

// ---------------------------------------------------------
// 1. استخراج المواضيع وهندستها
// ---------------------------------------------------------
console.log('🧠 معالجة مواضيع سورة البقرة...');
let alBaqarahSurah = alphaData.surahs.find(s => s.number === 2);
if (alBaqarahSurah && alBaqarahSurah.topics) {
    // استخراج المواضيع لملف خارجي كما هي بدون أي إضافات
    fs.writeFileSync(topicsPath, JSON.stringify(alBaqarahSurah.topics, null, 2), 'utf8');
    console.log(`✅ تم نقل ${alBaqarahSurah.topics.length} موضوع إلى surah_topics.json`);

    // حذف المواضيع من ملف الألفا
    delete alBaqarahSurah.topics;
}

// إنشاء خريطة (Map) سريعة للبحث عن النصوص الدقيقة والجزء والحزب
// fullTextMap[surahNumber][verseNumber] = "text"
const fullTextMap = {};
fullData.forEach(surah => {
    fullTextMap[surah.id] = {};
    surah.verses.forEach(verse => {
        fullTextMap[surah.id][verse.id] = verse.text;
    });
});

console.log('✍️ تصحيح أخطاء النصوص في ملف الألفا وهندسة الصفحات...');
// ---------------------------------------------------------
// 2. تصحيح النصوص في الألفا داخل المصفوفة السور
// ---------------------------------------------------------

// نحفظ Juz و Hizb لنمررهم لاحقاً لملف الفل تكست
const juzHizbMap = {}; // juzHizbMap[surahNumber][verseNumber] = { juz, hizb }

alphaData.pages.forEach(page => {
    // تحديث هيكل الصفحة
    page.firstAyahId = page.firstAyah.number;
    page.lastAyahId = page.lastAyah.number;

    delete page.firstAyah;
    delete page.lastAyah;
    delete page.fullText;

    // تصحيح نصوص الآيات داخل مصفوفة الصفحة، وحفظ الـ Juz/Hizb
    if (!juzHizbMap[page.surahNumber]) juzHizbMap[page.surahNumber] = {};

    page.ayahs.forEach(ayah => {
        const correctText = fullTextMap[page.surahNumber]?.[ayah.number];
        if (correctText) {
            ayah.text = correctText;

            // تسجيل الجزء والحزب لنقلهم مستقبلاً للملف الكامل
            juzHizbMap[page.surahNumber][ayah.number] = {
                juz: ayah.juz,
                hizb: ayah.hizb
            };
        }
    });
});

// ---------------------------------------------------------
// 3. توحيد ملف quran_full_text ليكون نسخة طبق الأصل
// ---------------------------------------------------------
console.log('🔄 توحيد هيكلة ملف quran_full_text...');

const unifiedFullData = fullData.map(surah => {
    return {
        number: surah.id,
        name: surah.name,
        englishName: surah.transliteration,
        type: surah.type,
        ayahCount: surah.total_verses,
        ayahs: surah.verses.map(verse => {
            const mappedInfo = juzHizbMap[surah.id]?.[verse.id] || {};
            // إنشاء كائن الآية الجديد مضيفاً إليه الجزء والحزب إن توفرا من الألفا
            const unifiedAyah = {
                number: verse.id,
                text: verse.text
            };
            if (mappedInfo.juz) unifiedAyah.juz = mappedInfo.juz;
            if (mappedInfo.hizb) unifiedAyah.hizb = mappedInfo.hizb;
            return unifiedAyah;
        })
    };
});

const finalSurahsStructure = {
    version: "1.0",
    generatedAt: new Date().toISOString(),
    description: "Full Quran Text Unified",
    surahs: unifiedFullData
};

// ---------------------------------------------------------
// 4. الحفظ في الملفات
// ---------------------------------------------------------
fs.writeFileSync(alphaPath, JSON.stringify(alphaData, null, 2), 'utf8');
fs.writeFileSync(fullPath, JSON.stringify(finalSurahsStructure, null, 2), 'utf8');

console.log('✅ اكتملت جميع مهام التوحيد والتنظيف بنجاح مطلق!');
console.log('يمكنك إعلام المساعد الذكي الآن بأن المهمة تمت بنجاح.');
