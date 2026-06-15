import { FILTER_PRESETS } from '../../../constants'
import { Upload, Undo2, Redo2, X, CheckCircle2, Loader2 } from 'lucide-react'

const ScannerPreview = ({ store }) => {
  const {
    currentSrc, canvasRef, origCanvasRef, cropContRef, cropImgRef, baContRef,
    videoRef, fileRef,
    pages, activePage, setActivePage, applyPreset,
    handleUndo, handleRedo, undoStackRef, redoStackRef,
    showCamera, capturePhoto, closeCamera,
    toast, panel, cropBox, setCropHandle, showBA, baSplit,
    setIsDraggingBA, wmText, wmOpacity, setShowBA,
    onUpload, lang, t,
  } = store

  return (
    <div className="flex-1 min-h-0 bg-[#0a0a0d] flex flex-col items-center justify-center overflow-hidden relative p-3 md:p-6 touch-none">
      {currentSrc && (
        <div className="absolute top-3 left-3 flex gap-1.5 z-20">
          <button onClick={handleUndo} disabled={!undoStackRef.current.length}
            className="w-8 h-8 bg-black/60 hover:bg-black/80 disabled:opacity-30 rounded-lg flex items-center justify-center transition-all"
            title={lang === 'ar' ? 'تراجع' : 'Undo'}>
            <Undo2 size={14} className="text-white" />
          </button>
          <button onClick={handleRedo} disabled={!redoStackRef.current.length}
            className="w-8 h-8 bg-black/60 hover:bg-black/80 disabled:opacity-30 rounded-lg flex items-center justify-center transition-all"
            title={lang === 'ar' ? 'إعادة' : 'Redo'}>
            <Redo2 size={14} className="text-white" />
          </button>
        </div>
      )}

      {showCamera && (
        <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center gap-5">
          <video ref={videoRef} autoPlay playsInline className="w-full max-h-[70vh] object-contain" />
          <div className="flex gap-4">
            <button onClick={capturePhoto}
              className="w-16 h-16 rounded-full bg-white border-4 border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,.5)] active:scale-90 transition-transform" />
            <button onClick={closeCamera}
              className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center">
              <X size={16} className="text-white" />
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-full shadow-xl fu flex items-center gap-2">
          <CheckCircle2 size={14} />{toast}
        </div>
      )}

      {!currentSrc ? (
        <label className="flex flex-col items-center justify-center w-full h-full min-h-[45vh] max-w-sm border-2 border-dashed border-white/10 rounded-3xl p-8 cursor-pointer hover:bg-white/[.02] transition-colors group">
          <input ref={fileRef} type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={onUpload} />
          <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mb-4 group-hover:bg-indigo-500/10 transition-colors">
            <Upload size={18} className="text-slate-500 group-hover:text-indigo-400 transition-colors" />
          </div>
          <p className="text-slate-400 font-bold text-sm text-center">{t('dropHere')}</p>
          <p className="text-slate-600 text-[10px] mt-2">{t('supportedFormats')}</p>
        </label>
      ) : (
        <>
          {panel === 'crop' ? (
            <div ref={cropContRef} className="relative w-full h-full flex items-center justify-center" style={{ touchAction: 'none' }}>
              <img ref={cropImgRef} src={currentSrc} alt="crop" className="w-full h-full max-h-full object-contain block pointer-events-none" draggable={false} />
              {[
                { style: { top: 0, left: 0, right: 0, height: `${cropBox.y}%` } },
                { style: { bottom: 0, left: 0, right: 0, height: `${100 - cropBox.y - cropBox.h}%` } },
                { style: { top: `${cropBox.y}%`, left: 0, width: `${cropBox.x}%`, height: `${cropBox.h}%` } },
                { style: { top: `${cropBox.y}%`, right: 0, width: `${100 - cropBox.x - cropBox.w}%`, height: `${cropBox.h}%` } },
              ].map((d, i) => <div key={i} className="absolute bg-black/60 pointer-events-none" style={d.style} />)}
              <div className="absolute border-2 border-emerald-400"
                style={{ left: `${cropBox.x}%`, top: `${cropBox.y}%`, width: `${cropBox.w}%`, height: `${cropBox.h}%` }}>
                {[['nw', '-top-3 -left-3'], ['ne', '-top-3 -right-3'], ['sw', '-bottom-3 -left-3'], ['se', '-bottom-3 -right-3'],
                  ['n', '-top-3 left-[calc(50%-12px)]'], ['s', '-bottom-3 left-[calc(50%-12px)]'],
                  ['w', 'top-[calc(50%-12px)] -left-3'], ['e', 'top-[calc(50%-12px)] -right-3'],
                ].map(([h, cls]) => (
                  <div key={h} className={`absolute ${cls} w-6 h-6 flex items-center justify-center z-20 cursor-pointer`}
                    style={{ touchAction: 'none' }}
                    onPointerDown={e => { e.preventDefault(); e.stopPropagation(); setCropHandle(h) }}>
                    <div className={`w-3.5 h-3.5 bg-white border-2 border-emerald-500 shadow-md ${h.length === 1 ? 'rounded' : 'rounded-full'}`} />
                  </div>
                ))}
              </div>
            </div>
          ) : showBA ? (
            <div ref={baContRef} className="relative w-full h-full select-none cursor-ew-resize flex items-center justify-center"
              style={{ touchAction: 'none' }}
              onPointerDown={e => { e.preventDefault(); e.stopPropagation(); setIsDraggingBA(true) }}>
              <canvas ref={canvasRef} className="block w-full h-full rounded-xl shadow-2xl object-contain" style={{}} />
              <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none" style={{ clipPath: `inset(0 ${100 - baSplit}% 0 0)` }}>
                <canvas ref={origCanvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
                <div className="absolute top-2 left-2 bg-black/70 text-white text-[10px] font-bold px-2 py-1 rounded-md">{lang === 'ar' ? 'قبل' : 'Before'}</div>
              </div>
              <div className="absolute top-0 bottom-0 z-20 pointer-events-none" style={{ left: `${baSplit}%` }}>
                <div className="w-0.5 h-full bg-white shadow-[0_0_8px_rgba(255,255,255,.8)]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-xl flex items-center justify-center text-slate-800 font-black text-xs">⟺</div>
              </div>
              <div className="absolute top-2 right-2 bg-black/70 text-white text-[10px] font-bold px-2 py-1 rounded-md pointer-events-none">{lang === 'ar' ? 'بعد' : 'After'}</div>
            </div>
          ) : (
            <div className="relative w-full h-full flex items-center justify-center">
              <canvas ref={canvasRef} className="w-full h-full object-contain block rounded-xl shadow-2xl" style={{}} />
              {wmText && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden rounded-xl" style={{ opacity: wmOpacity / 100 }}>
                  <div className="text-black font-black text-2xl md:text-5xl -rotate-45 opacity-60 whitespace-nowrap">{wmText}</div>
                </div>
              )}
            </div>
          )}

          {pages.length > 1 && (
            <div className="flex flex-wrap justify-center gap-2 mt-3 max-w-full pb-1">
              {pages.map((p, i) => (
                <button key={p.id} onClick={() => { setActivePage(i); setShowBA(false); }}
                  className={`w-11 h-14 rounded-lg overflow-hidden border-2 transition-all ${i === activePage ? 'border-indigo-500 shadow-[0_0_8px_rgba(99,102,241,.4)]' : 'border-white/10'}`}>
                  <img src={p.src} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default ScannerPreview
