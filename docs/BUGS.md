# PrintPro v2.0 — Known Bugs & Issues

Generated during Sprint 0 (Freeze & Inventory).

## Critical

| ID | Bug | File | Status |
|----|-----|------|--------|
| C-1 | Gemini API key exposed client-side in `callGeminiAPI()` | `utils/api.js:82` | **Open** — needs Firebase Function proxy |
| C-2 | PDF→DOCX export interpolates raw text into HTML without sanitization | `FileConverter.jsx` | **Open** — XSS vector |

## High

| ID | Bug | File | Status |
|----|-----|------|--------|
| H-1 | DocumentCleaner (1226 lines) single component — any change risks breaking unrelated features | `DocumentCleaner.jsx` | **Open** — planned extraction |
| H-2 | FileConverter (955 lines) — all 4 modes in one `startTask()` function | `FileConverter.jsx` | **Open** — planned extraction |
| H-3 | No loading timeout for Firebase auth — spinner hangs indefinitely if Firebase unreachable | `AppContext.jsx` | **Open** |
| H-4 | Crop pointer logic duplicated (useEffect + useCallback) — potential drift | `DocumentCleaner.jsx` | **Open** |
| H-5 | Tesseract.js runs on main thread — blocks UI for 5-30s during OCR | `DocumentCleaner.jsx` | **Open** — planned worker migration |

## Medium

| ID | Bug | File | Status |
|----|-----|------|--------|
| M-1 | Toast system has no stacking — rapid toasts overwrite each other | `DocumentCleaner.jsx` | **Open** |
| M-2 | Cover Designer AI background depends on Pollinations.ai (no SLA, CORS unreliable) | `CoverDesigner.jsx` | **Open** |
| M-3 | `AppContext` monolithic — all 8 consumers re-render on any state change | `AppContext.jsx` | **Open** — planned Zustand migration |
| M-4 | `callGeminiAPI` formerly named `callClaudeAPI` (calls Gemini, not Claude) | `utils/api.js` | **Fixed** in Sprint 0 |
| M-5 | No loading timeout for AI requests — user can wait indefinitely | `SmartAssistant.jsx` | **Open** |

## Low

| ID | Bug | File | Status |
|----|-----|------|--------|
| L-1 | `utils/history.js` was dead code (superseded by AppContext) | `utils/history.js` | **Deleted** in Sprint 0 |
| L-2 | `TYPE_CFG` exported from `constants.js` but never imported (duplicated in ProjectHistory) | `constants.js` | **Fixed** in Sprint 0 |
| L-3 | `getAverageBrightness` imported in DocumentCleaner but never called | `DocumentCleaner.jsx` | **Fixed** in Sprint 0 |
| L-4 | `user-select: auto` reset on inputs in global CSS may conflict with RTL text selection | `index.css` | **Open** |
