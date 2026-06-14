import { useState, useRef, useEffect } from 'react'
import { useApp } from '../../../context/AppContext'
import { FILTER_PRESETS } from '../../../constants'
import { dataURLtoBlob } from '../utils/imageUtils'
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

export default function useScannerStore() {
  const { t, lang, addHistoryItem, sharedFiles, setSharedFiles, activeEditCleaner, setActiveEditCleaner } = useApp()

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

  const currentSrc = pages.currentSrc

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

  return {
    ...undoRedo, ...beforeAfter, ...watermark, ...ui, ...filters, ...crop, ...pages, ...camera, ...ocr, ...exp,
    showCamera: camera.cameraOpen, setShowCamera: camera.setCameraOpen,
    canvasRef, currentSrc,
    isCopied, setIsCopied,
    t, lang,
  }
}