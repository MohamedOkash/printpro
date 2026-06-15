import React from 'react'
import useScannerStore from '../features/scanner/hooks/useScannerStore'
import ScannerPreview from '../features/scanner/components/ScannerPreview'
import ControlPanel from '../features/scanner/components/ControlPanel'
import { motion, AnimatePresence } from 'framer-motion'

export default function DocumentCleaner() {
  const store = useScannerStore()
  const { activeSection, setActiveSection } = store

  const overlayVariants = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 30 },
  }

  return (
    <div className="h-full flex flex-col md:flex-row md:items-stretch gap-4 md:p-3 relative pb-12 md:pb-0 pb-[calc(env(safe-area-inset-bottom)+12px)] md:pb-0">
      {/* Toolbar (Mobile top) */}
      <div className="md:hidden flex-shrink-0 bg-[rgba(13,14,16,0.5)]">
        <ControlPanel store={store} />
      </div>

      {/* Preview (Primary) - fills available space on mobile */}
      <div className="flex-1 min-h-0 relative">
        <div id="doc-preview" className="h-full w-full md:glass-card md:rounded-[20px] overflow-hidden relative">
          <ScannerPreview store={store} />
        </div>

        {/* Overlay Panels (do not shift layout) - positioned relative to preview area */}
        <AnimatePresence>
          {activeSection && activeSection !== 'upload' && (
            <motion.div
              data-overlay="true"
              key="tool-overlay"
              initial="hidden"
              animate="show"
              exit="exit"
              variants={overlayVariants}
              transition={{ duration: 0.18 }}
              className="fixed md:absolute inset-0 z-40 flex items-end md:items-center md:justify-end md:pr-2 lg:pr-4"
              onClick={() => setActiveSection('')}
            >
              <motion.div
                className="w-full md:w-[44%] lg:w-[38%] bg-[rgba(12,14,20,0.72)] border border-white/6 backdrop-blur-lg rounded-t-[18px] md:rounded-l-[18px] md:rounded-tr-none p-4 shadow-glow"
                onClick={e => e.stopPropagation()}
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 30, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 28, duration: 0.18 }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-slate-100 font-bold text-sm">{activeSection.toUpperCase()}</h3>
                  <button onClick={() => setActiveSection('')} className="p-2 rounded-lg bg-white/6 hover:bg-white/8 focus:outline-none focus:ring-2 focus:ring-indigo-400">
                    ✕
                  </button>
                </div>

                <div className="space-y-3 overflow-auto" style={{ maxHeight: '70vh' }}>
                  {activeSection === 'crop' && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-2">
                        <button onClick={() => store.detectSmartCrop()}
                          className="py-2 bg-indigo-600 text-white rounded-lg text-sm">{store.t ? store.t('autoCrop') : 'Smart Crop'}</button>
                        <button onClick={() => store.rotateImage90()}
                          className="py-2 bg-white/5 text-slate-300 rounded-lg">Rotate 90°</button>
                        <button onClick={() => store.flipImageH()}
                          className="py-2 bg-white/5 text-slate-300 rounded-lg">Mirror</button>
                      </div>
                      {store.panel === 'crop' ? (
                        <div className="bg-black/30 border border-white/6 rounded-lg p-3">
                          <div className="flex items-center justify-between"><span className="text-xs font-bold text-emerald-400">Manual Cropping</span></div>
                          <div className="grid grid-cols-2 gap-2 mt-3">
                            <button onClick={() => store.setPanel('main')} className="py-2 bg-white/5 rounded-lg">Cancel</button>
                            <button onClick={() => store.executeCrop()} className="py-2 bg-emerald-600 text-white rounded-lg">Apply</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => { store.setPanel('crop'); store.setCropBox({ x: 10, y: 10, w: 80, h: 80 }); store.setShowBA(false); }} className="w-full py-2 bg-white/5 rounded-lg">Enter Crop Mode</button>
                      )}
                    </div>
                  )}

                  {activeSection === 'adjust' && (
                    <div className="space-y-3">
                      <button onClick={() => store.autoEnhance()} className="w-full py-2 bg-amber-500 text-white rounded-lg">Auto Enhance</button>
                      <button onClick={() => store.applySmartScanAll()} className="w-full py-2 bg-teal-500 text-white rounded-lg">Smart Scan All</button>
                      <div className="space-y-2 pt-2">
                        <div className="text-xs text-slate-300 font-bold">Brightness</div>
                        <input type="range" min={50} max={300} value={store.brightness} onChange={e => store.setBrightness(Number(e.target.value))} className="w-full" />
                        <div className="text-xs text-slate-300 font-bold">Contrast</div>
                        <input type="range" min={50} max={400} value={store.contrast} onChange={e => store.setContrast(Number(e.target.value))} className="w-full" />
                      </div>
                    </div>
                  )}

                  {activeSection === 'filters' && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-2">
                        {FILTER_PRESETS.map(p => (
                          <button key={p.id} onClick={() => store.applyPreset(p.id)} className="py-2 bg-white/5 rounded-lg text-xs font-bold">{p.label}</button>
                        ))}
                      </div>
                      <button onClick={() => store.setShowBA(b => !b)} className="w-full py-2 bg-white/5 rounded-lg">Toggle Compare</button>
                    </div>
                  )}

                  {activeSection === 'watermark' && (
                    <div className="space-y-3">
                      {store.isOcr ? (
                        <div className="p-3 bg-black/30 rounded-lg text-center">Extracting... {store.ocrProg}%</div>
                      ) : store.ocrText ? (
                        <div>
                          <textarea value={store.ocrText} onChange={e => store.setOcrText(e.target.value)} className="w-full h-28 bg-transparent text-slate-200 rounded-lg p-2" />
                          <button onClick={() => { navigator.clipboard.writeText(store.ocrText || ''); store.setIsCopied(true); setTimeout(() => store.setIsCopied(false), 1500) }} className="mt-2 py-2 bg-teal-600 text-white rounded-lg">Copy</button>
                        </div>
                      ) : (
                        <button onClick={() => store.runOCR()} className="w-full py-2 bg-teal-500 text-white rounded-lg">Start OCR</button>
                      )}
                    </div>
                  )}

                  {activeSection === 'export' && (
                    <div className="space-y-3">
                      <button onClick={() => store.saveImage()} className="w-full py-2 bg-emerald-600 text-white rounded-lg">Save Image</button>
                      <button onClick={() => store.savePDF()} className="w-full py-2 bg-rose-600 text-white rounded-lg">Save PDF</button>
                      {navigator.share && <button onClick={() => { if (!store.canvasRef.current) return; store.canvasRef.current.toBlob(blob => { store.shareFile(blob, 'PrintPro_doc.jpg') }, 'image/jpeg', 1.0) }} className="w-full py-2 bg-white/5 rounded-lg">Share</button>}
                    </div>
                  )}

                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Tools (Secondary - hidden on mobile) */}
      <div className="hidden md:block md:w-[30%] md:flex-shrink-0">
        <div className="md:sticky md:top-6 glass-panel p-3 rounded-[20px] h-auto md:h-[calc(100vh-48px)] overflow-auto">
          <ControlPanel store={store} />
        </div>
      </div>
    </div>
  )
}
