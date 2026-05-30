import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Upload, Image as ImageIcon, FileText, Wand2, Filter,
  Scissors, RotateCw, Sliders, Stamp, ScanText, Plus,
  Sun, Contrast, Palette, X, Check, Copy, Loader2,
  Camera, CheckCircle2, ChevronDown, ChevronUp, Eye,
  Undo2, Redo2, Share2 // تمت إضافة الأيقونات الجديدة هنا
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { FILTER_PRESETS } from '../constants'
import { applySharpen, applyAdaptive, applyShadowRemoval, getAverageBrightness, applyColorAdjustments } from '../utils/imageProcessing'
import { loadScript, CDN } from '../utils/scriptLoader'

const dataURLtoBlob = (dataurl) => {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

export default function DocumentCleaner() {
  const { t, lang, addHistoryItem, sharedFiles, setSharedFiles, activeEditCleaner, setActiveEditCleaner } = useApp()

  const [pages, setPages]             = useState([]);
  const [activePage, setActivePage]   = useState(0);
  const [brightness, setBrightness]   = useState(100);
  const [contrast,   setContrast]     = useState(100);
  const [grayscale,  setGrayscale]    = useState(0);
  const [invert,     setInvert]       = useState(false);
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
  
  // Accordion active section
  const [activeSection, setActiveSection] = useState('upload');

  // Undo/Redo Refs
  const undoStackRef = useRef([])
  const redoStackRef = useRef([])

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

  // Undo/Redo Functions
  const saveSnapshot = () => {
    if (!canvasRef.current) return
    undoStackRef.current.push(canvasRef.current.toDataURL('image/jpeg', 0.8))
    if (undoStackRef.current.length > 15) undoStackRef.current.shift()
    redoStackRef.current = []
  }

  const handleUndo = () => {
    if (!undoStackRef.current.length) return
    const prev = undoStackRef.current.pop()
    if (canvasRef.current) {
      redoStackRef.current.push(canvasRef.current.toDataURL('image/jpeg', 0.8))
    }
    const img = new Image()
    img.onload = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      canvas.getContext('2d').drawImage(img, 0, 0)
    }
    img.src = prev
  }

  const handleRedo = () => {
    if (!redoStackRef.current.length) return
    const next = redoStackRef.current.pop()
    if (canvasRef.current) {
      undoStackRef.current.push(canvasRef.current.toDataURL('image/jpeg', 0.8))
    }
    const img = new Image()
    img.onload = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      canvas.getContext('2d').drawImage(img, 0, 0)
    }
    img.src = next
  }

  const getPagesForHistory = async () => {
    const pagesData = [];
    for (const page of pages) {
      try {
        const base64 = await new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_SIZE = 1000;
            let w = img.naturalWidth;
            let h = img.naturalHeight;
            if (w > MAX_SIZE || h > MAX_SIZE) {
              if (w > h) {
                h = Math.round((h * MAX_SIZE) / w);
                w = MAX_SIZE;
              } else {
                w = Math.round((w * MAX_SIZE) / h);
                h = MAX_SIZE;
              }
            }
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL('image/jpeg', 0.8));
          };
          img.onerror = reject;
          img.src = page.src;
        });
        pagesData.push({ name: page.name, base64 });
      } catch (e) {
        console.error("Error converting page to base64 for history", e);
      }
    }
    return pagesData;
  };

  const loadFiles = async (fileList, append = false) => {
    const validFiles = Array.from(fileList).filter(
      f => f.type.startsWith('image/') || f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );
    if (!validFiles.length) return;

    setIsBusy(true);
    let newPages = [];

    try {
      for (const file of validFiles) {
        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
          showToast(lang === 'ar' ? 'جاري استخراج صفحات الـ PDF...' : 'Extracting PDF pages...');
          const pdfjsLib = await loadScript(CDN.pdfJs || 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js', 'pdfjsLib');
          pdfjsLib.GlobalWorkerOptions.workerSrc = CDN.pdfJsWorker || 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          
          const arrayBuffer = await file.arrayBuffer();
          const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          
          for (let i = 1; i <= pdfDoc.numPages; i++) {
            showToast(lang === 'ar' ? `جاري معالجة الصفحة ${i} من ${pdfDoc.numPages}...` : `Processing page ${i} of ${pdfDoc.numPages}...`);
            const page = await pdfDoc.getPage(i);
            const vp = page.getViewport({ scale: 3.0 });
            const c = document.createElement('canvas');
            c.width = vp.width;
            c.height = vp.height;
            const ctx = c.getContext('2d');
            await page.render({ canvasContext: ctx, viewport: vp }).promise;
            const blob = await new Promise(resolve => c.toBlob(resolve, 'image/jpeg', 0.95));
            newPages.push({
              id: Date.now() + Math.random(),
              src: URL.createObjectURL(blob),
              name: `${file.name.replace(/\.pdf$/i, '')}_page_${i}.jpg`
            });
          }
        } else {
          newPages.push({
            id: Date.now() + Math.random(),
            src: URL.createObjectURL(file),
            name: file.name
          });
        }
      }

      if (!newPages.length) {
        setIsBusy(false);
        return;
      }

      if (append) {
        setPages(p => {
          setActivePage(p.length);
          return [...p, ...newPages];
        });
      } else {
        pagesRef.current.forEach(p => {
          if (p.src && p.src.startsWith('blob:')) URL.revokeObjectURL(p.src);
        });
        setPages(newPages);
        setActivePage(0);
      }
      applyPreset(FILTER_PRESETS[0]);
      setPanel('main');
      setShowBA(false);
      setActiveSection('crop');
      showToast(lang === 'ar' ? 'تم تحميل الملفات بنجاح!' : 'Files loaded successfully!');
    } catch (err) {
      console.error(err);
      showToast(lang === 'ar' ? 'خطأ في قراءة الملفات' : 'Error reading files');
    } finally {
      setIsBusy(false);
    }
  };

  useEffect(() => {
    if (sharedFiles && sharedFiles.length > 0) {
      loadFiles(sharedFiles, false);
      setSharedFiles([]);
    }
  }, [sharedFiles, setSharedFiles]);

  useEffect(() => {
    if (activeEditCleaner) {
      setIsBusy(true);
      try {
        const loadedPages = activeEditCleaner.pages.map(p => {
          const blob = dataURLtoBlob(p.base64);
          return {
            id: Date.now() + Math.random(),
            src: URL.createObjectURL(blob),
            name: p.name
          };
        });
        setPages(loadedPages);
        setActivePage(0);
        applyPreset(FILTER_PRESETS[0]);
        setPanel('main');
        setShowBA(false);
        setActiveSection('crop');
      } catch (err) {
        console.error("Error loading project from history:", err);
      } finally {
        setIsBusy(false);
        setActiveEditCleaner(null);
      }
    }
  }, [activeEditCleaner, setActiveEditCleaner]);

  useEffect(() => {
    if (!cropHandle) return;

    const handlePointerMove = (e) => {
      if (!cropContRef.current) return;
      const rect = cropContRef.current.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const xp = Math.max(0, Math.min(100, (cx / rect.width) * 100));
      const yp = Math.max(0, Math.min(100, (cy / rect.height) * 100));

      setCropBox(prev => {
        let nb = { ...prev };
        
        if (cropHandle === 'n') {
          nb.y = Math.min(yp, prev.y + prev.h - 5);
          nb.h = (prev.y + prev.h) - nb.y;
        }
        else if (cropHandle === 's') {
          nb.h = Math.max(5, yp - prev.y);
        }
        else if (cropHandle === 'w') {
          nb.x = Math.min(xp, prev.x + prev.w - 5);
          nb.w = (prev.x + prev.w) - nb.x;
        }
        else if (cropHandle === 'e') {
          nb.w = Math.max(5, xp - prev.x);
        }
        else if (cropHandle === 'nw') {
          nb.x = Math.min(xp, prev.x + prev.w - 5);
          nb.w = (prev.x + prev.w) - nb.x;
          nb.y = Math.min(yp, prev.y + prev.h - 5);
          nb.h = (prev.y + prev.h) - nb.y;
        }
        else if (cropHandle === 'ne') {
          nb.w = Math.max(5, xp - prev.x);
          nb.y = Math.min(yp, prev.y + prev.h - 5);
          nb.h = (prev.y + prev.h) - nb.y;
        }
        else if (cropHandle === 'sw') {
          nb.x = Math.min(xp, prev.x + prev.w - 5);
          nb.w = (prev.x + prev.w) - nb.x;
          nb.h = Math.max(5, yp - prev.y);
        }
        else if (cropHandle === 'se') {
          nb.w = Math.max(5, xp - prev.x);
          nb.h = Math.max(5, yp - prev.y);
        }

        if (forceA4) {
          nb.w = nb.h / 1.414;
          if (nb.x + nb.w > 100) nb.w = 100 - nb.x;
        }
        return nb;
      });
    };

    const handlePointerUp = () => {
      setCropHandle(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [cropHandle, forceA4]);

  useEffect(() => {
    if (!isDraggingBA) return;

    const handlePointerMove = (e) => {
      if (!baContRef.current) return;
      const rect = baContRef.current.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      setBaSplit(Math.max(3, Math.min(97, (cx / rect.width) * 100)));
    };

    const handlePointerUp = () => {
      setIsDraggingBA(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDraggingBA]);

  const rotateImage90 = () => {
    if (!currentSrc) return;
    setIsBusy(true);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalHeight;
      canvas.height = img.naturalWidth;
      const ctx = canvas.getContext('2d');
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(90 * Math.PI / 180);
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      canvas.toBlob(blob => {
        const newSrc = URL.createObjectURL(blob);
        const oldSrc = pages[activePage]?.src;
        if (oldSrc && oldSrc.startsWith('blob:')) URL.revokeObjectURL(oldSrc);
        setPages(pp => pp.map((p, i) => i === activePage ? { ...p, src: newSrc } : p));
        setIsBusy(false);
        showToast(lang === 'ar' ? 'تم التدوير ✓' : 'Rotated ✓');
      }, 'image/jpeg', 0.95);
    };
    img.src = currentSrc;
  };

  const flipImageH = () => {
    if (!currentSrc) return;
    setIsBusy(true);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(blob => {
        const newSrc = URL.createObjectURL(blob);
        const oldSrc = pages[activePage]?.src;
        if (oldSrc && oldSrc.startsWith('blob:')) URL.revokeObjectURL(oldSrc);
        setPages(pp => pp.map((p, i) => i === activePage ? { ...p, src: newSrc } : p));
        setIsBusy(false);
        showToast(lang === 'ar' ? 'تم الانعكاس ✓' : 'Flipped ✓');
      }, 'image/jpeg', 0.95);
    };
    img.src = currentSrc;
  };

  // ── Apply filter preset ───────────────────────────────────────────────────
  const applyPreset = preset => {
    setActiveFilter(preset.id);
    setBrightness(preset.br); setContrast(preset.ct); setGrayscale(preset.gs);
    setInvert(preset.inv); setAdaptThresh(preset.adapt);
    setHdSharpen(preset.sharp); setShadowFix(preset.shadow);
  };

  // ── Render canvas ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentSrc || panel === 'crop') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const img = new Image();
    img.onload = () => {
      const MAX = 2200;
      let w = img.naturalWidth, h = img.naturalHeight;
      if (w > MAX) { const r = MAX / w; w = MAX; h = Math.round(h * r); }
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(img, 0, 0, w, h);
      // Apply all pixel-level adjustments
      applyColorAdjustments(ctx, w, h, brightness, contrast, grayscale, invert);
      if (adaptThresh) applyAdaptive(ctx, w, h);
      if (shadowFix) applyShadowRemoval(ctx, w, h);
      if (hdSharpen) applySharpen(ctx, w, h);
    };
    img.src = currentSrc;
  }, [currentSrc, panel, brightness, contrast, grayscale, invert,
      adaptThresh, hdSharpen, shadowFix]);

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

  // Safety net to release ALL remaining blob URLs on component unmount
  const pagesRef = useRef(pages);
  pagesRef.current = pages;

  useEffect(() => {
    return () => {
      pagesRef.current.forEach(p => {
        if (p.src && p.src.startsWith('blob:')) URL.revokeObjectURL(p.src);
      });
    };
  }, []);

  // ── Upload ────────────────────────────────────────────────────────────────
  const onUpload = (e, append=false) => {
    loadFiles(e.target.files, append);
    e.target.value='';
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
      pages.forEach(p => {
        if (p.src && p.src.startsWith('blob:')) URL.revokeObjectURL(p.src)
      })
      setPages([{id:Date.now(),src:URL.createObjectURL(blob),name:'camera.jpg'}]);
      setActivePage(0);
      applyPreset(FILTER_PRESETS[0]);
      setPanel('main');
      setShowBA(false);
      closeCamera();
      setActiveSection('crop');
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
      showToast(lang === 'ar' ? 'تم التبييض والتحسين تلقائياً! ✓' : 'Whitened and enhanced automatically! ✓');
    };
    img.src=currentSrc;
  };

  // ── Smart Border Detection ────────────────────────────────────────────────
  const detectSmartCrop = () => {
    if (!currentSrc) return;
    setIsBusy(true);
    const img = new Image();
    img.onload = () => {
      const MAX_W = 600;
      const r = Math.min(1, MAX_W / img.naturalWidth);
      const w = Math.round(img.naturalWidth * r);
      const h = Math.round(img.naturalHeight * r);
      const tc = document.createElement('canvas');
      tc.width = w; tc.height = h;
      const ctx = tc.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, w, h);
      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;

      // Convert to grayscale edge map using Sobel operator
      const gray = new Float32Array(w * h);
      for (let i = 0; i < w * h; i++) {
        const o = i * 4;
        gray[i] = 0.299 * data[o] + 0.587 * data[o+1] + 0.114 * data[o+2];
      }

      // Sobel edge detection
      const edges = new Float32Array(w * h);
      let maxEdge = 0;
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const gx =
            -gray[(y-1)*w+(x-1)] + gray[(y-1)*w+(x+1)]
            -2*gray[y*w+(x-1)]   + 2*gray[y*w+(x+1)]
            -gray[(y+1)*w+(x-1)] + gray[(y+1)*w+(x+1)];
          const gy =
            -gray[(y-1)*w+(x-1)] - 2*gray[(y-1)*w+x] - gray[(y-1)*w+(x+1)]
            +gray[(y+1)*w+(x-1)] + 2*gray[(y+1)*w+x] + gray[(y+1)*w+(x+1)];
          const mag = Math.sqrt(gx*gx + gy*gy);
          edges[y*w+x] = mag;
          if (mag > maxEdge) maxEdge = mag;
        }
      }

      if (maxEdge < 10) {
        setCropBox({ x: 5, y: 5, w: 90, h: 90 });
        showToast(lang === 'ar' ? 'لم يتم كشف حواف واضحة' : 'No clear edges detected');
        setPanel('crop');
        setIsBusy(false);
        return;
      }

      // Find bounding box of strong edges
      const threshold = maxEdge * 0.15;
      let minX = w, maxX = 0, minY = h, maxY = 0;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (edges[y*w+x] > threshold) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      // Add padding
      const padX = Math.round(w * 0.015);
      const padY = Math.round(h * 0.015);
      const x1 = Math.max(0, minX - padX);
      const y1 = Math.max(0, minY - padY);
      const x2 = Math.min(w, maxX + padX);
      const y2 = Math.min(h, maxY + padY);

      const xPct = Math.round((x1 / w) * 100);
      const yPct = Math.round((y1 / h) * 100);
      const wPct = Math.max(20, Math.round(((x2 - x1) / w) * 100));
      const hPct = Math.max(20, Math.round(((y2 - y1) / h) * 100));

      setCropBox({
        x: Math.max(0, Math.min(80, xPct)),
        y: Math.max(0, Math.min(80, yPct)),
        w: Math.min(100 - xPct, wPct),
        h: Math.min(100 - yPct, hPct),
      });
      showToast(lang === 'ar' ? 'تم تحديد حواف المستند! ✓' : 'Document edges detected! ✓');
      setPanel('crop');
      setShowBA(false);
      setIsBusy(false);
    };
    img.onerror = () => {
      setIsBusy(false);
      showToast(lang === 'ar' ? 'خطأ في معالجة الصورة' : 'Error processing image');
    };
    img.src = currentSrc;
  };

  // ── Before/After events (Unified Pointer) ──────────────────────────────────
  const onBAMove = useCallback(e => {
    if (!isDraggingBA) return;
    if (!baContRef.current) return;
    const rect = baContRef.current.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    setBaSplit(Math.max(3, Math.min(97, (cx / rect.width) * 100)));
  }, [isDraggingBA]);

  // ── Crop events (Unified Pointer supporting 8 handles) ─────────────────────
  const onCropMove = useCallback(e => {
    if (!cropHandle || !cropContRef.current) return;
    const rect = cropContRef.current.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const xp = Math.max(0, Math.min(100, (cx / rect.width) * 100));
    const yp = Math.max(0, Math.min(100, (cy / rect.height) * 100));

    setCropBox(prev => {
      let nb = { ...prev };
      
      if (cropHandle === 'n') {
        nb.y = Math.min(yp, prev.y + prev.h - 5);
        nb.h = (prev.y + prev.h) - nb.y;
      }
      else if (cropHandle === 's') {
        nb.h = Math.max(5, yp - prev.y);
      }
      else if (cropHandle === 'w') {
        nb.x = Math.min(xp, prev.x + prev.w - 5);
        nb.w = (prev.x + prev.w) - nb.x;
      }
      else if (cropHandle === 'e') {
        nb.w = Math.max(5, xp - prev.x);
      }
      else if (cropHandle === 'nw') {
        nb.x = Math.min(xp, prev.x + prev.w - 5);
        nb.w = (prev.x + prev.w) - nb.x;
        nb.y = Math.min(yp, prev.y + prev.h - 5);
        nb.h = (prev.y + prev.h) - nb.y;
      }
      else if (cropHandle === 'ne') {
        nb.w = Math.max(5, xp - prev.x);
        nb.y = Math.min(yp, prev.y + prev.h - 5);
        nb.h = (prev.y + prev.h) - nb.y;
      }
      else if (cropHandle === 'sw') {
        nb.x = Math.min(xp, prev.x + prev.w - 5);
        nb.w = (prev.x + prev.w) - nb.x;
        nb.h = Math.max(5, yp - prev.y);
      }
      else if (cropHandle === 'se') {
        nb.w = Math.max(5, xp - prev.x);
        nb.h = Math.max(5, yp - prev.y);
      }

      if (forceA4) {
        nb.w = nb.h / 1.414;
        if (nb.x + nb.w > 100) nb.w = 100 - nb.x;
      }
      return nb;
    });
  }, [cropHandle, forceA4]);

  const executeCrop = () => {
    saveSnapshot() // يتم حفظ حالة قبل القص للتراجع
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
        const oldSrc=pages[activePage]?.src;
        if(oldSrc && oldSrc.startsWith('blob:')) URL.revokeObjectURL(oldSrc);
        setPages(pp=>pp.map((p,i)=>i===activePage?{...p,src:newSrc}:p));
        setPanel('main'); setIsBusy(false);
        showToast(lang === 'ar' ? 'تم القص بنجاح! ✓' : 'Cropped successfully! ✓');
      },'image/jpeg',.95);
    });
  };

  // ── Build final canvas ────────────────────────────────────────────────────
  const buildFinal = () => {
    const src=canvasRef.current;
    const c=document.createElement('canvas'); c.width=src.width; c.height=src.height;
    const ctx=c.getContext('2d'); ctx.drawImage(src,0,0);
    if (wmText) {
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
  const saveImage = async () => {
    if (!canvasRef.current) return; setIsBusy(true);
    const pagesData = await getPagesForHistory();
    requestAnimationFrame(()=>{
      const c=buildFinal();
      c.toBlob(blob=>{
        const url=URL.createObjectURL(blob);
        const a=document.createElement('a'); a.download='PrintPro_doc.jpg'; a.href=url; a.click(); URL.revokeObjectURL(url);
        addHistoryItem({
          type:'image',
          name:pages[activePage]?.name||(lang === 'ar' ? 'مستند' : 'Document'),
          filter:activeFilter,
          thumb:c.toDataURL('image/jpeg',.1),
          projectData: { pages: pagesData }
        });
        showToast(t('savedToHistory')); setIsBusy(false);
      },'image/jpeg',1.0);
    });
  };

  // ── Share API ─────────────────────────────────────────────────────────────
  const shareFile = async (blob, filename) => {
    if (!navigator.share || !navigator.canShare) {
      showToast(lang === 'ar' ? 'المشاركة غير مدعومة في هذا المتصفح' : 'Sharing not supported in this browser')
      return
    }
    const file = new File([blob], filename, { type: blob.type })
    if (!navigator.canShare({ files: [file] })) {
      showToast(lang === 'ar' ? 'لا يمكن مشاركة هذا النوع' : 'Cannot share this file type')
      return
    }
    try {
      await navigator.share({ files: [file], title: 'PrintPro' })
    } catch (e) {
      if (e.name !== 'AbortError') {
        showToast(lang === 'ar' ? 'فشلت المشاركة' : 'Share failed')
      }
    }
  }

  // ── Save PDF (multi-page) ─────────────────────────────────────────────────
  const savePDF = async () => {
    if (!pages.length) return;
    setIsBusy(true);
    const pagesData = await getPagesForHistory();
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
            
            ctx.drawImage(img,0,0,w,h);
            applyColorAdjustments(ctx, w, h, brightness, contrast, grayscale, invert);
            if(adaptThresh) applyAdaptive(ctx,w,h);
            if(shadowFix) applyShadowRemoval(ctx,w,h);
            if(hdSharpen) applySharpen(ctx,w,h);
            
            res({data:c.toDataURL('image/jpeg',.9),w,h});
          };
          img.src=pages[idx].src;
        });
        if(!pdf) pdf=new jsPDF({orientation:imgData.w>imgData.h?'l':'p',unit:'px',format:[imgData.w,imgData.h]});
        else pdf.addPage([imgData.w,imgData.h],imgData.w>imgData.h?'l':'p');
        pdf.addImage(imgData.data,'JPEG',0,0,imgData.w,imgData.h);
      }
      pdf.save('PrintPro_Document.pdf');
      addHistoryItem({
        type:'pdf',
        name:lang === 'ar' ? `${pages.length} صفحة` : `${pages.length} page(s)`,
        thumb:null,
        projectData: { pages: pagesData }
      });
      showToast(lang === 'ar' ? 'تم حفظ PDF بنجاح! ✓' : 'PDF saved successfully! ✓');
    } catch(e){console.error(e);}
    setIsBusy(false);
  };

  // ── OCR ───────────────────────────────────────────────────────────────────
  const runOCR = async () => {
    if (!canvasRef.current) return;
    setIsOcr(true);
    setOcrProg(0); setOcrText('');
    try {
      const dataUrl=canvasRef.current.toDataURL('image/jpeg',.85);
      const Tesseract=await loadScript('https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/4.1.1/tesseract.min.js','Tesseract');
      const r=await Tesseract.recognize(dataUrl,'ara+eng',{
        logger:m=>{
          if(m.status==='recognizing text') setOcrProg(Math.floor(m.progress*100));
          else if(m.status.includes('downloading')) setOcrProg(Math.floor(m.progress*40));
        }
      });
      setOcrText(r.data.text?.trim()||t('noText'));
    } catch { setOcrText(lang === 'ar' ? 'خطأ في استخراج النص' : 'OCR error'); }
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
        <span className={`text-[9px] font-bold whitespace-nowrap ${active?'text-indigo-300':'text-slate-500'}`}>
          {lang === 'ar' ? preset.label : preset.labelEn}
        </span>
      </button>
    );
  };

  // ── Accordion section renderer ────────────────────────────────────────────
  const AccordionSection = ({ id, label, icon: Icon, color, children }) => {
    const active = activeSection === id;
    const disabled = !currentSrc && id !== 'upload';
    return (
      <div className={`border-b border-white/5 ${disabled ? 'opacity-35' : ''}`}>
        <button
          onClick={() => {
            if (disabled) return;
            setActiveSection(active ? '' : id);
            if (id === 'crop' && !active) {
              setPanel('crop');
              setCropBox({x:10,y:10,w:80,h:80});
              setShowBA(false);
            } else {
              setPanel('main');
            }
          }}
          disabled={disabled}
          className={`w-full flex items-center justify-between p-4 font-bold transition-colors text-sm
            ${active ? `text-${color}-400 bg-white/[0.01]` : 'text-slate-400 hover:text-white hover:bg-white/[0.01]'}`}
        >
          <span className="flex items-center gap-2.5">
            <Icon size={16} />
            <span>{label}</span>
          </span>
          <ChevronDown size={14} className={`transition-transform duration-200 ${active ? 'rotate-180' : ''}`} />
        </button>
        {active && !disabled && (
          <div className="p-4 bg-[#0a0a0d]/40 space-y-4 border-t border-white/5 fu">
            {children}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col md:flex-row h-full overflow-hidden">

      {/* ── Preview (Top 45% on mobile, flex-1 on desktop) ── */}
      <div className="h-[42vh] md:h-full flex-shrink-0 md:flex-1 bg-[#0a0a0d] flex flex-col items-center justify-center overflow-hidden relative p-3 md:p-6 touch-none">

        {currentSrc && (
          <div className="absolute top-3 left-3 flex gap-1.5 z-20">
            <button
              onClick={handleUndo}
              disabled={!undoStackRef.current.length}
              className="w-8 h-8 bg-black/60 hover:bg-black/80 disabled:opacity-30 rounded-lg flex items-center justify-center transition-all"
              title={lang === 'ar' ? 'تراجع' : 'Undo'}
            >
              <Undo2 size={14} className="text-white" />
            </button>
            <button
              onClick={handleRedo}
              disabled={!redoStackRef.current.length}
              className="w-8 h-8 bg-black/60 hover:bg-black/80 disabled:opacity-30 rounded-lg flex items-center justify-center transition-all"
              title={lang === 'ar' ? 'إعادة' : 'Redo'}
            >
              <Redo2 size={14} className="text-white" />
            </button>
          </div>
        )}

        {/* Camera overlay */}
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
          <label className="flex flex-col items-center justify-center w-full max-w-sm border-2 border-dashed border-white/10 rounded-3xl p-8 cursor-pointer hover:bg-white/[.02] transition-colors group">
            <input ref={fileRef} type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={onUpload}/>
            <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mb-4 group-hover:bg-indigo-500/10 transition-colors">
              <Upload size={22} className="text-slate-500 group-hover:text-indigo-400 transition-colors"/>
            </div>
            <p className="text-slate-400 font-bold text-sm text-center">{t('dropHere')}</p>
            <p className="text-slate-600 text-[10px] mt-2">{t('supportedFormats')}</p>
          </label>
        ):(
          <>
            {panel==='crop'?(
              <div ref={cropContRef} className="relative inline-block" style={{ touchAction: 'none' }}>
                <img ref={cropImgRef} src={currentSrc} alt="crop" className="max-w-full max-h-[35vh] md:max-h-[80vh] block pointer-events-none" draggable={false}/>
                {[
                  {style:{top:0,left:0,right:0,height:`${cropBox.y}%`}},
                  {style:{bottom:0,left:0,right:0,height:`${100-cropBox.y-cropBox.h}%`}},
                  {style:{top:`${cropBox.y}%`,left:0,width:`${cropBox.x}%`,height:`${cropBox.h}%`}},
                  {style:{top:`${cropBox.y}%`,right:0,width:`${100-cropBox.x-cropBox.w}%`,height:`${cropBox.h}%`}},
                ].map((d,i)=><div key={i} className="absolute bg-black/60 pointer-events-none" style={d.style}/>)}
                <div className="absolute border-2 border-emerald-400"
                  style={{left:`${cropBox.x}%`,top:`${cropBox.y}%`,width:`${cropBox.w}%`,height:`${cropBox.h}%`}}>
                  {[
                    // Corners
                    ['nw', '-top-3 -left-3'],
                    ['ne', '-top-3 -right-3'],
                    ['sw', '-bottom-3 -left-3'],
                    ['se', '-bottom-3 -right-3'],
                    // Edges
                    ['n', '-top-3 left-[calc(50%-12px)]'],
                    ['s', '-bottom-3 left-[calc(50%-12px)]'],
                    ['w', 'top-[calc(50%-12px)] -left-3'],
                    ['e', 'top-[calc(50%-12px)] -right-3'],
                  ].map(([h, cls]) => (
                    <div key={h} className={`absolute ${cls} w-6 h-6 flex items-center justify-center z-20 cursor-pointer`}
                      style={{ touchAction: 'none' }}
                      onPointerDown={e => {
                        e.preventDefault();
                        e.stopPropagation();
                        setCropHandle(h);
                      }}
                    >
                      <div className={`w-3.5 h-3.5 bg-white border-2 border-emerald-500 shadow-md ${
                        h.length === 1 ? 'rounded' : 'rounded-full'
                      }`}/>
                    </div>
                  ))}
                </div>
              </div>
            ) : showBA ? (
              /* ── Before / After ── */
              <div ref={baContRef} className="relative inline-block max-w-full select-none cursor-ew-resize"
                style={{ touchAction: 'none' }}
                onPointerDown={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingBA(true);
                }}
              >
                {/* Processed */}
                <canvas ref={canvasRef} className="block max-w-full max-h-[35vh] md:max-h-[80vh] rounded-xl shadow-2xl"
                  style={{}}
                />
                {/* Original */}
                <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none" style={{clipPath:`inset(0 ${100-baSplit}% 0 0)`}}>
                  <canvas ref={origCanvasRef} style={{width:'100%',height:'100%',display:'block'}}/>
                  <div className="absolute top-2 left-2 bg-black/70 text-white text-[10px] font-bold px-2 py-1 rounded-md">{lang==='ar'?'قبل':'Before'}</div>
                </div>
                {/* Divider */}
                <div className="absolute top-0 bottom-0 z-20 pointer-events-none" style={{left:`${baSplit}%`}}>
                  <div className="w-0.5 h-full bg-white shadow-[0_0_8px_rgba(255,255,255,.8)]"/>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-xl flex items-center justify-center text-slate-800 font-black text-xs">⟺</div>
                </div>
                <div className="absolute top-2 right-2 bg-black/70 text-white text-[10px] font-bold px-2 py-1 rounded-md pointer-events-none">{lang==='ar'?'بعد':'After'}</div>
              </div>
            ) : (
              <div className="relative">
                <canvas ref={canvasRef} className="max-w-full max-h-[35vh] md:max-h-[80vh] object-contain block rounded-xl shadow-2xl"
                  style={{}}
                />
                {wmText&&(
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden rounded-xl" style={{opacity:wmOpacity/100}}>
                    <div className="text-black font-black text-2xl md:text-5xl -rotate-45 opacity-60 whitespace-nowrap">{wmText}</div>
                  </div>
                )}
              </div>
            )}

            {/* Thumbnails */}
            {pages.length>1&&(
              <div className="flex gap-2 mt-3 nx max-w-full pb-1">
                {pages.map((p,i)=>(
                  <button key={p.id} onClick={()=>{setActivePage(i);applyPreset(FILTER_PRESETS[0]);setShowBA(false);}}
                    className={`flex-shrink-0 w-11 h-14 rounded-lg overflow-hidden border-2 transition-all ${i===activePage?'border-indigo-500 shadow-[0_0_8px_rgba(99,102,241,.4)]':'border-white/10'}`}>
                    <img src={p.src} alt="" className="w-full h-full object-cover"/>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Collapsible Panel (Bottom 55% on mobile, fixed width on desktop) ── */}
      <div className="flex-1 md:flex-none h-full bg-[#131317] border-t md:border-t-0 md:border-l border-white/5 flex flex-col md:w-80 lg:w-96 rounded-t-3xl md:rounded-none shadow-2xl z-10 overflow-hidden">
        
        {/* Accordion List */}
        <div className="flex-1 sc overflow-y-auto">
          
          {/* Section 1: Files & Pages */}
          <AccordionSection id="upload" label={lang==='ar'?'الملفات والصفحات':'Files & Pages'} icon={ImageIcon} color="emerald">
            <div className="grid grid-cols-2 gap-2">
              <button onClick={()=>fileRef.current.click()} className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-3 font-bold text-xs text-emerald-400 transition-colors">
                <Upload size={14}/>{lang==='ar'?'رفع مستند':'Upload Doc'}
              </button>
              <button onClick={openCamera} className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-3 font-bold text-xs text-indigo-400 transition-colors">
                <Camera size={14}/>{lang==='ar'?'كاميرا':'Camera'}
              </button>
            </div>
            
            {pages.length > 0 && (
              <div className="pt-2 border-t border-white/5 space-y-2">
                <p className="text-[10px] text-slate-500 font-bold">{lang==='ar'?'إدارة مستند متعدد الصفحات':'Manage Pages'}</p>
                <div className="flex items-center justify-between bg-white/5 border border-white/5 rounded-xl px-3 py-2">
                  <span className="text-xs font-bold text-slate-300">{pages.length} {lang==='ar'?'صفحة':'page(s)'}</span>
                  <button onClick={()=>addPageRef.current.click()} className="flex items-center gap-1 text-[10px] font-black text-indigo-400 hover:underline">
                    <Plus size={11}/>{lang==='ar'?'إضافة صفحة':'Add Page'}
                  </button>
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={saveImage} disabled={isBusy} className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 text-xs transition-colors">
                    {isBusy?<Loader2 size={12} className="animate-spin"/>:<ImageIcon size={12}/>}{lang==='ar'?'حفظ كصورة':'Save Image'}
                  </button>

                  {/* زر المشاركة الجديد تمت إضافته هنا */}
                  {navigator.share && (
                    <button
                      onClick={() => {
                        if (!canvasRef.current) return
                        canvasRef.current.toBlob(blob => {
                          shareFile(blob, 'PrintPro_doc.jpg')
                        }, 'image/jpeg', 1.0)
                      }}
                      className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 text-xs transition-colors"
                    >
                      <Share2 size={12} />
                      {lang === 'ar' ? 'مشاركة' : 'Share'}
                    </button>
                  )}

                  <button onClick={savePDF} disabled={isBusy} className="flex-1 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 text-xs transition-colors">
                    {isBusy?<Loader2 size={12} className="animate-spin"/>:<FileText size={12}/>}{lang==='ar'?'حفظ كـ PDF':'Save PDF'}
                  </button>
                </div>
              </div>
            )}
          </AccordionSection>

          {/* Section 2: Crop & Rotate */}
          <AccordionSection id="crop" label={lang==='ar'?'قص وتدوير الصفحة':'Crop & Rotate'} icon={Scissors} color="indigo">
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <button onClick={detectSmartCrop} className="py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black rounded-xl flex items-center justify-center gap-1 transition-colors">
                  <Wand2 size={12}/>{lang==='ar'?'القص الذكي':'Smart Crop'}
                </button>
                <button onClick={rotateImage90} className="py-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-[10px] font-bold text-slate-300 flex items-center justify-center gap-1 transition-colors">
                  <RotateCw size={12}/>{lang==='ar'?'تدوير 90°':'Rotate 90°'}
                </button>
                <button onClick={flipImageH} className="py-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-[10px] font-bold text-slate-300 flex items-center justify-center gap-1 transition-colors">
                  <Sliders size={12}/>{lang==='ar'?'عكس أفقي':'Mirror H'}
                </button>
              </div>

              {panel==='crop' ? (
                <div className="bg-emerald-950/20 border border-emerald-800/30 rounded-xl p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-emerald-400 font-bold">{lang==='ar'?'لوحة التحكم بالقص الجاري':'Manual Cropping'}</span>
                    <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 cursor-pointer">
                      <input type="checkbox" checked={forceA4} onChange={e=>setForceA4(e.target.checked)} className="accent-emerald-500 w-3.5 h-3.5"/>
                      {t('forceA4')}
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={()=>setPanel('main')} className="py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold text-slate-400 transition-colors">{t('cancel')}</button>
                    <button onClick={executeCrop} className="py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-bold text-white transition-colors">{t('confirmCrop')}</button>
                  </div>
                </div>
              ) : (
                <button onClick={()=>{setPanel('crop');setCropBox({x:10,y:10,w:80,h:80});setShowBA(false);}} className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-dashed border-white/10 text-xs font-bold text-slate-300 rounded-xl transition-colors">
                  {lang==='ar'?'تعديل حواف القص يدوياً':'Crop Borders Manually'}
                </button>
              )}
            </div>
          </AccordionSection>

          {/* Section 3: Smart Enhance & Adjust */}
          <AccordionSection id="adjust" label={lang==='ar'?'تعديل وتحسين المستند':'Enhance & Adjust'} icon={Sliders} color="amber">
            <div className="space-y-4">
              <button onClick={autoEnhance} className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-lg shadow-amber-500/10">
                <Wand2 size={13}/>{t('autoEnhance')}
              </button>

              <div className="space-y-2 border-t border-white/5 pt-3">
                {[
                  {icon:Sun,     label:t('brightness'), val:brightness, set:setBrightness, min:50, max:300, c:'text-amber-400'},
                  {icon:Contrast,label:t('contrast'),   val:contrast,   set:setContrast,   min:50, max:400, c:'text-indigo-400'},
                  {icon:Palette, label:t('grayscale'),  val:grayscale,  set:setGrayscale,  min:0,  max:100, c:'text-slate-400'},
                ].map(({icon:Icon,label,val,set,min,max,c})=>(
                  <div key={label} className="space-y-1.5">
                    <div className="flex justify-between text-[11px] font-bold">
                      <span className={`flex items-center gap-1.5 ${c}`}><Icon size={12}/>{label}</span>
                      <span className="text-slate-500">{val}%</span>
                    </div>
                    <input 
                      type="range" 
                      min={min} 
                      max={max} 
                      value={val} 
                      onChange={e=>set(Number(e.target.value))} 
                      onPointerDown={e => e.stopPropagation()} 
                      onPointerMove={e => e.stopPropagation()}
                      onPointerUp={e => e.stopPropagation()}
                      className="w-full h-1.5 accent-indigo-500 touch-none"
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-2 pt-2 border-t border-white/5">
                {[
                  {label:lang==='ar'?'عكس الألوان (سالب)':'Invert Colors (Negative)', val:invert, set:setInvert},
                  {label:lang==='ar'?'HD Sharpen للطباعة':'HD Sharpen (Printing)', val:hdSharpen,  set:setHdSharpen},
                  {label:lang==='ar'?'تبييض تكيّفي (CamScanner)':'Adaptive White (CamScanner)', val:adaptThresh,set:setAdaptThresh},
                  {label:lang==='ar'?'إزالة الظلال والإضاءة غير المتكافئة':'Remove Shadows & Glow', val:shadowFix, set:setShadowFix},
                ].map(({label,val,set})=>(
                  <label key={label} className="flex items-center gap-2.5 bg-white/5 border border-white/5 rounded-xl px-3 py-2 cursor-pointer hover:bg-white/10 transition-colors">
                    <input type="checkbox" checked={val} onChange={e=>set(e.target.checked)} className="w-3.5 h-3.5 accent-indigo-500"/>
                    <span className="text-[11px] font-bold text-slate-300">{label}</span>
                  </label>
                ))}
              </div>
            </div>
          </AccordionSection>

          {/* Section 4: Filters & Compare */}
          <AccordionSection id="filters" label={lang==='ar'?'الفلاتر الاحترافية والمقارنة':'Filters & Comparison'} icon={Filter} color="violet">
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-bold text-violet-400">
                <span>{lang==='ar'?'اختر فلتر سريع لمعالجة الورقة':'Select Scan Filter'}</span>
                {activeFilter !== 'raw' && <span className="bg-violet-500/20 px-2.5 py-0.5 rounded-full text-[10px]">{t('filters')}: {activeFilter}</span>}
              </div>
              <div className="flex gap-2.5 nx pb-2">
                {FILTER_PRESETS.map(p=><FilterThumb key={p.id} preset={p}/>)}
              </div>

              <div className="pt-3 border-t border-white/5">
                <button onClick={()=>setShowBA(b=>!b)}
                  className={`w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-xs font-bold transition-all ${showBA?'bg-indigo-500/20 border-indigo-500/40 text-indigo-300':'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'}`}>
                  <ImageIcon size={14}/>{showBA?(lang==='ar'?'إخفاء المقارنة':'Hide Compare') : (lang==='ar'?'تفعيل المقارنة (قبل / بعد)':'Show Before / After')}
                </button>
              </div>
            </div>
          </AccordionSection>

          {/* Section 5: Watermark & OCR Text */}
          <AccordionSection id="watermark" label={lang==='ar'?'النصوص والنسخ والعلامة المائية':'Watermark & OCR'} icon={Stamp} color="pink">
            <div className="space-y-4">
              {/* OCR */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-teal-400 flex items-center gap-1"><ScanText size={12}/>{lang==='ar'?'استخراج النصوص الذكي (OCR)':'OCR Text Extractor'}</p>
                {isOcr ? (
                  <div className="bg-black/40 border border-white/5 rounded-xl p-3 flex flex-col items-center gap-2 text-center text-xs">
                    <Loader2 size={20} className="text-teal-400 animate-spin"/>
                    <p className="text-slate-400 font-bold">{lang==='ar'?'جاري استخراج النص...':'Extracting text...'} ({ocrProg}%)</p>
                  </div>
                ) : ocrText ? (
                  <div className="space-y-2">
                    <div className="relative bg-black/60 border border-white/5 rounded-xl p-3">
                      <textarea value={ocrText} onChange={e=>setOcrText(e.target.value)} dir="auto"
                        className="w-full bg-transparent text-slate-200 text-xs leading-relaxed outline-none resize-none font-medium h-24"/>
                    </div>
                    <button onClick={()=>{navigator.clipboard.writeText(ocrText).then(()=>{setIsCopied(true);setTimeout(()=>setIsCopied(false),2000);});}}
                      className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1 transition-all">
                      {isCopied?<Check size={12}/>:<Copy size={12}/>}
                      {isCopied?t('copied'):t('copy')}
                    </button>
                  </div>
                ) : (
                  <button onClick={runOCR} className="w-full py-2.5 bg-teal-600/10 hover:bg-teal-600/20 border border-teal-500/20 text-teal-400 text-xs font-bold rounded-xl transition-colors">
                    {lang==='ar'?'بدء التعرف على النصوص واستخراجها':'Start OCR Text Scan'}
                  </button>
                )}
              </div>

              {/* Watermark */}
              <div className="pt-3 border-t border-white/5 space-y-2.5">
                <p className="text-[11px] font-bold text-pink-400 flex items-center gap-1"><Stamp size={12}/>{t('watermark')}</p>
                <input type="text" value={wmText} onChange={e=>setWmText(e.target.value)}
                  placeholder={lang==='ar'?'مثال: مكتبة الحرمين، الأستاذ...':'e.g. My Shop Name...'}
                  className="w-full bg-black border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs font-bold outline-none focus:border-pink-500 transition-colors"/>
                {wmText && (
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-slate-500 font-bold whitespace-nowrap">{t('opacity')}</span>
                    <input 
                      type="range" 
                      min={5} 
                      max={100} 
                      value={wmOpacity} 
                      onChange={e=>setWmOpacity(Number(e.target.value))} 
                      onPointerDown={e => e.stopPropagation()} 
                      onPointerMove={e => e.stopPropagation()}
                      onPointerUp={e => e.stopPropagation()}
                      className="flex-1 h-1.5 accent-pink-500 touch-none"
                    />
                    <span className="text-xs text-pink-400 font-bold w-8 text-center">{wmOpacity}%</span>
                  </div>
                )}
              </div>
            </div>
          </AccordionSection>

        </div>

        {/* Static input refs */}
        <input ref={fileRef} type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={onUpload}/>
        <input ref={addPageRef} type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={e=>onUpload(e,true)}/>
      </div>
    </div>
  );
}