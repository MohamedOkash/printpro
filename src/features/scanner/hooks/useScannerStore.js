import { useState, useRef, useEffect, useCallback } from 'react'
import { useApp } from '../../../context/AppContext'
import { FILTER_PRESETS } from '../../../constants'
import { dataURLtoBlob } from '../utils/imageUtils'
import { applySharpen, applyAdaptive, applyShadowRemoval, applyColorAdjustments } from '../../../utils/imageProcessing'
import { buildFinalCanvas } from '../utils/canvasUtils'
import { detectDocumentCornersFromDataUrl } from '../services/opencv/documentDetection'
import { correctPerspective } from '../services/opencv/perspectiveCorrection'
import { useUndoRedo } from './useUndoRedo'
import { useBeforeAfter } from './useBeforeAfter'
import { useWatermark } from './useWatermark'
import { useUIState } from './useUIState'
import { useFilters } from './useFilters'
import { useCrop } from './useCrop'
import { usePageManager } from './usePageManager'
import { useCamera } from './useCamera'
import { useOCR } from './useOCR'
import { useExport } from './useExport'
import { useProjects } from './useProjects'
import { useBatch } from './useBatch'

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function buildSnapshot(pages, crop, filters, watermark, ocr, projects) {
  return {
    title: projects.currentProjectTitle,
    activePage: pages.activePage,
    pages: pages.pages,
    crop: {
      x: crop.cropBox.x,
      y: crop.cropBox.y,
      w: crop.cropBox.w,
      h: crop.cropBox.h,
      mode: crop.cropMode,
      aspectLocked: crop.cropAspectLocked,
    },
    filters: {
      brightness: filters.brightness,
      contrast: filters.contrast,
      grayscale: filters.grayscale,
      invert: filters.invert,
      hdSharpen: filters.hdSharpen,
      adaptThresh: filters.adaptThresh,
      shadowFix: filters.shadowFix,
      activeFilter: filters.activeFilter,
    },
    watermark: {
      text: watermark.wmText,
      opacity: watermark.wmOpacity,
    },
    ocr: {
      text: ocr.ocrText,
    },
    scanner: {
      pageCount: pages.pageCount,
    },
  }
}

export default function useScannerStore() {
  const { t, lang, user, addHistoryItem, sharedFiles, setSharedFiles, activeEditCleaner, setActiveEditCleaner } = useApp()

  const canvasRef = useRef(null)
  const [showBA, setShowBA] = useState(false)
  const [isCopied, setIsCopied] = useState(false)

  const ui = useUIState()
  const watermark = useWatermark()
  const undoRedo = useUndoRedo({ canvasRef, showToast: ui.showToast, lang })
  const filters = useFilters({ canvasRef, currentSrc: null, panel: ui.panel, showToast: ui.showToast, lang })
  const pages = usePageManager({
    setActiveFilter: filters.setActiveFilter, setBrightness: filters.setBrightness, setContrast: filters.setContrast,
    setGrayscale: filters.setGrayscale, setInvert: filters.setInvert, setAdaptThresh: filters.setAdaptThresh,
    setHdSharpen: filters.setHdSharpen, setShadowFix: filters.setShadowFix,
    setPanel: ui.setPanel, setShowBA, setActiveSection: ui.setActiveSection, setIsBusy: ui.setIsBusy,
    showToast: ui.showToast, applyPreset: filters.applyPreset, lang, t,
  })
  const beforeAfter = useBeforeAfter({ currentSrc: pages.currentSrc, showBA, setShowBA, lang })
  const crop = useCrop({
    currentSrc: pages.currentSrc, activePage: pages.activePage, pages: pages.pages, setPages: pages.setPages,
    setPanel: ui.setPanel, setShowBA, setIsBusy: ui.setIsBusy, showToast: ui.showToast, lang,
    saveSnapshot: undoRedo.saveSnapshot,
  })
  const camera = useCamera({
    setPages: pages.setPages, setActivePage: pages.setActivePage, setPanel: ui.setPanel,
    setShowBA, setActiveSection: ui.setActiveSection, applyPreset: filters.applyPreset, showToast: ui.showToast, lang,
  })
  const ocr = useOCR({ canvasRef, showToast: ui.showToast, lang, t })
  const exp = useExport({
    canvasRef, pages: pages.pages, activePage: pages.activePage,
    wmText: watermark.wmText, wmOpacity: watermark.wmOpacity,
    brightness: filters.brightness, contrast: filters.contrast, grayscale: filters.grayscale,
    invert: filters.invert, adaptThresh: filters.adaptThresh, shadowFix: filters.shadowFix,
    hdSharpen: filters.hdSharpen, activeFilter: filters.activeFilter,
    setIsBusy: ui.setIsBusy, showToast: ui.showToast,
    addHistoryItem, t, lang,
  })

  const projects = useProjects({ user, showToast: ui.showToast })

  const batch = useBatch({
    pages: pages.pages,
    setPages: pages.setPages,
    activePage: pages.activePage,
    showToast: ui.showToast,
    lang,
  })

  const currentSrc = pages.currentSrc

  // Track state changes for auto-save
  useEffect(() => {
    projects.updateState(buildSnapshot(pages, crop, filters, watermark, ocr, projects))
  }, [
    pages.pages,
    pages.activePage,
    filters.brightness,
    filters.contrast,
    filters.grayscale,
    filters.invert,
    filters.hdSharpen,
    filters.adaptThresh,
    filters.shadowFix,
    filters.activeFilter,
    crop.cropBox.x,
    crop.cropBox.y,
    crop.cropBox.w,
    crop.cropBox.h,
    watermark.wmText,
    watermark.wmOpacity,
    ocr.ocrText,
    projects.currentProjectTitle,
  ])

  // Auto-create project when pages appear and no project is active
  useEffect(() => {
    if (pages.pages.length > 0 && !projects.currentProjectId) {
      projects.createProject('Untitled', buildSnapshot(pages, crop, filters, watermark, ocr, projects))
    }
  }, [pages.pages.length])

  useEffect(() => {
    if (sharedFiles?.length) { pages.loadFiles(sharedFiles, false); setSharedFiles([]) }
  }, [sharedFiles])

  useEffect(() => {
    if (activeEditCleaner) {
      const loadProject = async () => {
        ui.setIsBusy(true)
        try {
          pages.pagesRef.current.forEach(p => { if (p.src?.startsWith('blob:')) URL.revokeObjectURL(p.src) })
          const loadedPages = await Promise.all(activeEditCleaner.pages.map(async p => {
            const blob = await dataURLtoBlob(p.base64)
            return { id: Date.now() + Math.random(), src: URL.createObjectURL(blob), name: p.name }
          }))
          pages.setPages(loadedPages); pages.setActivePage(0)
          filters.applyPreset(FILTER_PRESETS[0])
          ui.setPanel('main'); setShowBA(false); ui.setActiveSection('crop')
        } catch (err) { console.error('Error loading project from history:', err) }
        finally { ui.setIsBusy(false); setActiveEditCleaner(null) }
      }
      loadProject()
    }
  }, [activeEditCleaner])

  useEffect(() => {
    return () => {
      camera.streamRef.current?.getTracks().forEach(t => t.stop())
      pages.pagesRef.current.forEach(p => { if (p.src?.startsWith('blob:')) URL.revokeObjectURL(p.src) })
    }
  }, [])

  // ─── Batch Operations ──────────────────────────────────────────────────────

  // 1. Smart Crop + Perspective Correction (all pages)
  const batchSmartCrop = useCallback(async (scope) => {
    return batch.batchRun(scope, async (pageSrc) => {
      try {
        const result = await detectDocumentCornersFromDataUrl(pageSrc)
        if (!result?.corners || result.corners.length !== 4) return {}
        const { corners, confidence, contourArea, imageWidth, imageHeight } = result
        const minArea = imageWidth * imageHeight * 0.01
        const maxArea = imageWidth * imageHeight * 0.95
        if (confidence < 0.6 || contourArea < minArea || contourArea > maxArea) return {}
        const pc = await correctPerspective(pageSrc, corners)
        if (pc?.correctedImage) {
          const blob = await (await fetch(pc.correctedImage)).blob()
          return { newSrc: URL.createObjectURL(blob) }
        }
        return {}
      } catch {
        return {}
      }
    })
  }, [batch])

  // 2. Auto Enhance (all pages) - apply optimal brightness/contrast per page
  const batchAutoEnhance = useCallback(async (scope) => {
    return batch.batchRun(scope, async (pageSrc) => {
      try {
        const img = await loadImage(pageSrc)
        const tc = document.createElement('canvas')
        tc.width = 60
        tc.height = 60
        const ctx = tc.getContext('2d', { willReadFrequently: true })
        ctx.drawImage(img, 0, 0, 60, 60)
        const data = ctx.getImageData(0, 0, 60, 60).data
        let total = 0
        for (let i = 0; i < data.length; i += 4) total += data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
        const avg = total / (60 * 60)
        const br = Math.max(100, Math.min(300, Math.round((230 / avg) * 100)))

        const c = document.createElement('canvas')
        c.width = img.naturalWidth
        c.height = img.naturalHeight
        const cctx = c.getContext('2d')
        cctx.drawImage(img, 0, 0)
        applyColorAdjustments(cctx, c.width, c.height, br, 220, 100, false)
        applySharpen(cctx, c.width, c.height)
        const blob = await new Promise(resolve => c.toBlob(resolve, 'image/jpeg', 0.95))
        return { newSrc: URL.createObjectURL(blob) }
      } catch {
        return {}
      }
    })
  }, [batch])

  // 3. Apply current filter settings (all pages)
  const batchApplyFilters = useCallback(async (scope) => {
    const f = {
      brightness: filters.brightness,
      contrast: filters.contrast,
      grayscale: filters.grayscale,
      invert: filters.invert,
      hdSharpen: filters.hdSharpen,
      adaptThresh: filters.adaptThresh,
      shadowFix: filters.shadowFix,
    }
    return batch.batchRun(scope, async (pageSrc) => {
      try {
        const img = await loadImage(pageSrc)
        const c = document.createElement('canvas')
        c.width = img.naturalWidth
        c.height = img.naturalHeight
        const ctx = c.getContext('2d')
        ctx.drawImage(img, 0, 0)
        applyColorAdjustments(ctx, c.width, c.height, f.brightness, f.contrast, f.grayscale, f.invert)
        if (f.adaptThresh) applyAdaptive(ctx, c.width, c.height)
        if (f.shadowFix) applyShadowRemoval(ctx, c.width, c.height)
        if (f.hdSharpen) applySharpen(ctx, c.width, c.height)
        const blob = await new Promise(resolve => c.toBlob(resolve, 'image/jpeg', 0.95))
        return { newSrc: URL.createObjectURL(blob) }
      } catch {
        return {}
      }
    })
  }, [batch, filters.brightness, filters.contrast, filters.grayscale, filters.invert, filters.hdSharpen, filters.adaptThresh, filters.shadowFix])

  // 4. Apply watermark (all pages)
  const batchApplyWatermark = useCallback(async (scope) => {
    const text = watermark.wmText
    const opacity = watermark.wmOpacity
    if (!text) return true
    return batch.batchRun(scope, async (pageSrc) => {
      try {
        const img = await loadImage(pageSrc)
        const c = document.createElement('canvas')
        c.width = img.naturalWidth
        c.height = img.naturalHeight
        const ctx = c.getContext('2d')
        ctx.drawImage(img, 0, 0)
        ctx.save()
        ctx.translate(c.width / 2, c.height / 2)
        ctx.rotate(-Math.PI / 4)
        ctx.fillStyle = `rgba(0,0,0,${opacity / 100})`
        const fs = Math.max(20, c.width / 8)
        ctx.font = `bold ${fs}px Cairo,sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        for (let i = -2; i <= 2; i++) {
          for (let j = -2; j <= 2; j++) {
            ctx.fillText(text, i * c.width * 0.45, j * c.height * 0.4)
          }
        }
        ctx.restore()
        const blob = await new Promise(resolve => c.toBlob(resolve, 'image/jpeg', 0.95))
        return { newSrc: URL.createObjectURL(blob) }
      } catch {
        return {}
      }
    })
  }, [batch, watermark.wmText, watermark.wmOpacity])

  // 5. OCR (all pages)
  const batchOCR = useCallback(async (scope) => {
    return batch.batchRun(scope, async (pageSrc) => {
      try {
        const c = document.createElement('canvas')
        const img = await loadImage(pageSrc)
        c.width = img.naturalWidth
        c.height = img.naturalHeight
        c.getContext('2d').drawImage(img, 0, 0)
        const dataUrl = c.toDataURL('image/jpeg', 0.85)
        const text = await ocr.recognizeImage(dataUrl)
        return { text: text?.trim() || '' }
      } catch {
        return { text: '' }
      }
    }, (result, pageIndex) => {
      if (result?.text !== undefined) {
        if (pageIndex === pages.activePage) {
          ocr.setOcrText(result.text || t('noText'))
        }
      }
    })
  }, [batch, ocr, pages.activePage, t])

  return {
    ...undoRedo, ...beforeAfter, ...watermark, ...ui, ...filters, ...crop, ...pages, ...camera, ...ocr, ...exp,
    ...projects,
    ...batch,
    batchSmartCrop,
    batchAutoEnhance,
    batchApplyFilters,
    batchApplyWatermark,
    batchOCR,
    showCamera: camera.cameraOpen, setShowCamera: camera.setCameraOpen,
    canvasRef, currentSrc,
    isCopied, setIsCopied,
    t, lang,
  }
}
