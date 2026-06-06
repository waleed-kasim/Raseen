
// Themes Data Structure for Surah Al-Baqarah
// Hierarchical Structure: Surah -> Major Section -> Granular Theme

// Major Sections Definition
export const SURAH_STRUCTURE = [
    {
        id: 2,
        name: 'سورة البقرة',
        sections: [
            { id: 'baq_sec_1', title: 'المقدمة وأصناف الناس', range: '1-29' },
            { id: 'baq_sec_2', title: 'قصة آدم وعناد بني إسرائيل', range: '30-123' },
            { id: 'baq_sec_3', title: 'بناء الكعبة وتحويل القبلة', range: '124-152' },
            { id: 'baq_sec_4', title: 'التشريع الإسلامي ومنهج الأمة', range: '153-253' },
            { id: 'baq_sec_5', title: 'الإنفاق وعظمة التوحيد', range: '254-286' }
        ]
    }
];

// Helper to generate verse references
const getVerses = (start, end) => {
    const verses = [];
    for (let i = start; i <= end; i++) {
        verses.push({ surah: 2, ayah: i });
    }
    return verses;
};

export const THEMES_DATA = [
    // --- SECTION 1: المقدمة وأصناف الناس (1-29) ---
    {
        id: 'baq_1',
        sectionId: 'baq_sec_1',
        title: 'المقدمة وصفات المتقين',
        description: 'بداية السورة ووصف الفئة المؤمنة.',
        color: '#2ECC71',
        verses: getVerses(1, 5)
    },
    {
        id: 'baq_2',
        sectionId: 'baq_sec_1',
        title: 'صفات الكافرين',
        description: 'التحذير من عاقبة الكفر.',
        color: '#E74C3C',
        verses: getVerses(6, 7)
    },
    {
        id: 'baq_3',
        sectionId: 'baq_sec_1',
        title: 'صفات المنافقين',
        description: 'وصف النفسية المريضة للمنافقين وخداعهم.',
        color: '#F39C12',
        verses: getVerses(8, 20)
    },
    {
        id: 'baq_4',
        sectionId: 'baq_sec_1',
        title: 'الدعوة العامة والتحدي',
        description: 'أمر الناس بعبادة الله وتحدي المشككين.',
        color: '#16A085',
        verses: getVerses(21, 29)
    },

    // --- SECTION 2: قصة آدم وعناد بني إسرائيل (30-123) ---
    {
        id: 'baq_5',
        sectionId: 'baq_sec_2',
        title: 'قصة خلق آدم',
        description: 'الاستخلاف في الأرض وسجود الملائكة.',
        color: '#3498DB',
        verses: getVerses(30, 39)
    },
    {
        id: 'baq_6_1',
        sectionId: 'baq_sec_2',
        title: 'بنو إسرائيل: التذكير بالنعم العامة',
        description: 'نداءات يا بني إسرائيل والنجاة من آل فرعون.',
        color: '#1ABC9C',
        verses: getVerses(40, 52)
    },
    {
        id: 'baq_6_2',
        sectionId: 'baq_sec_2',
        title: 'بنو إسرائيل: العناد في التيه',
        description: 'قصة الاستسقاء، المن والسلوى، ورفع الطور.',
        color: '#16A085',
        verses: getVerses(53, 66)
    },
    {
        id: 'baq_7',
        sectionId: 'baq_sec_2',
        title: 'قصة البقرة',
        description: 'قصة ذبح البقرة وجدال بني إسرائيل.',
        color: '#D35400',
        verses: getVerses(67, 74)
    },
    {
        id: 'baq_8',
        sectionId: 'baq_sec_2',
        title: 'قسوة القلوب والتحريف',
        description: 'عناد اليهود وتحريفهم للحق.',
        color: '#C0392B',
        verses: getVerses(75, 86)
    },
    {
        id: 'baq_9',
        sectionId: 'baq_sec_2',
        title: 'الأنبياء والسحر',
        description: 'موقفهم من موسى وعيسى واتباعهم للسحر.',
        color: '#8E44AD',
        verses: getVerses(87, 103)
    },
    {
        id: 'baq_10',
        sectionId: 'baq_sec_2',
        title: 'النسخ وأهل الكتاب',
        description: 'حسد أهل الكتاب وأحكام النسخ.',
        color: '#2980B9',
        verses: getVerses(104, 123)
    },

    // --- SECTION 3: بناء الكعبة وتحويل القبلة (124-152) ---
    {
        id: 'baq_11',
        sectionId: 'baq_sec_3',
        title: 'ابتلاء إبراهيم وبناء البيت',
        description: 'قصة إبراهيم وإسماعيل وبناء الكعبة.',
        color: '#7F8C8D',
        verses: getVerses(124, 141)
    },
    {
        id: 'baq_12',
        sectionId: 'baq_sec_3',
        title: 'تحويل القبلة',
        description: 'الأمر بالتوجه شطر المسجد الحرام.',
        color: '#9B59B6',
        verses: getVerses(142, 152)
    },

    // --- SECTION 4: التشريع الإسلامي ومنهج الأمة (153-253) ---
    {
        id: 'baq_13',
        sectionId: 'baq_sec_4',
        title: 'الصبر والابتلاء',
        description: 'الاستعانة بالصبر والصفا والمروة.',
        color: '#27AE60',
        verses: getVerses(153, 167)
    },
    {
        id: 'baq_14',
        sectionId: 'baq_sec_4',
        title: 'الحلال والبر',
        description: 'أكل الطيبات وحقيقة البر.',
        color: '#F1C40F',
        verses: getVerses(168, 177)
    },
    {
        id: 'baq_15',
        sectionId: 'baq_sec_4',
        title: 'القصاص والوصية',
        description: 'أحكام الجنايات والوصية.',
        color: '#E67E22',
        verses: getVerses(178, 182)
    },
    {
        id: 'baq_16',
        sectionId: 'baq_sec_4',
        title: 'أحكام الصيام والدعاء',
        description: 'شهر رمضان وليلة الصيام.',
        color: '#34495E',
        verses: getVerses(183, 188)
    },
    {
        id: 'baq_17_1',
        sectionId: 'baq_sec_4',
        title: 'أحكام القتال في سبيل الله',
        description: 'القتال في سبيل الله والإنفاق في الجهاد.',
        color: '#C0392B',
        verses: getVerses(189, 195)
    },
    {
        id: 'baq_17_2',
        sectionId: 'baq_sec_4',
        title: 'مناسك الحج والعمرة',
        description: 'أحكام الإحرام، الهدي، عرفات، والتشريق.',
        color: '#95A5A6',
        verses: getVerses(196, 203)
    },
    {
        id: 'baq_18',
        sectionId: 'baq_sec_4',
        title: 'أصناف الناس',
        description: 'المؤمن المخلص والمنافق اللدود.',
        color: '#BDC3C7',
        verses: getVerses(204, 214)
    },
    {
        id: 'baq_19',
        sectionId: 'baq_sec_4',
        title: 'أحكام متنوعة',
        description: 'الإنفاق، القتال، الخمر، اليتامى.',
        color: '#16A085',
        verses: getVerses(215, 220)
    },
    {
        id: 'baq_20_1',
        sectionId: 'baq_sec_4',
        title: 'أحكام النكاح والطلاق',
        description: 'المشركات، المحيض، الإيلاء، والطلقات الثلاث.',
        color: '#D35400',
        verses: getVerses(221, 232)
    },
    {
        id: 'baq_20_2',
        sectionId: 'baq_sec_4',
        title: 'أحكام الرضاعة والوفاة',
        description: 'أحكام الرضاع، عدة المتوفى عنها، والوصية.',
        color: '#E67E22',
        verses: getVerses(233, 242)
    },
    {
        id: 'baq_21',
        sectionId: 'baq_sec_4',
        title: 'قصة طالوت وجالوت',
        description: 'القتال في سبيل الله والمُلك.',
        color: '#2980B9',
        verses: getVerses(243, 253)
    },

    // --- SECTION 5: الإنفاق وعظمة التوحيد (254-286) ---
    {
        id: 'baq_22',
        sectionId: 'baq_sec_5',
        title: 'الكرسي والتوحيد',
        description: 'آية الكرسي ونفي الإكراه.',
        color: '#F1C40F',
        verses: getVerses(254, 257)
    },
    {
        id: 'baq_23',
        sectionId: 'baq_sec_5',
        title: 'دلائل القدرة',
        description: 'مجادلة إبراهيم وقصص البعث.',
        color: '#8E44AD',
        verses: getVerses(258, 260)
    },
    {
        id: 'baq_24_1',
        sectionId: 'baq_sec_5',
        title: 'أمثال الإنفاق في سبيل الله',
        description: 'مثل حبة أنبتت سبع سنابل، الصدقة بغير أذى.',
        color: '#2ECC71',
        verses: getVerses(261, 266)
    },
    {
        id: 'baq_24_2',
        sectionId: 'baq_sec_5',
        title: 'آداب الصدقة والرزق',
        description: 'الإنفاق من الطيبات، الصدقة في السر والعلن.',
        color: '#27AE60',
        verses: getVerses(267, 274)
    },
    {
        id: 'baq_25',
        sectionId: 'baq_sec_5',
        title: 'تحريم الربا',
        description: 'الحرب على آكلي الربا.',
        color: '#C0392B',
        verses: getVerses(275, 281)
    },
    {
        id: 'baq_26',
        sectionId: 'baq_sec_5',
        title: 'آية الدين',
        description: 'أطول آية: توثيق الديون.',
        color: '#34495E',
        verses: getVerses(282, 283)
    },
    {
        id: 'baq_27',
        sectionId: 'baq_sec_5',
        title: 'خاتمة السورة',
        description: 'الإيمان والدعاء والتسليم.',
        color: '#2C3E50',
        verses: getVerses(284, 286)
    }
];
