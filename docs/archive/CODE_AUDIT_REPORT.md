# Codebase Audit Report

## 1. Executive Summary
The codebase is generally functional but exhibits signs of "organic growth" that has led to some monolithic components and mixed responsibilities. The separation of concerns between `components` and `services` is good, but `components` themselves act as "God Objects" in some cases.

## 2. Spaghetti Code & Monolithic Components

### 🚨 `src/components/game/GameArea.jsx` (Critical)
*   **Issue:** This is a "God Component" (>900 lines) that handles **9 different game modes** (`pageRecognition`, `sequence`, `prevNext`, etc.) within a single file.
*   **Symptoms:**
    *   Huge `switch` statements for loading data and rendering.
    *   State variables (`page1`, `page2`, `links`, `prevPage`) that are only used in specific modes, cluttering the component state.
    *   Hard to maintain: Adding a new game mode requires modifying this massive file.
*   **Recommendation:** Refactor into smaller components:
    *   `src/components/game/modes/PageRecognition.jsx`
    *   `src/components/game/modes/SequenceGame.jsx`
    *   `src/components/game/modes/AyahFinder.jsx`
    *   `GameArea.jsx` becomes a simple wrapper/router that imports these modes.

### ⚠️ `src/components/game/MaskedReview.jsx` (High)
*   **Issue:** A large file (~900 lines) that mixes:
    *   Game Logic (Timer, Score, Auto-reveal)
    *   UI Logic (Rendering words, specialized styling)
    *   Annotation Logic (Context menus, Input modals, Range selection)
    *   SRS Interaction
*   **Recommendation:**
    *   Extract complex logic into custom hooks: `useGameLogic`, `useAnnotationSystem`.
    *   Move the "Floating Controls Bar" into a separate component `ReviewControls.jsx`.

## 3. Code Duplication

### `ReviewSession.jsx` vs `MaskedReview.jsx`
*   **Issue:** Both components implement a "Flashcard" style review with "Reveal" functionality and "Rating" buttons.
*   **Details:** `ReviewSession` seems to be the "Daily Review" (Due Cards), while `MaskedReview` is "Smart Review" (Continuous). They share 80% of the UI concepts but implemented separately.
*   **Recommendation:** Create a shared `FlashcardFrame` component or merge them into a single `ReviewEngine` that acts differently based on the source (Due Queue vs Smart Random).

### `WordRenderer` Logic
*   **Issue:** `MaskedReview.jsx` manually iterates and renders words with custom logic that mirrors `WordRenderer.jsx` but adds masking/selection.
*   **Recommendation:** Enhance `WordRenderer` to support a `maskingEnabled` prop and `onWordClick` handlers to avoid duplicating the rendering loop.

## 4. Unused & Orphan Code

### 🗑️ Blueprint Files
The following files appear to be "Blueprints" or placeholders that are **not currently used** by the application logic:
1.  `src/services/analytics.js` (Exports empty methods like `calculateSurahScore`).
2.  `src/services/backup.js` (Exports empty methods like `createBackup`).

### ℹ️ Untracked Dependencies
*   Check `package.json` for unused packages (requires running a tool like `depcheck`).

## 5. Architecture & Styling
*   **Inline Styles:** Heavy use of `style={{ ... }}` in `MaskedReview` and `RegularReview`. This makes the code harder to read and harder to theme.
*   **Recommendation:** Move these styles to `index.css` or use CSS Modules.

## Action Plan
1.  **Refactor GameArea:** Break it down into sub-components immediately.
2.  **Delete/Archive Blueprints:** If not planned for immediate use, move `backup.js` and `analytics.js` to a `docs/blueprints` folder to avoid confusion.
3.  **Standardize CSS:** Begin replacing inline styles with utility classes during refactoring.
