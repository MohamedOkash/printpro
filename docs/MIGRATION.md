# PrintPro v3 — Migration Roadmap

Generated during Sprint 0.

## Sprint 0 — Freeze & Cleanup (✅ Current)

**Goal**: Stabilize, remove dead code, fix naming, document everything.
**Deliverables**: Cleaned codebase, docs/ directory, build verified.
**Changes Made**:
- Deleted `src/utils/history.js` (dead code)
- Removed `TYPE_CFG` export from `constants.js` (dead export)
- Removed unused `getAverageBrightness` import from `DocumentCleaner.jsx`
- Renamed `callClaudeAPI` → `callGeminiAPI` (misleading name)
- Created `docs/` with audit reports

## Sprint 1 — DocumentScanner Extraction

**Goal**: Split `DocumentCleaner.jsx` (1226 lines) into `features/scanner/`.
**Deliverables**:
- `features/scanner/store.ts` — Zustand store
- `features/scanner/services/scannerService.ts` — business logic
- `features/scanner/hooks/useCrop.ts` — merge duplicate pointer handlers
- `features/scanner/hooks/useUndoRedo.ts` — extract undo/redo
- `features/scanner/components/` — split components
**Risk**: Medium — refactoring 1226-line component without breaking functionality.

## Sprint 2 — PDF Tools Extraction

**Goal**: Split `FileConverter.jsx` (955 lines) into `features/pdf-tools/`.
**Deliverables**:
- `features/pdf-tools/services/` — 4 services (merge/split/edit/convert)
- Fix XSS in PDF→DOCX export
**Risk**: Medium.

## Sprint 3 — OCR Worker Migration

**Goal**: Move Tesseract.js to Web Worker + queue system.
**Deliverables**:
- `features/ocr/workers/ocrWorker.ts`
- Queue service with retry logic
**Risk**: Medium — significant architecture change.

## Sprint 4 — State Management

**Goal**: Replace monolithic `AppContext` with Zustand stores.
**Deliverables**:
- `stores/authStore.ts`
- `stores/i18nStore.ts`
- `stores/historyStore.ts` (React Query)
**Risk**: High — AppContext consumed by 8 files.

## Sprint 5 — Security Hardening

**Goal**: Move Gemini API key to Firebase Functions.
**Deliverables**:
- `functions/src/geminiProxy.ts`
- Update `api.js` to call proxy instead of Gemini directly
**Risk**: Low — new endpoint, old one still works during transition.

## Sprint 6 — Cover Designer Extraction

**Goal**: Split `CoverDesigner.jsx` (712 lines) into `features/designer/`.
**Deliverables**:
- `features/designer/components/` — canvas, elements, frames, stickers, AI
- `features/designer/services/` — export, AI generation
**Risk**: Low.
