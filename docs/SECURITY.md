# PrintPro v2.0 — Security Audit

Generated during Sprint 0 (Freeze & Inventory).

## Critical Findings

### C-1: Gemini API Key Exposed Client-Side

**File**: `src/utils/api.js:82`
**Issue**: `VITE_GEMINI_API_KEY` is read from `import.meta.env` and sent directly from the browser to `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`.
**Impact**: Anyone can inspect network traffic or bundle JS to extract the API key.
**Fix**: Move AI requests to a Firebase Function proxy.
**Priority**: Critical.
**Status**: Open — migration planned for Sprint 5.

### C-2: XSS in PDF→DOCX Export

**File**: `src/components/FileConverter.jsx` (PDF→DOCX conversion)
**Issue**: PDF-extracted text is interpolated directly into an HTML document without sanitization. A PDF containing `<script>alert('xss')</script>` would execute when the DOCX is opened.
**Impact**: Remote code execution when user opens exported Word document.
**Fix**: Sanitize extracted text with DOMPurify or encode HTML entities.
**Priority**: High.
**Status**: Open.

## Medium Findings

### M-1: `.env` Not in `.gitignore`

**File**: `.gitignore` line 28
**Issue**: `.env` IS listed in `.gitignore` and is NOT tracked by git. Verified: `.env` has never been committed.
**Verdict**: **No action needed** — configuration is correct.

### M-2: No Rate Limiting on Gemini API

**File**: `src/utils/api.js`
**Issue**: `callGeminiAPI` can be called repeatedly from client-side with no throttling.
**Impact**: API key abuse potential.
**Fix**: Move to Firebase Function with rate limiting.
**Priority**: Medium.

### M-3: Firebase Config Exposed

**File**: `src/utils/firebase.js`
**Issue**: Firebase config values are in client-side `.env` and bundled into JS. This is standard for Firebase (API key is designed to be public).
**Verdict**: **Acceptable** — Firebase security relies on security rules, not key secrecy.

## Low Findings

### L-1: CORS-Dependent Image Export

**File**: `src/components/CoverDesigner.jsx`
**Issue**: Cover designer uses `crossOrigin="anonymous"` on images from Pollinations.ai. If CORS headers are not sent, html2canvas export will fail silently.
**Impact**: Broken export for AI-generated backgrounds.
**Priority**: Low.

## Summary

| Severity | Count | Status |
|----------|-------|--------|
| Critical | 2 | Open |
| High | 1 | Open |
| Medium | 2 | Open |
| Low | 1 | Open |

**Next Action**: Implement Firebase Function proxy for Gemini API key (Sprint 5).
