# 🧹 Final Deep Cleanup Report

## 1. Asset & Public File Audit
*   **⚠️ Unused Patterns:** `public/patterns/` contains `p2.avif` and `p3.jpg`.
    *   *Check:* `App.jsx` and `index.css` reference these, but are they actually used by the user or just placeholders?
    *   *Action:* Confirm if user wants to keep 3 themes or stick to one.
*   **🗑️ Quarantine File:** `public/data/_QUARANTINE_README.js`
    *   *Status:* Explicitly marked "DO NOT DELETE".
    *   *Action:* **KEEP**. This is a placeholder for future full-Quran data.

## 2. CSS & Styling Audit
*   **Duplicate Animations:** `fadeIn` is defined in `index.css` but also used inline in some components (e.g. `MaskedReview.jsx`).
*   **Unused Utilities:** Classes like `.btn-gold` and `.info-badge` are defined in CSS but `MaskedReview` uses inline styles or hardcoded Tailwind-like classes in some places.
*   **Responsive inconsistencies:** Mobile carousel styles in `MainMenu.jsx` use a mix of CSS and inline logic.
*   **Action:**
    *   Standardize to use `index.css` classes (`fade-in`, `btn-gold`) everywhere.
    *   Remove inline `style={{...}}` blocks in `MaskedReview.jsx` and `RegularReview.jsx`.

## 3. Hardcoded Text & Magic Numbers
*   **ReviewSession.jsx:**
    *   "أحسنت!" and "اكتملت المراجعة!" are hardcoded.
*   **GameArea.jsx:**
    *   Mode titles ('تعرف على الصفحة', 'التسلسل') are hardcoded in a mapping object.
*   **SRS Logic:**
    *   Weights (10, 50, 20) are hardcoded in `srs.js`.
    *   *Action:* Move these to a `constants.js` file for easier tweaking.

## 4. Architecture & Logic (Recap)
*   **GameArea.jsx:** Confirmed as the biggest "Spaghetti" offender. Needs immediate splitting.
*   **Review Systems:** Confirmed to be improperly modeled as "Flashcards". Needs UI refactor to "Full Page Mode".

## 5. Dependencies
*   `package.json` is clean. `bootstrap` and `react-bootstrap` are used. No obvious unused heavy libraries.

## 🚀 Recommended Next Step
**Proceed with "Refactor GameArea" and "Refactor Review Systems" as the primary cleanup tasks.** The file deletion (cleanup) is minor compared to the architectural debt in `GameArea`.
