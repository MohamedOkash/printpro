# PrintPro v2.0 — Feature Inventory

Generated during Sprint 0 (Freeze & Inventory).

## Core Features

### Document Scanner (`DocumentCleaner.jsx`)
- Multi-page document loading (images + PDF)
- PDF page extraction via pdf.js
- 7 filter presets (raw, doc, photo, shadow, high, soft, old)
- Brightness slider (50-300%)
- Contrast slider (50-500%)
- Grayscale slider (0-100%)
- Invert toggle
- HD Sharpen (unsharp-mask convolution)
- Adaptive Threshold (CamScanner-style binarization)
- Shadow Removal (uneven-lighting normalization)
- Auto Enhance (brightness analysis + auto config)
- Smart Crop (Sobel edge detection + auto-crop)
- Manual Crop (8-handle draggable rectangle)
- A4 aspect ratio lock
- Rotate 90° clockwise
- Flip horizontal
- Undo/Redo (15 snapshots)
- Before/After split-view comparison
- Watermark overlay (diagonal text, configurable opacity)
- Save as Image (JPEG download)
- Save as PDF (multi-page via jsPDF)
- Web Share API integration
- Camera capture (getUserMedia)

### OCR (`DocumentCleaner.jsx`)
- Tesseract.js Arabic+English text recognition
- Progress tracking
- Copy to clipboard

### PDF Tools (`FileConverter.jsx`)
- PDF Merge (combine multiple PDFs via pdf-lib)
- PDF Split (extract page range)
- PDF Edit:
  - Page numbering (position, size, start offset)
  - Watermark/stamp (diagonal, opacity)
  - Password encryption (user/owner passwords)
- Format Conversion:
  - PDF → ZIP (images via JSZip)
  - PDF → DOCX (HTML wrapper, RTL support)
  - PDF → TXT (plain text extraction)
  - DOCX → PDF (mammoth.js → html2canvas → jsPDF)
  - XLSX → PDF (SheetJS → jsPDF-AutoTable)
  - Images → PDF (via jsPDF)

### Cover Designer (`CoverDesigner.jsx`)
- Text elements (6 Arabic fonts, editable)
- Image elements (uploaded)
- Drag & drop positioning
- 21 SVG decorative frames
- 22 emoji stickers
- AI cover text generation (Gemini API)
- AI background generation (Pollinations.ai)
- AI sticker generation (Pollinations.ai)
- Export PNG (html2canvas, 3x scale)
- Browser print (A4 CSS)

### Smart Assistant (`SmartAssistant.jsx`)
- File upload with drag & drop
- Natural language processing via Gemini API
- Offline fallback (regex classification)
- Auto-navigation to correct tool with file transfer

### History (`ProjectHistory.jsx`)
- Firestore real-time sync (authenticated users)
- localStorage fallback (guest mode, 40-item cap)
- Type-based filtering (7 types)
- Preview modal
- Resume/edit projects
- Delete/clear history

### Authentication (`Login.jsx` + `AppContext.jsx`)
- Email/password sign-in
- Email/password sign-up
- Google OAuth (popup)
- Guest mode (local-only)
- Arabic error message mapping

### Infrastructure
- Bilingual AR/EN runtime switching
- Responsive layout (sidebar desktop / bottom-nav mobile)
- Dynamic CDN script loading (10 libraries)
- Firebase Hosting (SPA with rewrites)

## Feature Count: 52 features
