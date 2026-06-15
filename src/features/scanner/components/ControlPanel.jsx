import {
  Upload, Image as ImageIcon, FileText, Wand2, Filter,
  Scissors, RotateCw, Sliders, Stamp, ScanText, Plus,
  Sun, Contrast, Palette, X, Check, Copy, Loader2,
  Camera, Share2
} from 'lucide-react'
import { FILTER_PRESETS } from '../../../constants'
import AccordionSection from './AccordionSection'
import FilterThumb from './FilterThumb'
import OptimizedSlider from './OptimizedSlider'
import { motion } from 'framer-motion'

const ControlPanel = ({ store }) => {
  const {
    pages, activePage, activeSection, setActiveSection, currentSrc,
    canvasRef, fileRef, addPageRef,
    brightness, setBrightness, contrast, setContrast,
    grayscale, setGrayscale, invert, setInvert,
    hdSharpen, setHdSharpen, adaptThresh, setAdaptThresh,
    shadowFix, setShadowFix, activeFilter,
    panel, setPanel, isBusy, showBA, setShowBA,
    cropBox, setCropBox, forceA4, setForceA4,
    ocrText, ocrProg, isOcr, isCopied, setIsCopied,
    wmText, setWmText, wmOpacity, setWmOpacity,
    getCurrentFilters, getPagesForHistory,

    onUpload, openCamera,
    applyPreset, autoEnhance, applySmartScanAll,
    detectSmartCrop, rotateImage90, flipImageH,
    executeCrop, onCropMove,
    saveImage, shareFile, savePDF, runOCR,
    setOcrText,

    lang, t,
  } = store

  const handleAccordionToggle = (id, active) => {
    if (!currentSrc && id !== 'upload') return

    // Open or close the active section as an overlay (no layout shifts)
    setActiveSection(active ? '' : id)
    if (!active) {
      // Prepare panel state for certain tools
      if (id === 'crop') {
        setPanel('crop')
        setCropBox({ x: 10, y: 10, w: 80, h: 80 })
        setShowBA(false)
      } else {
        setPanel('main')
      }
    }
  }

  const sectionCards = [
    {
      id: 'upload',
      label: lang === 'ar' ? 'الملفات' : 'Pages',
      icon: ImageIcon,
    },
    {
      id: 'crop',
      label: lang === 'ar' ? 'قص' : 'Crop',
      icon: Scissors,
    },
    {
      id: 'adjust',
      label: lang === 'ar' ? 'تحسين' : 'Enhance',
      icon: Sliders,
    },
    {
      id: 'filters',
      label: lang === 'ar' ? 'فلاتر' : 'Filters',
      icon: Filter,
    },
    {
      id: 'watermark',
      label: lang === 'ar' ? 'OCR' : 'OCR',
      icon: Stamp,
    },
  ]

  const visibleSection = currentSrc ? activeSection : 'upload'

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="sticky top-0 z-20 px-1 py-1">
        <motion.div data-toolbar="true" initial={{ y: -4, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.15 }} className="glass-panel px-2 py-1.5 backdrop-blur-lg">
          <div className="flex items-center gap-1.5">
            {sectionCards.map(({ id, label, icon: Icon }) => {
              const active = visibleSection === id
              const disabled = !currentSrc && id !== 'upload'
              return (
                <button key={id}
                  type="button"
                  onClick={() => handleAccordionToggle(id, active)}
                  disabled={disabled}
                  aria-pressed={active}
                  aria-label={label}
                  className={`flex-shrink-0 w-11 h-11 rounded-lg border transition-all duration-150 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-indigo-400 ${active ? 'bg-white/12 border-white/20 text-white shadow-glow' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'} ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  <Icon size={18} />
                </button>
              )
            })}
          </div>
        </motion.div>
      </div>
      <div className="flex-1 overflow-y-auto py-2 px-3 hidden md:block">
        {/* Mobile: hidden; overlays handle all interactions. Desktop: shows inline actions */}
        <div className="space-y-2">
          <div className="glass-panel p-2 rounded-lg">
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => fileRef.current.click()}
                className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-2 font-bold text-xs text-emerald-400 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400">
                <Upload size={14} />{lang === 'ar' ? 'رفع مستند' : 'Upload'}
              </button>
              <button onClick={openCamera}
                className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-2 font-bold text-xs text-indigo-400 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400">
                <Camera size={14} />{lang === 'ar' ? 'كاميرا' : 'Camera'}
              </button>
            </div>
          </div>
        </div>
      </div>
      <input ref={fileRef} type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={onUpload} />
      <input ref={addPageRef} type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={e => onUpload(e, true)} />
    </div>
  )
}

export default ControlPanel
