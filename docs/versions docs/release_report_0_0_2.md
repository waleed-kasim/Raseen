# Release Report — Quran Tool v0.0.2
**Release Date:** February 22, 2026  
**Release Type:** Feature Update + Hotfix  
**Previous Version:** 0.0.1 → 0.0.2

---

## Summary

This release introduces new features including a global reading bookmark, a complete corrections to the Quran text data (fixing diacritics/symbol errors), and a full project folder restructure. It also resolves all critical import errors that caused game challenge modes to break.

---

## New Features

### 1. Global Reading Bookmark
Users can now bookmark their current page to mark their last reading position. The bookmark is accessible across all review modes and displays a directional arrow indicator (↑/↓ for scroll mode, ←/→ for flip mode) pointing toward the bookmarked page.

- Bookmark is persisted in `localStorage`
- Visible as a star icon (⭐) in the page header of Smart Review and Regular Review
- Directional arrows animate when the bookmark is on a different page

---

### 2. Corrected Quran Text Data
Previous versions contained errors in the Arabic Uthmanic script (incorrect diacritics, symbol placement). The Quran data has been fully replaced with an accurate version:

- `quran_to_Albaqara.json` rebuilt from a verified source
- All Surah Al-Fatiha and Al-Baqarah ayahs re-validated
- Old `fullText` field removed; text is now derived from the `ayahs` array dynamically
- `firstAyah`/`lastAyah` objects replaced with numeric `firstAyahId`/`lastAyahId` references

---

### 3. Project Folder Reorganization
The `src/` directory was restructured into logical groups for maintainability:

```
src/
├── components/
│   ├── ui/          ← All shared UI components (merged from duplicate folders)
│   ├── game/        ← Game modes and review components
│   │   ├── modes/   ← Individual challenge modes
│   │   └── engine/  ← Shared game logic (ReviewEngine)
│   └── pages/       ← Full-page views
├── hooks/
│   └── game/        ← Custom React hooks (useSRSEngine, useReviewNavigation)
├── services/        ← Storage, SRS, Annotations
├── utils/
│   ├── javascUtil/  ← Pure JS utilities (gameUtils, arabicUtils)
│   └── reactUtil/   ← React-specific utilities (OptionsContainer)
└── data/            ← JSON data files and themes
```

---

## Bugs Fixed

### 1. Game Modes Disabled in Menu (Critical)
**Affected Modes:** "First Ayah", "Last Ayah", "Links Quiz"  
**Root Cause:** `checkRequirements` in `App.jsx` was checking for `p.firstAyah && p.lastAyah` (deleted fields).  
**Fix:** Updated to `p.firstAyahId && p.lastAyahId`.

```diff
- pages.filter(p => p.firstAyah && p.lastAyah && p.ayahs && p.ayahs.length > 1)
+ pages.filter(p => p.firstAyahId && p.lastAyahId && p.ayahs && p.ayahs.length > 1)
```

---

### 2. HTTP 500 on TruncatedOption.jsx (Critical)
**Root Cause:** Wrong relative import path going above `src/`.

```diff
- import { truncateText } from '../../../utils/javascUtil/gameUtils'
+ import { truncateText } from '../../utils/javascUtil/gameUtils'
```

---

### 3. HTTP 500 on useSRSEngine.js (Critical)

```diff
- import { SRSService } from '../../../services/srs'
+ import { SRSService } from '../../services/srs'
```

---

### 4. Broken Import in OptionsContainer.jsx (Critical)

```diff
- import TruncatedOption from '../../../components/game/ui/TruncatedOption'
+ import TruncatedOption from '../../components/ui/TruncatedOption'
```

---

## Files Modified

| File | Change |
|------|--------|
| `App.jsx` | Fixed `checkRequirements` for new data model |
| `src/components/ui/TruncatedOption.jsx` | Fixed import path |
| `src/hooks/game/useSRSEngine.js` | Fixed import path |
| `src/utils/reactUtil/OptionsContainer.jsx` | Fixed import path |
| `src/components/game/RegularReview.jsx` | Bookmark UI + data model fixes |
| `src/components/game/MaskedReview.jsx` | Bookmark feature integrated |
| `src/services/storage.js` | Updated `loadFromJSON` for new data structure |
| `src/data/quran_to_Albaqara.json` | Full data rebuild with corrected Quran text |
| `src/components/pages/SettingsPage.jsx` | Version bump |
| `package.json` | Version → 0.0.2 |
| `android/app/build.gradle` | versionCode 2, versionName "0.0.2" |

---

## Challenge Modes Status

| Mode | Status |
|------|--------|
| Page Recognition | ✅ Working |
| Sequence | ✅ Working |
| Prev & Next | ✅ Working |
| First Ayah | ✅ **Fixed** |
| Last Ayah | ✅ **Fixed** |
| Ayah to Number | ✅ Working |
| Number to Ayah | ✅ **Fixed** |
| Links Quiz | ✅ **Fixed** |
| Links View | ✅ Working |

---

## Requirements

| Environment | Version |
|-------------|---------|
| Node.js | ≥ 18 |
| Android SDK | ≥ 34 |
| Electron | 28.x |

---

*Quran Tool — Alpha Build | Surah Al-Baqarah Edition*
