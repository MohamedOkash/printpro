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
    setActiveSection(active ? '' : id)
    if (id === 'crop' && !active) {
      setPanel('crop')
      setCropBox({ x: 10, y: 10, w: 80, h: 80 })
      setShowBA(false)
    } else {
      setPanel('main')
    }
  }

  return (
    <div className="flex-1 md:flex-none h-full bg-[#131317] border-t md:border-t-0 md:border-l border-white/5 flex flex-col md:w-80 lg:w-96 rounded-t-3xl md:rounded-none shadow-2xl z-10 overflow-hidden">
      <div className="flex-1 sc overflow-y-auto">

        {/* Section 1: Files & Pages */}
        <AccordionSection id="upload" label={lang === 'ar' ? 'الملفات والصفحات' : 'Files & Pages'}
          icon={ImageIcon} color="emerald"
          activeSection={activeSection} onToggle={handleAccordionToggle} currentSrc={currentSrc}>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => fileRef.current.click()}
              className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-3 font-bold text-xs text-emerald-400 transition-colors">
              <Upload size={14} />{lang === 'ar' ? 'رفع مستند' : 'Upload Doc'}
            </button>
            <button onClick={openCamera}
              className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-3 font-bold text-xs text-indigo-400 transition-colors">
              <Camera size={14} />{lang === 'ar' ? 'كاميرا' : 'Camera'}
            </button>
          </div>
          {pages.length > 0 && (
            <div className="pt-2 border-t border-white/5 space-y-2">
              <p className="text-[10px] text-slate-500 font-bold">{lang === 'ar' ? 'إدارة مستند متعدد الصفحات' : 'Manage Pages'}</p>
              <div className="flex items-center justify-between bg-white/5 border border-white/5 rounded-xl px-3 py-2">
                <span className="text-xs font-bold text-slate-300">{pages.length} {lang === 'ar' ? 'صفحة' : 'page(s)'}</span>
                <button onClick={() => addPageRef.current.click()}
                  className="flex items-center gap-1 text-[10px] font-black text-indigo-400 hover:underline">
                  <Plus size={11} />{lang === 'ar' ? 'إضافة صفحة' : 'Add Page'}
                </button>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={saveImage} disabled={isBusy}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 text-xs transition-colors">
                  {isBusy ? <Loader2 size={12} className="animate-spin" /> : <ImageIcon size={12} />}
                  {lang === 'ar' ? 'حفظ كصورة' : 'Save Image'}
                </button>
                {navigator.share && (
                  <button onClick={() => {
                    if (!canvasRef.current) return
                    canvasRef.current.toBlob(blob => { shareFile(blob, 'PrintPro_doc.jpg') }, 'image/jpeg', 1.0)
                  }}
                    className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 text-xs transition-colors">
                    <Share2 size={12} />{lang === 'ar' ? 'مشاركة' : 'Share'}
                  </button>
                )}
                <button onClick={savePDF} disabled={isBusy}
                  className="flex-1 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 text-xs transition-colors">
                  {isBusy ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
                  {lang === 'ar' ? 'حفظ كـ PDF' : 'Save PDF'}
                </button>
              </div>
            </div>
          )}
        </AccordionSection>

        {/* Section 2: Crop & Rotate */}
        <AccordionSection id="crop" label={lang === 'ar' ? 'قص وتدوير الصفحة' : 'Crop & Rotate'}
          icon={Scissors} color="indigo"
          activeSection={activeSection} onToggle={handleAccordionToggle} currentSrc={currentSrc}>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <button onClick={detectSmartCrop}
                className="py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black rounded-xl flex items-center justify-center gap-1 transition-colors">
                <Wand2 size={12} />{lang === 'ar' ? 'القص الذكي' : 'Smart Crop'}
              </button>
              <button onClick={rotateImage90}
                className="py-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-[10px] font-bold text-slate-300 flex items-center justify-center gap-1 transition-colors">
                <RotateCw size={12} />{lang === 'ar' ? 'تدوير 90°' : 'Rotate 90°'}
              </button>
              <button onClick={flipImageH}
                className="py-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-[10px] font-bold text-slate-300 flex items-center justify-center gap-1 transition-colors">
                <Sliders size={12} />{lang === 'ar' ? 'عكس أفقي' : 'Mirror H'}
              </button>
            </div>
            {panel === 'crop' ? (
              <div className="bg-emerald-950/20 border border-emerald-800/30 rounded-xl p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-emerald-400 font-bold">{lang === 'ar' ? 'لوحة التحكم بالقص الجاري' : 'Manual Cropping'}</span>
                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 cursor-pointer">
                    <input type="checkbox" checked={forceA4} onChange={e => setForceA4(e.target.checked)} className="accent-emerald-500 w-3.5 h-3.5" />
                    {t('forceA4')}
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setPanel('main')}
                    className="py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold text-slate-400 transition-colors">{t('cancel')}</button>
                  <button onClick={executeCrop}
                    className="py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-bold text-white transition-colors">{t('confirmCrop')}</button>
                </div>
              </div>
            ) : (
              <button onClick={() => { setPanel('crop'); setCropBox({ x: 10, y: 10, w: 80, h: 80 }); setShowBA(false); }}
                className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-dashed border-white/10 text-xs font-bold text-slate-300 rounded-xl transition-colors">
                {lang === 'ar' ? 'تعديل حواف القص يدوياً' : 'Crop Borders Manually'}
              </button>
            )}
          </div>
        </AccordionSection>

        {/* Section 3: Enhance & Adjust */}
        <AccordionSection id="adjust" label={lang === 'ar' ? 'تعديل وتحسين المستند' : 'Enhance & Adjust'}
          icon={Sliders} color="amber"
          activeSection={activeSection} onToggle={handleAccordionToggle} currentSrc={currentSrc}>
          <div className="space-y-4">
            <button onClick={autoEnhance}
              className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-lg shadow-amber-500/10">
              <Wand2 size={13} />{t('autoEnhance')}
            </button>
            <button onClick={applySmartScanAll}
              className="w-full py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-lg mt-2">
              <ScanText size={13} />{lang === 'ar' ? 'مسح ضوئي ذكي لكامل المستند' : 'Smart Scan All Pages'}
            </button>
            <div className="space-y-2 border-t border-white/5 pt-3">
              <OptimizedSlider icon={Sun} label={t('brightness')} val={brightness} setVal={setBrightness}
                min={50} max={300} c="text-amber-400" type="brightness"
                canvasRef={canvasRef} currentFilters={getCurrentFilters} />
              <OptimizedSlider icon={Contrast} label={t('contrast')} val={contrast} setVal={setContrast}
                min={50} max={400} c="text-indigo-400" type="contrast"
                canvasRef={canvasRef} currentFilters={getCurrentFilters} />
              <OptimizedSlider icon={Palette} label={t('grayscale')} val={grayscale} setVal={setGrayscale}
                min={0} max={100} c="text-slate-400" type="grayscale"
                canvasRef={canvasRef} currentFilters={getCurrentFilters} />
            </div>
            <div className="space-y-2 pt-2 border-t border-white/5">
              {[
                { label: lang === 'ar' ? 'عكس الألوان (سالب)' : 'Invert Colors (Negative)', val: invert, set: setInvert },
                { label: lang === 'ar' ? 'HD Sharpen للطباعة' : 'HD Sharpen (Printing)', val: hdSharpen, set: setHdSharpen },
                { label: lang === 'ar' ? 'تبييض تكيّفي (CamScanner)' : 'Adaptive White (CamScanner)', val: adaptThresh, set: setAdaptThresh },
                { label: lang === 'ar' ? 'إزالة الظلال والإضاءة غير المتكافئة' : 'Remove Shadows & Glow', val: shadowFix, set: setShadowFix },
              ].map(({ label, val, set }) => (
                <label key={label} className="flex items-center gap-2.5 bg-white/5 border border-white/5 rounded-xl px-3 py-2 cursor-pointer hover:bg-white/10 transition-colors">
                  <input type="checkbox" checked={val} onChange={e => set(e.target.checked)} className="w-3.5 h-3.5 accent-indigo-500" />
                  <span className="text-[11px] font-bold text-slate-300">{label}</span>
                </label>
              ))}
            </div>
          </div>
        </AccordionSection>

        {/* Section 4: Filters & Compare */}
        <AccordionSection id="filters" label={lang === 'ar' ? 'الفلاتر الاحترافية والمقارنة' : 'Filters & Comparison'}
          icon={Filter} color="violet"
          activeSection={activeSection} onToggle={handleAccordionToggle} currentSrc={currentSrc}>
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs font-bold text-violet-400">
              <span>{lang === 'ar' ? 'اختر فلتر سريع لمعالجة الورقة' : 'Select Scan Filter'}</span>
              {activeFilter !== 'raw' && <span className="bg-violet-500/20 px-2.5 py-0.5 rounded-full text-[10px]">{t('filters')}: {activeFilter}</span>}
            </div>
            <div className="flex gap-2.5 nx pb-2">
              {FILTER_PRESETS.map(p => (
                <FilterThumb key={p.id} preset={p} currentSrc={currentSrc} activeFilter={activeFilter}
                  onSelect={applyPreset} lang={lang} />
              ))}
            </div>
            <div className="pt-3 border-t border-white/5">
              <button onClick={() => setShowBA(b => !b)}
                className={`w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-xs font-bold transition-all ${showBA ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300' : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'}`}>
                <ImageIcon size={14} />{showBA ? (lang === 'ar' ? 'إخفاء المقارنة' : 'Hide Compare') : (lang === 'ar' ? 'تفعيل المقارنة (قبل / بعد)' : 'Show Before / After')}
              </button>
            </div>
          </div>
        </AccordionSection>

        {/* Section 5: Watermark & OCR */}
        <AccordionSection id="watermark" label={lang === 'ar' ? 'النصوص والنسخ والعلامة المائية' : 'Watermark & OCR'}
          icon={Stamp} color="pink"
          activeSection={activeSection} onToggle={handleAccordionToggle} currentSrc={currentSrc}>
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-teal-400 flex items-center gap-1">
                <ScanText size={12} />{lang === 'ar' ? 'استخراج النصوص الذكي (OCR)' : 'OCR Text Extractor'}
              </p>
              {isOcr ? (
                <div className="bg-black/40 border border-white/5 rounded-xl p-3 flex flex-col items-center gap-2 text-center text-xs">
                  <Loader2 size={20} className="text-teal-400 animate-spin" />
                  <p className="text-slate-400 font-bold">{lang === 'ar' ? 'جاري استخراج النص...' : 'Extracting text...'} ({ocrProg}%)</p>
                </div>
              ) : ocrText ? (
                <div className="space-y-2">
                  <div className="relative bg-black/60 border border-white/5 rounded-xl p-3">
                    <textarea value={ocrText} onChange={e => setOcrText(e.target.value)} dir="auto"
                      className="w-full bg-transparent text-slate-200 text-xs leading-relaxed outline-none resize-none font-medium h-24" />
                  </div>
                  <button onClick={() => { navigator.clipboard.writeText(ocrText).then(() => { setIsCopied(true); setTimeout(() => setIsCopied(false), 2000) }) }}
                    className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1 transition-all">
                    {isCopied ? <Check size={12} /> : <Copy size={12} />}
                    {isCopied ? t('copied') : t('copy')}
                  </button>
                </div>
              ) : (
                <button onClick={runOCR}
                  className="w-full py-2.5 bg-teal-600/10 hover:bg-teal-600/20 border border-teal-500/20 text-teal-400 text-xs font-bold rounded-xl transition-colors">
                  {lang === 'ar' ? 'بدء التعرف على النصوص واستخراجها' : 'Start OCR Text Scan'}
                </button>
              )}
            </div>
            <div className="pt-3 border-t border-white/5 space-y-2.5">
              <p className="text-[11px] font-bold text-pink-400 flex items-center gap-1"><Stamp size={12} />{t('watermark')}</p>
              <input type="text" value={wmText} onChange={e => setWmText(e.target.value)}
                placeholder={lang === 'ar' ? 'مثال: مكتبة الحرمين، الأستاذ...' : 'e.g. My Shop Name...'}
                className="w-full bg-black border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs font-bold outline-none focus:border-pink-500 transition-colors" />
              {wmText && (
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-slate-500 font-bold whitespace-nowrap">{t('opacity')}</span>
                  <input type="range" min={5} max={100} value={wmOpacity} onChange={e => setWmOpacity(Number(e.target.value))}
                    className="flex-1 h-1.5 accent-pink-500 cursor-pointer" />
                  <span className="text-xs text-pink-400 font-bold w-8 text-center">{wmOpacity}%</span>
                </div>
              )}
            </div>
          </div>
        </AccordionSection>

      </div>
      <input ref={fileRef} type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={onUpload} />
      <input ref={addPageRef} type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={e => onUpload(e, true)} />
    </div>
  )
}

export default ControlPanel
