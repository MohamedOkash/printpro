import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Upload, Image as ImageIcon, FileText, Wand2, Filter,
  Scissors, RotateCw, Sliders, Stamp, ScanText, Plus,
  Sun, Contrast, Palette, X, Check, Copy, Loader2,
  Camera, CheckCircle2,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { FILTER_PRESETS } from '../constants'
import { applySharpen, applyAdaptive, applyShadowRemoval, getAverageBrightness } from '../utils/imageProcessing'
import { loadScript, CDN } from '../utils/scriptLoader'

export default function DocumentCleaner() {
  const { addHistoryItem } = useApp()
  const [pages, setPages]             = useState([]);
  const [activePage, setActivePage]   = useState(0);
  const [brightness, setBrightness]   = useState(100);
  const [contrast,   setContrast]     = useState(100);
  const [grayscale,  setGrayscale]    = useState(0);
  const [invert,     setInvert]       = useState(false);
  const [rotation,   setRotation]     = useState(0);
  const [hdSharpen,  setHdSharpen]    = useState(false);
  const [adaptThresh,setAdaptThresh]  = useState(false);
  const [shadowFix,  setShadowFix]    = useState(false);
  const [activeFilter, setActiveFilter] = useState('raw');
  const [panel, setPanel]             = useState('main');
  const [isBusy, setIsBusy]           = useState(false);
  const [toast, setToast]             = useState('');
  const [showBA, setShowBA]           = useState(false);
  const [baSplit, setBaSplit]         = useState(50);
  const [isDraggingBA, setIsDraggingBA] = useState(false);
  const [wmText, setWmText]           = useState('');
  const [wmOpacity, setWmOpacity]     = useState(30);
  const [cropBox, setCropBox]         = useState({x:10,y:10,w:80,h:80});
  const [cropHandle, setCropHandle]   = useState(null);
  const [forceA4, setForceA4]         = useState(false);
  const [ocrText, setOcrText]         = useState('');
  const [ocrProg, setOcrProg]         = useState(0);
  const [isOcr,   setIsOcr]           = useState(false);
  const [isCopied, setIsCopied]       = useState(false);
  const [showCamera, setShowCamera]   = useState(false);

  const canvasRef      = useRef(null);
  const origCanvasRef  = useRef(null);
  const cropImgRef     = useRef(null);
  const cropContRef    = useRef(null);
  const baContRef      = useRef(null);
  const fileRef        = useRef(null);
  const addPageRef     = useRef(null);
  const videoRef       = useRef(null);
  const streamRef      = useRef(null);

  const currentSrc = pages[activePage]?.src || null;

  const showToast = msg => { setToast(msg); setTimeout(()=>setToast(''),2500); };

  // ── Apply filter preset ───────────────────────────────────────────────────
  const applyPreset = preset => {
    setActiveFilter(preset.id);
    setBrightness(preset.br); setContrast(preset.ct); setGrayscale(preset.gs);
    setInvert(preset.inv); setAdaptThresh(preset.adapt);
    setHdSharpen(preset.sharp); setShadowFix(preset.shadow);
  };

  // ── Render canvas ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentSrc || panel==='crop') return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d', {willReadFrequently:true});
    const img = new Image();
    img.onload = () => {
      const MAX=2200; let w=img.naturalWidth, h=img.naturalHeight;
      if (rotation%180!==0) [w,h]=[h,w];
      if (w>MAX){const r=MAX/w;w=MAX;h=Math.round(h*r);}
      canvas.width=w; canvas.height=h;
      ctx.save(); ctx.translate(w/2,h/2); ctx.rotate(rotation*Math.PI/180);
      ctx.filter=`invert(${invert?100:0}%) brightness(${brightness}%) contrast(${contrast}%) grayscale(${grayscale}%)`;
      if(rotation%180!==0) ctx.drawImage(img,-h/2,-w/2,h,w);
      else ctx.drawImage(img,-w/2,-h/2,w,h);
      ctx.filter='none'; ctx.restore();
      if (adaptThresh) applyAdaptive(ctx,w,h);
      if (shadowFix) applyShadowRemoval(ctx,w,h);
      if (hdSharpen) applySharpen(ctx,w,h);
    };
    img.src = currentSrc;
  }, [currentSrc,brightness,contrast,grayscale,invert,rotation,panel,adaptThresh,hdSharpen,shadowFix]);

  // ── Original for Before/After ─────────────────────────────────────────────
  useEffect(() => {
    if (!showBA || !currentSrc || !origCanvasRef.current) return;
    const ctx = origCanvasRef.current.getContext('2d');
    const img = new Image();
    img.onload = () => {
      origCanvasRef.current.width=img.naturalWidth;
      origCanvasRef.current.height=img.naturalHeight;
      ctx.drawImage(img,0,0);
    };
    img.src = currentSrc;
  }, [showBA, currentSrc]);

  // ── Upload ────────────────────────────────────────────────────────────────
  const onUpload = (e, append=false) => {
    const files = Array.from(e.target.files).filter(f=>f.type.startsWith('image/'));
    if (!files.length) return;
    const newPages = files.map(f=>({id:Date.now()+Math.random(),src:URL.createObjectURL(f),name:f.name}));
    if (append) { setPages(p=>[...p,...newPages]); setActivePage(pages.length); }
    else { pages.forEach(p=>{if(p.src.startsWith('blob:'))URL.revokeObjectURL(p.src);}); setPages(newPages); setActivePage(0); }
    applyPreset(FILTER_PRESETS[0]); setPanel('main'); setShowBA(false); e.target.value='';
  };

  // ── Camera ────────────────────────────────────────────────────────────────
  const openCamera = async () => {
    setShowCamera(true);
    try {
      const s = await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment',width:{ideal:1920}}});
      streamRef.current=s; if(videoRef.current) videoRef.current.srcObject=s;
    } catch { setShowCamera(false); }
  };
  const capturePhoto = () => {
    const v=videoRef.current;
    if (!v) return;
    const w = v.videoWidth || 640;
    const h = v.videoHeight || 480;
    const c=document.createElement('canvas'); c.width=w; c.height=h;
    c.getContext('2d').drawImage(v,0,0);
    c.toBlob(blob=>{
      pages.forEach(p=>{if(p.src.startsWith('blob:'))URL.revokeObjectURL(p.src);});
      setPages([{id:Date.now(),src:URL.createObjectURL(blob),name:'camera.jpg'}]);
      setActivePage(0); applyPreset(FILTER_PRESETS[0]); setPanel('main'); setShowBA(false); closeCamera();
    },'image/jpeg',.95);
  };
  const closeCamera = () => { streamRef.current?.getTracks().forEach(t=>t.stop()); streamRef.current=null; setShowCamera(false); };

  // ── Auto Enhance ──────────────────────────────────────────────────────────
  const autoEnhance = () => {
    if (!currentSrc) return;
    const img=new Image();
    img.onload=()=>{
      const tc=document.createElement('canvas'); tc.width=60; tc.height=60;
      const ctx=tc.getContext('2d',{willReadFrequently:true}); ctx.drawImage(img,0,0,60,60);
      const data=ctx.getImageData(0,0,60,60).data; let total=0;
      for(let i=0;i<data.length;i+=4) total+=data[i]*.299+data[i+1]*.587+data[i+2]*.114;
      const avg=total/(60*60);
      const br=Math.max(100,Math.min(300,Math.round((230/avg)*100)));
      setBrightness(br); setContrast(220); setGrayscale(100); setAdaptThresh(false); setHdSharpen(true); setShadowFix(false); setActiveFilter('custom');
    };
    img.src=currentSrc;
  };

  // ── Before/After events ───────────────────────────────────────────────────
  const onBAMove = useCallback(e => {
    if (!isDraggingBA && e.type==='pointermove') return;
    if (!baContRef.current) return;
    const rect=baContRef.current.getBoundingClientRect();
    const cx=(e.touches?e.touches[0].clientX:e.clientX)-rect.left;
    setBaSplit(Math.max(3,Math.min(97,(cx/rect.width)*100)));
  },[isDraggingBA]);

  // ── Crop events ───────────────────────────────────────────────────────────
  const onCropMove = useCallback(e => {
    if (!cropHandle || !cropContRef.current) return;
    const rect=cropContRef.current.getBoundingClientRect();
    const cx=(e.touches?e.touches[0].clientX:e.clientX)-rect.left;
    const cy=(e.touches?e.touches[0].clientY:e.clientY)-rect.top;
    const xp=Math.max(0,Math.min(100,(cx/rect.width)*100));
    const yp=Math.max(0,Math.min(100,(cy/rect.height)*100));
    setCropBox(prev=>{
      let nb={...prev};
      if(cropHandle.includes('n')){nb.y=Math.min(yp,prev.y+prev.h-5);nb.h=(prev.y+prev.h)-nb.y;}
      if(cropHandle.includes('s')) nb.h=Math.max(5,yp-prev.y);
      if(cropHandle.includes('w')){nb.x=Math.min(xp,prev.x+prev.w-5);nb.w=(prev.x+prev.w)-nb.x;}
      if(cropHandle.includes('e')) nb.w=Math.max(5,xp-prev.x);
      if(forceA4){nb.w=nb.h/1.414;if(nb.x+nb.w>100)nb.w=100-nb.x;}
      return nb;
    });
  },[cropHandle,forceA4]);

  const executeCrop = () => {
    setIsBusy(true);
    requestAnimationFrame(()=>{
      const img=cropImgRef.current;
      const nw=img.naturalWidth, nh=img.naturalHeight;
      const c=document.createElement('canvas');
      const cw=(cropBox.w/100)*nw, ch=(cropBox.h/100)*nh;
      c.width=cw; c.height=ch;
      c.getContext('2d').drawImage(img,(cropBox.x/100)*nw,(cropBox.y/100)*nh,cw,ch,0,0,cw,ch);
      c.toBlob(blob=>{
        const newSrc=URL.createObjectURL(blob);
        setPages(pp=>pp.map((p,i)=>i===activePage?{...p,src:newSrc}:p));
        setPanel('main'); setIsBusy(false);
      },'image/jpeg',.95);
    });
  };

  // ── Build final canvas ────────────────────────────────────────────────────
  const buildFinal = () => {
    const src=canvasRef.current;
    const c=document.createElement('canvas'); c.width=src.width; c.height=src.height;
    const ctx=c.getContext('2d'); ctx.drawImage(src,0,0);
    if (panel==='watermark'&&wmText) {
      ctx.save(); ctx.translate(c.width/2,c.height/2); ctx.rotate(-Math.PI/4);
      ctx.fillStyle=`rgba(0,0,0,${wmOpacity/100})`;
      const fs=Math.max(20,c.width/8);
      ctx.font=`bold ${fs}px Cairo,sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
      for(let i=-2;i<=2;i++) for(let j=-2;j<=2;j++) ctx.fillText(wmText,i*c.width*.45,j*c.height*.4);
      ctx.restore();
    }
    return c;
  };

  // ── Save image ────────────────────────────────────────────────────────────
  const saveImage = () => {
    if (!canvasRef.current) return; setIsBusy(true);
    requestAnimationFrame(()=>{
      const c=buildFinal();
      c.toBlob(blob=>{
        const url=URL.createObjectURL(blob);
        const a=document.createElement('a'); a.download='PrintPro_doc.jpg'; a.href=url; a.click(); URL.revokeObjectURL(url);
        addHistoryItem({type:'image',name:pages[activePage]?.name||'مستند',filter:activeFilter,thumb:c.toDataURL('image/jpeg',.1)});
        showToast('تم الحفظ في المشاريع ✓'); setIsBusy(false);
      },'image/jpeg',1.0);
    });
  };

  // ── Save PDF (multi-page) ─────────────────────────────────────────────────
  const savePDF = async () => {
    if (!pages.length) return; setIsBusy(true);
    try {
      const {jsPDF}=await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js','jspdf');
      let pdf=null;
      for (let idx=0;idx<pages.length;idx++) {
        const imgData=await new Promise(res=>{
          const img=new Image();
          img.onload=()=>{
            const MAX=2200; let w=img.naturalWidth,h=img.naturalHeight;
            if(w>MAX){const r=MAX/w;w=MAX;h=Math.round(h*r);}
            const c=document.createElement('canvas'); c.width=w; c.height=h;
            const ctx=c.getContext('2d');
            if(idx===activePage) ctx.filter=`invert(${invert?100:0}%) brightness(${brightness}%) contrast(${contrast}%) grayscale(${grayscale}%)`;
            ctx.drawImage(img,0,0,w,h); ctx.filter='none';
            if(idx===activePage&&adaptThresh) applyAdaptive(ctx,w,h);
            if(idx===activePage&&shadowFix) applyShadowRemoval(ctx,w,h);
            if(idx===activePage&&hdSharpen) applySharpen(ctx,w,h);
            res({data:c.toDataURL('image/jpeg',.9),w,h});
          };
          img.src=pages[idx].src;
        });
        if(!pdf) pdf=new jsPDF({orientation:imgData.w>imgData.h?'l':'p',unit:'px',format:[imgData.w,imgData.h]});
        else pdf.addPage([imgData.w,imgData.h],imgData.w>imgData.h?'l':'p');
        pdf.addImage(imgData.data,'JPEG',0,0,imgData.w,imgData.h);
      }
      pdf.save('PrintPro_Document.pdf');
      addHistoryItem({type:'pdf',name:`${pages.length} صفحة`,thumb:null});
      showToast('تم حفظ PDF ✓');
    } catch(e){console.error(e);}
    setIsBusy(false);
  };

  // ── OCR ───────────────────────────────────────────────────────────────────
  const runOCR = async () => {
    if (!canvasRef.current) return;
    setPanel('ocr'); setIsOcr(true); setOcrProg(0); setOcrText('');
    try {
      const dataUrl=canvasRef.current.toDataURL('image/jpeg',.85);
      const Tesseract=await loadScript('https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/4.1.1/tesseract.min.js','Tesseract');
      const r=await Tesseract.recognize(dataUrl,'ara+eng',{
        logger:m=>{
          if(m.status==='recognizing text') setOcrProg(Math.floor(m.progress*100));
          else if(m.status.includes('downloading')) setOcrProg(Math.floor(m.progress*40));
        }
      });
      setOcrText(r.data.text?.trim()||'لا يوجد نص.');
    } catch { setOcrText('خطأ في الاستخراج'); }
    setIsOcr(false);
  };

  // ── Filter thumbnail card ──────────────────────────────────────────────────
  const FilterThumb = ({preset}) => {
    const ref = useRef(null);
    useEffect(()=>{
      if (!currentSrc||!ref.current) return;
      const ctx=ref.current.getContext('2d',{willReadFrequently:true});
      const img=new Image();
      img.onload=()=>{
        ref.current.width=56; ref.current.height=72;
        ctx.filter=`invert(${preset.inv?100:0}%) brightness(${preset.br}%) contrast(${preset.ct}%) grayscale(${preset.gs}%)`;
        ctx.drawImage(img,0,0,56,72); ctx.filter='none';
      };
      img.src=currentSrc;
    },[currentSrc]);

    const active = activeFilter===preset.id;
    return (
      <button onClick={()=>applyPreset(preset)}
        className={`flex-shrink-0 flex flex-col items-center gap-1.5 p-2 rounded-2xl border transition-all
          ${active?'border-indigo-500 bg-indigo-500/15 shadow-[0_0_10px_rgba(99,102,241,.3)]':'border-white/5 bg-white/5 hover:border-white/15'}`}>
        <canvas ref={ref} style={{width:48,height:60,borderRadius:8,display:'block'}}/>
        <span className={`text-[9px] font-bold whitespace-nowrap ${active?'text-indigo-300':'text-slate-500'}`}>{preset.label}</span>
      </button>
    );
  };

  return (
    <div className="flex flex-col md:flex-row h-full overflow-hidden"
      onPointerUp={()=>{ setCropHandle(null); setIsDraggingBA(false); }}
      onPointerLeave={()=>{ setCropHandle(null); setIsDraggingBA(false); }}
      onPointerMove={e=>{ onCropMove(e); if(isDraggingBA) onBAMove(e); }}
      onTouchMove={e=>{ onCropMove(e); onBAMove(e.touches[0]); }}
      onTouchEnd={()=>{ setCropHandle(null); setIsDraggingBA(false); }}>

      {/* ── Preview ── */}
      <div className="flex-1 bg-[#0a0a0d] flex flex-col items-center justify-center overflow-hidden relative p-3 md:p-6 touch-none">

        {/* Camera */}
        {showCamera&&(
          <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center gap-5">
            <video ref={videoRef} autoPlay playsInline className="w-full max-h-[70vh] object-contain"/>
            <div className="flex gap-4">
              <button onClick={capturePhoto} className="w-16 h-16 rounded-full bg-white border-4 border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,.5)] active:scale-90 transition-transform"/>
              <button onClick={closeCamera} className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center"><X size={20} className="text-white"/></button>
            </div>
          </div>
        )}

        {/* Toast */}
        {toast&&(
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-full shadow-xl fu flex items-center gap-2">
            <CheckCircle2 size={14}/>{toast}
          </div>
        )}

        {!currentSrc?(
          <label className="flex flex-col items-center justify-center w-full max-w-sm border-2 border-dashed border-white/10 rounded-3xl p-10 cursor-pointer hover:bg-white/[.02] transition-colors group">
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={onUpload}/>
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 group-hover:bg-indigo-500/10 transition-colors">
              <Upload size={28} className="text-slate-500 group-hover:text-indigo-400 transition-colors"/>
            </div>
            <p className="text-slate-400 font-bold text-center">اسحب الصورة هنا أو اضغط للرفع</p>
            <p className="text-slate-600 text-xs mt-2">JPG, PNG, WEBP, HEIC</p>
          </label>
        ):(
          <>
            {panel==='crop'?(
              <div ref={cropContRef} className="relative inline-block">
                <img ref={cropImgRef} src={currentSrc} alt="crop"
                  className="max-w-full max-h-[55vh] md:max-h-[80vh] object-contain block pointer-events-none" draggable={false}/>
                {[
                  {style:{top:0,left:0,right:0,height:`${cropBox.y}%`}},
                  {style:{bottom:0,left:0,right:0,height:`${100-cropBox.y-cropBox.h}%`}},
                  {style:{top:`${cropBox.y}%`,left:0,width:`${cropBox.x}%`,height:`${cropBox.h}%`}},
                  {style:{top:`${cropBox.y}%`,right:0,width:`${100-cropBox.x-cropBox.w}%`,height:`${cropBox.h}%`}},
                ].map((d,i)=><div key={i} className="absolute bg-black/60 pointer-events-none" style={d.style}/>)}
                <div className="absolute border-2 border-emerald-400"
                  style={{left:`${cropBox.x}%`,top:`${cropBox.y}%`,width:`${cropBox.w}%`,height:`${cropBox.h}%`}}>
                  {[['nw','-top-4 -left-4'],['ne','-top-4 -right-4'],['sw','-bottom-4 -left-4'],['se','-bottom-4 -right-4']].map(([h,cls])=>(
                    <div key={h} className={`absolute ${cls} w-8 h-8 flex items-center justify-center z-20`}
                      onPointerDown={e=>{e.preventDefault();e.stopPropagation();setCropHandle(h);}}>
                      <div className="w-4 h-4 rounded-full bg-white border-2 border-emerald-500 shadow-lg"/>
                    </div>
                  ))}
                </div>
              </div>
            ) : showBA ? (
              /* ── Before / After ── */
              <div ref={baContRef} className="relative inline-block max-w-full select-none cursor-ew-resize"
                onPointerDown={()=>setIsDraggingBA(true)}
                onTouchMove={e=>onBAMove(e.touches[0])}>
                {/* Processed (full width base) */}
                <canvas ref={canvasRef} className="block max-w-full max-h-[55vh] md:max-h-[80vh] rounded-xl shadow-2xl"/>
                {/* Original clipped to left */}
                <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none" style={{clipPath:`inset(0 ${100-baSplit}% 0 0)`}}>
                  <canvas ref={origCanvasRef} style={{width:'100%',height:'100%',display:'block'}}/>
                  <div className="absolute top-2 left-2 bg-black/70 text-white text-[10px] font-bold px-2 py-1 rounded-md">قبل</div>
                </div>
                {/* Divider */}
                <div className="absolute top-0 bottom-0 z-20 pointer-events-none" style={{left:`${baSplit}%`}}>
                  <div className="w-0.5 h-full bg-white shadow-[0_0_8px_rgba(255,255,255,.8)]"/>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 bg-white rounded-full shadow-xl flex items-center justify-center text-slate-800 font-black text-sm">⟺</div>
                </div>
                <div className="absolute top-2 right-2 bg-black/70 text-white text-[10px] font-bold px-2 py-1 rounded-md pointer-events-none">بعد</div>
              </div>
            ) : (
              <div className="relative">
                <canvas ref={canvasRef} className="max-w-full max-h-[50vh] md:max-h-[80vh] object-contain block rounded-xl shadow-2xl"/>
                {panel==='watermark'&&wmText&&(
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden rounded-xl" style={{opacity:wmOpacity/100}}>
                    <div className="text-black font-black text-3xl md:text-5xl -rotate-45 opacity-60 whitespace-nowrap">{wmText}</div>
                  </div>
                )}
              </div>
            )}

            {/* Multi-page thumbnails */}
            {pages.length>1&&(
              <div className="flex gap-2 mt-3 nx max-w-full pb-1">
                {pages.map((p,i)=>(
                  <button key={p.id} onClick={()=>{setActivePage(i);applyPreset(FILTER_PRESETS[0]);setShowBA(false);}}
                    className={`flex-shrink-0 w-12 h-16 rounded-xl overflow-hidden border-2 transition-all ${i===activePage?'border-indigo-500 shadow-[0_0_8px_rgba(99,102,241,.4)]':'border-white/10'}`}>
                    <img src={p.src} alt="" className="w-full h-full object-cover"/>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Panel ── */}
      <div className="bg-[#131317] border-t md:border-t-0 md:border-l border-white/5 flex flex-col md:w-80 lg:w-96 rounded-t-3xl md:rounded-none shadow-2xl z-10">
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={onUpload}/>
        <input ref={addPageRef} type="file" accept="image/*" multiple className="hidden" onChange={e=>onUpload(e,true)}/>

        <div className="flex-1 sc p-4 md:p-5 space-y-4">

          {/* ─ MAIN ─ */}
          {panel==='main'&&(
            <div className="fu space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <button onClick={()=>fileRef.current.click()} className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-3 font-bold text-sm transition-colors">
                  <Upload size={15} className="text-indigo-400"/>رفع صورة
                </button>
                <button onClick={openCamera} className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-3 font-bold text-sm transition-colors">
                  <Camera size={15} className="text-emerald-400"/>كاميرا
                </button>
              </div>

              {currentSrc&&(
                <>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      {icon:Wand2,     label:'تبييض ذكي', onClick:autoEnhance,            col:'text-amber-400 bg-amber-500/10 border-amber-500/20'},
                      {icon:Filter,    label:'فلاتر',      onClick:()=>setPanel('filters'), col:'text-violet-400 bg-violet-500/10 border-violet-500/20'},
                      {icon:Sliders,   label:'ضبط',        onClick:()=>setPanel('adjust'),  col:'text-sky-400 bg-sky-500/10 border-sky-500/20'},
                      {icon:Scissors,  label:'قص',         onClick:()=>{setPanel('crop');setCropBox({x:10,y:10,w:80,h:80});setShowBA(false);}, col:'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'},
                      {icon:RotateCw,  label:'تدوير',      onClick:()=>setRotation(r=>(r+90)%360), col:'text-purple-400 bg-purple-500/10 border-purple-500/20'},
                      {icon:Stamp,     label:'علامة مائية',onClick:()=>setPanel('watermark'), col:'text-pink-400 bg-pink-500/10 border-pink-500/20'},
                      {icon:ScanText,  label:'OCR نص',     onClick:runOCR,                  col:'text-teal-400 bg-teal-500/10 border-teal-500/20'},
                      {icon:Plus,      label:'إضافة صفحة', onClick:()=>addPageRef.current.click(), col:'text-slate-400 bg-white/5 border-white/10'},
                    ].map(({icon:Icon,label,onClick,col})=>(
                      <button key={label} onClick={onClick}
                        className={`flex flex-col items-center gap-1.5 p-2.5 rounded-2xl border text-xs font-bold transition-all active:scale-95 ${col}`}>
                        <Icon size={17}/><span className="leading-tight text-center">{label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Before/After toggle */}
                  <button onClick={()=>setShowBA(b=>!b)}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl border text-sm font-bold transition-all ${showBA?'bg-indigo-500/20 border-indigo-500/40 text-indigo-300':'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'}`}>
                    <ImageIcon size={15}/>{showBA?'إخفاء':'عرض'} قبل / بعد
                  </button>

                  {/* Checkboxes */}
                  <div className="space-y-2">
                    {[
                      {label:'HD Sharpen للطباعة',       val:hdSharpen,  set:setHdSharpen},
                      {label:'تبييض تكيّفي (مستندات)',   val:adaptThresh,set:setAdaptThresh},
                      {label:'إزالة الظل والإضاءة غير المتساوية', val:shadowFix, set:setShadowFix},
                    ].map(({label,val,set})=>(
                      <label key={label} className="flex items-center gap-3 bg-white/5 border border-white/5 rounded-xl px-3 py-2.5 cursor-pointer hover:bg-white/10 transition-colors">
                        <input type="checkbox" checked={val} onChange={e=>set(e.target.checked)} className="w-4 h-4 accent-indigo-500"/>
                        <span className="text-xs font-bold text-slate-300">{label}</span>
                      </label>
                    ))}
                  </div>

                  {/* Save buttons */}
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5">
                    <button onClick={saveImage} disabled={isBusy}
                      className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-3 rounded-2xl flex items-center justify-center gap-2 text-sm active:scale-95 transition-all">
                      {isBusy?<Loader2 size={15} className="animate-spin"/>:<ImageIcon size={15}/>}حفظ صورة
                    </button>
                    <button onClick={savePDF} disabled={isBusy}
                      className="bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold py-3 rounded-2xl flex items-center justify-center gap-2 text-sm active:scale-95 transition-all">
                      {isBusy?<Loader2 size={15} className="animate-spin"/>:<FileText size={15}/>}
                      {pages.length>1?`PDF (${pages.length})`:'حفظ PDF'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ─ FILTERS ─ */}
          {panel==='filters'&&(
            <div className="fu space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-violet-400 flex items-center gap-2"><Filter size={15}/>فلاتر احترافية</h3>
                <button onClick={()=>setPanel('main')} className="p-1.5 bg-white/10 rounded-full hover:bg-white/20"><X size={13}/></button>
              </div>
              <p className="text-xs text-slate-500 font-bold">اضغط على الفلتر لتطبيقه فوراً على المستند</p>
              <div className="flex gap-3 nx pb-2">
                {FILTER_PRESETS.map(p=><FilterThumb key={p.id} preset={p}/>)}
              </div>
              <div className="bg-violet-500/10 border border-violet-500/20 rounded-2xl p-3 text-xs text-center font-bold text-violet-300">
                الفلتر الحالي: <span className="text-white">{FILTER_PRESETS.find(f=>f.id===activeFilter)?.label||'مخصص'}</span>
              </div>
            </div>
          )}

          {/* ─ ADJUST ─ */}
          {panel==='adjust'&&(
            <div className="fu space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sky-400 flex items-center gap-2"><Sliders size={15}/>ضبط يدوي</h3>
                <button onClick={()=>setPanel('main')} className="p-1.5 bg-white/10 rounded-full hover:bg-white/20"><X size={13}/></button>
              </div>
              {[
                {icon:Sun,     label:'السطوع',    val:brightness, set:setBrightness, min:50, max:300, c:'text-amber-400'},
                {icon:Contrast,label:'التباين',   val:contrast,   set:setContrast,   min:50, max:400, c:'text-indigo-400'},
                {icon:Palette, label:'أبيض وأسود',val:grayscale,  set:setGrayscale,  min:0,  max:100, c:'text-slate-400'},
              ].map(({icon:Icon,label,val,set,min,max,c})=>(
                <div key={label} className="space-y-2">
                  <div className="flex justify-between">
                    <span className={`text-xs font-bold flex items-center gap-1.5 ${c}`}><Icon size={13}/>{label}</span>
                    <span className="text-xs font-bold text-slate-400">{val}%</span>
                  </div>
                  <input type="range" min={min} max={max} value={val} onChange={e=>set(Number(e.target.value))} className="w-full h-2 rounded-full appearance-none bg-white/10"/>
                </div>
              ))}
              <button onClick={()=>applyPreset(FILTER_PRESETS[0])} className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-bold text-slate-300 border border-white/5">
                إعادة الضبط
              </button>
            </div>
          )}

          {/* ─ CROP ─ */}
          {panel==='crop'&&(
            <div className="fu space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-emerald-400 flex items-center gap-2"><Scissors size={15}/>قص</h3>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-300">
                  <input type="checkbox" checked={forceA4} onChange={e=>setForceA4(e.target.checked)} className="accent-emerald-500"/>
                  نسبة A4
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={()=>setPanel('main')} className="py-3 rounded-2xl bg-white/5 border border-white/10 font-bold text-sm">إلغاء</button>
                <button onClick={executeCrop} disabled={isBusy}
                  className="py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 font-bold text-sm text-white flex items-center justify-center gap-2">
                  {isBusy?<Loader2 size={13} className="animate-spin"/>:<Check size={13}/>}تأكيد
                </button>
              </div>
            </div>
          )}

          {/* ─ WATERMARK ─ */}
          {panel==='watermark'&&(
            <div className="fu space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-pink-400 flex items-center gap-2"><Stamp size={15}/>علامة مائية</h3>
                <button onClick={()=>setPanel('main')} className="text-xs font-bold bg-pink-500/20 border border-pink-500/30 text-pink-400 px-3 py-1.5 rounded-full hover:bg-pink-500/30 flex items-center gap-1">
                  <Check size={11}/>تطبيق
                </button>
              </div>
              <input type="text" value={wmText} onChange={e=>setWmText(e.target.value)}
                placeholder="اسم المكتبة أو المعلم..."
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-bold outline-none focus:border-pink-500 transition-colors"/>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-400 whitespace-nowrap">الشفافية</span>
                <input type="range" min={5} max={100} value={wmOpacity} onChange={e=>setWmOpacity(Number(e.target.value))} className="flex-1 h-2 rounded-full appearance-none bg-white/10 accent-pink-500"/>
                <span className="text-xs font-bold text-pink-400 w-8 text-center">{wmOpacity}%</span>
              </div>
            </div>
          )}

          {/* ─ OCR ─ */}
          {panel==='ocr'&&(
            <div className="fu flex flex-col gap-3" style={{minHeight:240}}>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-teal-400 flex items-center gap-2"><ScanText size={15}/>النص المستخرج</h3>
                <div className="flex gap-2">
                  <button onClick={()=>{navigator.clipboard.writeText(ocrText).then(()=>{setIsCopied(true);setTimeout(()=>setIsCopied(false),2000);});}} disabled={!ocrText||isOcr}
                    className="text-xs bg-teal-600 hover:bg-teal-500 disabled:opacity-40 px-3 py-1.5 rounded-full font-bold flex items-center gap-1">
                    {isCopied?<><Check size={11}/>تم النسخ!</>:<><Copy size={11}/>نسخ</>}
                  </button>
                  <button onClick={()=>setPanel('main')} className="p-1.5 bg-white/10 rounded-full hover:bg-white/20"><X size={13}/></button>
                </div>
              </div>
              <div className="relative bg-black/60 border border-white/5 rounded-2xl p-3" style={{minHeight:200}}>
                {isOcr?(
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    <Loader2 size={28} className="text-teal-400 animate-spin"/>
                    <p className="text-teal-300 font-bold text-sm">{ocrProg}%</p>
                    <div className="w-32 h-1 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-teal-500 rounded-full transition-all" style={{width:`${ocrProg}%`}}/>
                    </div>
                  </div>
                ):(
                  <textarea value={ocrText} onChange={e=>setOcrText(e.target.value)} dir="auto"
                    className="w-full h-full bg-transparent text-slate-200 text-sm leading-relaxed outline-none resize-none font-medium" style={{minHeight:180}}/>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

