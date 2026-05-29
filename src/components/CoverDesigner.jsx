import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Download, Printer, Type, ImagePlus, Image as ImageIcon,
  Sparkles, LayoutTemplate, Palette, Layers, Trash2,
  X, Check, Bot, Loader2, ChevronDown, ChevronUp,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { FONTS, STICKERS, FRAMES } from '../constants'
import { loadScript, CDN } from '../utils/scriptLoader'
import { callClaudeAPI } from '../utils/api'
import CoverFrame from './CoverFrame'

const getBackgroundPrompt = (subject) => {
  const map = {
    'رياضيات': 'Mathematical geometry patterns, school blackboard formulas, clean vector design, modern educational poster background, indigo and purple aesthetic, minimal, high-resolution, A4 format, no text',
    'فيزياء': 'Physics science blackboard formulas, quantum mechanism illustration, atoms and energy fields, glowing line art vector, minimal dark background, high resolution, A4 format, no text',
    'كيمياء': 'Chemistry elements, molecule structures, glass test tubes and reactions illustration, colorful educational vector, clean graphic background, high resolution, A4 format, no text',
    'أحياء': 'Biology cells, DNA spiral, green leaf veins, natural science vector pattern, cute educational layout, high resolution, A4 format, no text',
    'لغة عربية': 'Arabic calligraphy art elements, abstract fluid shapes, elegant Islamic geometric patterns, gold and teal aesthetic background, high resolution, A4 format, no text',
    'دراسات': 'Old world map, compass, school globe, history and geography illustration, vector art flat design style, clean colorful background, high resolution, A4 format, no text',
    'تاريخ': 'Ancient historical pyramids, scrolls, hourglass illustration, history educational vector graphics, warm color palette, high resolution, A4 format, no text',
    'جغرافيا': 'Topographical atlas map, rotating school globe, compass illustration, clean colorful geography vector design, high resolution, A4 format, no text',
    'إنجليزي': 'London Big Ben tower, red telephone booth, cute educational English doodles, flat vector style, bright modern background, high resolution, A4 format, no text',
    'فرنسي': 'Paris Eiffel tower illustration, French flag colors, flat vector educational art style, clean bright layout, high resolution, A4 format, no text',
  };

  let prompt = 'Cute school doodles, open books, pencils, school supplies pattern, colorful vector art, educational background, clean graphic illustration, high resolution, A4 format, no text';
  for (const [key, value] of Object.entries(map)) {
    if (subject.includes(key) || key.includes(subject)) {
      prompt = value;
      break;
    }
  }
  return prompt;
};

export default function CoverDesigner() {
  const { addHistoryItem, lang } = useApp()
  const [design, setDesign] = useState({
    bgColor: '#ffffff',
    borderColor: '#4f46e5',
    textColor: '#1e293b',
    fontFamily: 'Cairo',
    frameStyle: 'modern-waves',
    bgImage: ''
  })
  const [elements, setElements] = useState([
    { id: 't1', type: 'text', text: 'المراجعة النهائية', size: 44, rotation: 0, x: 50, y: 28, opacity: 100, zIndex: 10 },
    { id: 't2', type: 'text', text: 'الصف الثالث الثانوي', size: 22, rotation: 0, x: 50, y: 46, opacity: 100, zIndex: 10 },
    { id: 't3', type: 'text', text: 'إعداد المعلم:', size: 18, rotation: 0, x: 50, y: 82, opacity: 100, zIndex: 10 },
  ])
  const [selected, setSelected] = useState(null)
  const [editingTextId, setEditingTextId] = useState(null)
  const [dragging, setDragging] = useState(null)
  const [showAI, setShowAI] = useState(false)
  const [aiForm, setAiForm] = useState({ subject: '', grade: '', teacher: '' })
  const [isAI, setIsAI] = useState(false)
  const [genBg, setGenBg] = useState(true)
  const [aiStickerPrompt, setAiStickerPrompt] = useState('')
  const [isGenSticker, setIsGenSticker] = useState(false)

  // Accordion active section ('add' | 'styles' | 'colors' | 'stickers')
  const [activeSection, setActiveSection] = useState('add')

  const coverRef = useRef(null)
  const elRefs = useRef({})
  const posRefs = useRef({})
  const imgInputRef = useRef(null)

  // Auto-focus on text element when editing starts
  useEffect(() => {
    if (editingTextId) {
      const dom = document.getElementById(`edit-input-${editingTextId}`)
      if (dom) {
        dom.focus()
        // Place cursor at the end of the text
        if (typeof window.getSelection !== 'undefined' && typeof document.createRange !== 'undefined') {
          const range = document.createRange()
          range.selectNodeContents(dom)
          range.collapse(false)
          const sel = window.getSelection()
          sel.removeAllRanges()
          sel.addRange(range)
        }
      }
    }
  }, [editingTextId])

  const addText = () => {
    const id = `t-${Date.now()}`
    setElements(p => [...p, { id, type: 'text', text: lang === 'ar' ? 'نص جديد' : 'New Text', size: 28, rotation: 0, x: 50, y: 50, opacity: 100, zIndex: 12 }])
    posRefs.current[id] = { x: 50, y: 50 }
    setSelected(id)
    setEditingTextId(id)
  }

  const addSticker = s => {
    const id = `s-${Date.now()}`
    setElements(p => [...p, { id, type: 'text', text: s, size: 50, rotation: 0, x: 50, y: 50, opacity: 100, zIndex: 15 }])
    posRefs.current[id] = { x: 50, y: 50 }
    setSelected(id)
  }

  const addImage = e => {
    const f = e.target.files[0]; if (!f) return;
    const id = `img-${Date.now()}`
    const src = URL.createObjectURL(f)
    setElements(p => [...p, { id, type: 'image', src, size: 30, rotation: 0, x: 50, y: 50, opacity: 100, zIndex: 5 }])
    posRefs.current[id] = { x: 50, y: 50 }
    setSelected(id)
    e.target.value = ''
  }

  const updateEl = (id, k, v) => setElements(p => p.map(e => e.id === id ? { ...e, [k]: v } : e))
  const removeEl = id => {
    setElements(p => p.filter(e => e.id !== id))
    if (selected === id) setSelected(null)
    if (editingTextId === id) setEditingTextId(null)
  }
  const changeZ = (id, d) => setElements(p => p.map(e => e.id === id ? { ...e, zIndex: Math.max(0, Math.min(50, e.zIndex + d)) } : e))

  const onDragStart = id => e => {
    e.stopPropagation()
    setDragging(id)
    setSelected(id)
  }

  const onDragMove = useCallback(e => {
    if (!dragging || !coverRef.current) return;
    const rect = coverRef.current.getBoundingClientRect()
    const cx = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left
    const cy = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top
    const x = Math.max(0, Math.min(100, (cx / rect.width) * 100))
    const y = Math.max(0, Math.min(100, (cy / rect.height) * 100))
    posRefs.current[dragging] = { x, y }
    const el = elRefs.current[dragging]
    if (el) {
      el.style.left = `${x}%`
      el.style.top = `${y}%`
    }
  }, [dragging])

  const onDragEnd = () => {
    if (dragging && posRefs.current[dragging]) {
      const { x, y } = posRefs.current[dragging]
      setElements(p => p.map(e => e.id === dragging ? { ...e, x, y } : e))
    }
    setDragging(null)
  }

  const handleTextClick = (e, el) => {
    e.stopPropagation()
    if (selected === el.id) {
      setEditingTextId(el.id)
    } else {
      setSelected(el.id)
    }
  }

  const handleAI = async () => {
    if (!aiForm.subject) return; setIsAI(true)
    try {
      const prompt = `أنت مصمم أغلفة مذكرات تعليمية. المادة: ${aiForm.subject}, الصف: ${aiForm.grade || 'غير محدد'}, المعلم: ${aiForm.teacher || 'غير محدد'}. أعد JSON فقط بلا أي نص إضافي: {"title":"عنوان جذاب","subtitle":"تفاصيل الصف","author":"إعداد المعلم: [الاسم]"}`;
      const r = await callClaudeAPI(prompt)
      if (r) {
        setElements(p => p.map(e => {
          if (e.id === 't1' && r.title) return { ...e, text: r.title };
          if (e.id === 't2' && r.subtitle) return { ...e, text: r.subtitle };
          if (e.id === 't3' && r.author) return { ...e, text: r.author };
          return e;
        }))
      }

      if (genBg) {
        const bgPrompt = getBackgroundPrompt(aiForm.subject)
        const bgUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(bgPrompt)}?width=800&height=1130&nologo=true&enhance=true&seed=${Math.floor(Math.random() * 100000)}`;
        
        // Preload image
        await new Promise((resolve) => {
          const img = new Image()
          img.onload = () => {
            setDesign(p => ({ ...p, bgImage: bgUrl, textColor: '#ffffff' }))
            resolve()
          }
          img.onerror = () => resolve()
          img.src = bgUrl
        })
      }
      setShowAI(false)
    } catch (err) {
      console.error(err)
    } finally {
      setIsAI(false)
    }
  }

  const generateSticker = async () => {
    if (!aiStickerPrompt) return;
    setIsGenSticker(true)
    try {
      const promptEng = `Cute ${aiStickerPrompt}, 3D cartoon style, isolated white background, stickers pack vector style, highly detailed, high resolution, no margins`;
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(promptEng)}?width=512&height=512&nologo=true&seed=${Math.floor(Math.random() * 100000)}`;

      // Preload image
      await new Promise((resolve) => {
        const img = new Image()
        img.onload = () => {
          const id = `ai-sticker-${Date.now()}`
          setElements(p => [
            ...p,
            { id, type: 'image', src: url, size: 25, rotation: 0, x: 50, y: 50, opacity: 100, zIndex: 15 }
          ])
          posRefs.current[id] = { x: 50, y: 50 }
          setSelected(id)
          resolve()
        }
        img.onerror = () => resolve()
        img.src = url
      })
      setAiStickerPrompt('')
    } catch (err) {
      console.error('Sticker generation error:', err)
    } finally {
      setIsGenSticker(false)
    }
  }

  const downloadCover = async () => {
    const h2c = await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js', 'html2canvas')
    h2c(coverRef.current, { scale: 3, useCORS: true, backgroundColor: design.bgColor }).then(c => {
      const a = document.createElement('a'); a.download = 'PrintPro_Cover.png'; a.href = c.toDataURL('image/png'); a.click()
      addHistoryItem({ type: 'cover', name: lang === 'ar' ? 'غلاف مذكرة' : 'Cover Design', thumb: c.toDataURL('image/jpeg', .1) })
    })
  }

  const COLOR_TEXT = {
    indigo: 'text-indigo-400',
    emerald: 'text-emerald-400',
    rose: 'text-rose-400',
    amber: 'text-amber-400',
  }

  const AccordionSection = ({ id, label, icon: Icon, color, children }) => {
    const active = activeSection === id
    return (
      <div className="border-b border-white/5">
        <button
          onClick={() => setActiveSection(active ? '' : id)}
          className={`w-full flex items-center justify-between p-4 font-bold transition-colors text-sm
            ${active ? `${COLOR_TEXT[color]} bg-white/[0.01]` : 'text-slate-400 hover:text-white hover:bg-white/[0.01]'}`}
        >
          <span className="flex items-center gap-2.5">
            <Icon size={16} />
            <span>{label}</span>
          </span>
          <ChevronDown size={14} className={`transition-transform duration-200 ${active ? 'rotate-180' : ''}`} />
        </button>
        {active && (
          <div className="p-4 bg-[#0a0a0d]/40 space-y-4 border-t border-white/5 fu">
            {children}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col md:flex-row h-full overflow-hidden"
      onPointerMove={onDragMove} onPointerUp={onDragEnd} onPointerLeave={onDragEnd}
      onTouchMove={onDragMove} onTouchEnd={onDragEnd}>

      {/* Preview Container */}
      <div className="h-[38vh] md:h-full flex-shrink-0 md:flex-1 bg-black flex items-center justify-center p-3 md:p-6 touch-none relative border-b md:border-b-0 border-white/5">
        <div className="h-full aspect-[1/1.414] relative">
          <div id="cover-print" ref={coverRef} className="w-full h-full overflow-hidden relative shadow-2xl"
            style={{ backgroundColor: design.bgColor, color: design.textColor, fontFamily: `"${design.fontFamily}",sans-serif` }}
            onClick={() => setSelected(null)}>
            {design.bgImage && (
              <img src={design.bgImage} alt="" className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
            )}
            <CoverFrame borderColor={design.borderColor} frameStyle={design.frameStyle} />
            {[...elements].sort((a, b) => a.zIndex - b.zIndex).map(el => {
              const isSel = selected === el.id
              const isEditing = editingTextId === el.id
              const base = {
                position: 'absolute',
                left: `${el.x}%`,
                top: `${el.y}%`,
                transform: `translate(-50%,-50%) rotate(${el.rotation}deg)`,
                opacity: el.opacity / 100,
                zIndex: el.zIndex,
                cursor: isEditing ? 'text' : 'move',
                userSelect: 'none'
              }
              if (el.type === 'image') {
                return (
                  <img
                    key={el.id}
                    id={el.id}
                    ref={r => elRefs.current[el.id] = r}
                    src={el.src}
                    alt=""
                    draggable={false}
                    onPointerDown={onDragStart(el.id)}
                    className={isSel ? 'outline outline-2 outline-indigo-400' : ''}
                    style={{ ...base, width: `${el.size}%` }}
                  />
                )
              }
              return (
                <div
                  key={el.id}
                  id={`edit-input-${el.id}`}
                  ref={r => elRefs.current[el.id] = r}
                  onPointerDown={isEditing ? undefined : onDragStart(el.id)}
                  onClick={e => handleTextClick(e, el)}
                  onDoubleClick={e => { e.stopPropagation(); setEditingTextId(el.id); setSelected(el.id); }}
                  contentEditable={isEditing}
                  suppressContentEditableWarning={true}
                  onInput={e => updateEl(el.id, 'text', e.target.innerText)}
                  onBlur={() => setEditingTextId(null)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      e.target.blur()
                    }
                  }}
                  className={`font-black text-center px-1 ${
                    isSel ? 'outline outline-2 outline-indigo-400 rounded' : ''
                  }`}
                  style={{
                    ...base,
                    fontSize: `${el.size * 0.75}px`,
                    whiteSpace: 'nowrap',
                    outline: isEditing ? '2px dashed #6366f1' : undefined
                  }}
                >
                  {el.text}
                </div>
              )
            })}
          </div>
        </div>
        
        <div className="hidden md:flex absolute top-4 left-4 flex flex-col gap-2 z-30">
          <button onClick={downloadCover} className="w-11 h-11 rounded-full bg-blue-600 shadow-lg flex items-center justify-center active:scale-95 transition-transform"><Download size={18} className="text-white" /></button>
          <button onClick={() => window.print()} className="w-11 h-11 rounded-full bg-emerald-600 shadow-lg flex items-center justify-center active:scale-95 transition-transform"><Printer size={18} className="text-white" /></button>
        </div>

        {showAI && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 fu">
            <div className="bg-[#18181b] border border-indigo-500/30 rounded-3xl p-5 w-full max-w-sm shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-indigo-500/20 rounded-full flex items-center justify-center"><Bot size={18} className="text-indigo-400" /></div>
                <h3 className="font-black text-white">{lang === 'ar' ? 'تصميم الغلاف بالذكاء الاصطناعي' : 'AI Cover Designer'}</h3>
                <button onClick={() => setShowAI(false)} className="mr-auto p-1 hover:bg-white/10 rounded-full text-slate-400"><X size={15} /></button>
              </div>
              {[{ k: 'subject', ph: lang === 'ar' ? 'المادة (ضروري)' : 'Subject (Required)' }, { k: 'grade', ph: lang === 'ar' ? 'الصف الدراسي' : 'Grade' }, { k: 'teacher', ph: lang === 'ar' ? 'اسم المعلم' : 'Teacher' }].map(({ k, ph }) => (
                <input key={k} type="text" placeholder={ph} value={aiForm[k]} onChange={e => setAiForm(p => ({ ...p, [k]: e.target.value }))}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-bold outline-none focus:border-indigo-500 mb-3 transition-colors" />
              ))}
              <label className="flex items-center gap-3 bg-black/30 border border-white/5 rounded-xl px-3 py-2.5 cursor-pointer mb-4 hover:bg-black/50 transition-colors">
                <input
                  type="checkbox"
                  checked={genBg}
                  onChange={e => setGenBg(e.target.checked)}
                  className="w-4 h-4 accent-indigo-500"
                />
                <span className="text-xs font-bold text-slate-300">{lang === 'ar' ? 'توليد صورة خلفية ذكية للمادة' : 'Generate Smart Background Image'}</span>
              </label>
              <button onClick={handleAI} disabled={isAI || !aiForm.subject}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-all">
                {isAI ? <><Loader2 size={17} className="animate-spin" />{lang === 'ar' ? 'جاري التصميم…' : 'Designing…'}</> : <><Sparkles size={17} />{lang === 'ar' ? 'توليد وتصميم الغلاف' : 'Generate Cover'}</>}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Control Panel */}
      <div className="flex-1 md:flex-none h-full bg-[#131317] flex flex-col md:w-80 lg:w-96 rounded-t-3xl md:rounded-none shadow-2xl z-10 overflow-hidden">
        <input type="file" accept="image/*" ref={imgInputRef} onChange={addImage} className="hidden" />
        
        <div className="flex-1 sc overflow-y-auto">
          {selected ? (
            /* Contextual Edit Panel for Selected Element */
            <div className="flex flex-col fu">
              <div className="flex items-center justify-between p-4 border-b border-white/5 bg-indigo-500/10">
                <span className="text-xs font-black text-indigo-300 flex items-center gap-2">
                  <Sparkles size={14} />
                  {lang === 'ar' ? 'تعديل العنصر المحدد' : 'Edit Selected Element'}
                </span>
                <button onClick={() => setSelected(null)} className="p-1 hover:bg-white/10 rounded-full text-slate-400 hover:text-white">
                  <X size={15} />
                </button>
              </div>
              
              <div className="p-4 space-y-4">
                {(() => {
                  const el = elements.find(e => e.id === selected)
                  if (!el) return null
                  return (
                    <div className="space-y-4 fu">
                      {el.type === 'text' && (
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-400">
                            {lang === 'ar' ? 'محتوى النص:' : 'Text Content:'}
                          </label>
                          <textarea
                            value={el.text}
                            onChange={e => updateEl(el.id, 'text', e.target.value)}
                            dir="auto"
                            rows={2}
                            className="w-full bg-black/40 border border-white/10 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-xs font-bold text-white outline-none transition-colors resize-none"
                          />
                        </div>
                      )}
                      
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-400">
                            {lang === 'ar' ? 'الحجم:' : 'Size:'}
                          </span>
                          <span className="text-xs font-bold text-indigo-400">{el.size}%</span>
                        </div>
                        <input
                          type="range"
                          min={el.type === 'text' ? 10 : 5}
                          max={el.type === 'text' ? 120 : 100}
                          value={el.size}
                          onChange={e => updateEl(el.id, 'size', Number(e.target.value))}
                          className="w-full h-1.5 accent-indigo-500"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-400">
                            {lang === 'ar' ? 'الشفافية:' : 'Opacity:'}
                          </span>
                          <span className="text-xs font-bold text-indigo-400">{el.opacity || 100}%</span>
                        </div>
                        <input
                          type="range"
                          min={10}
                          max={100}
                          value={el.opacity || 100}
                          onChange={e => updateEl(el.id, 'opacity', Number(e.target.value))}
                          className="w-full h-1.5 accent-indigo-500"
                        />
                      </div>
                      
                      <div className="pt-3 border-t border-white/5 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                            <Layers size={13} />
                            {lang === 'ar' ? 'ترتيب الطبقات:' : 'Layers Order:'}
                          </span>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => changeZ(el.id, -1)}
                              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-xs font-bold text-slate-300 transition-colors"
                            >
                              {lang === 'ar' ? 'للخلف' : 'Send Back'}
                            </button>
                            <button
                              onClick={() => changeZ(el.id, 1)}
                              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-xs font-bold text-slate-300 transition-colors"
                            >
                              {lang === 'ar' ? 'للأمام' : 'Bring Front'}
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      <div className="pt-4 border-t border-white/5">
                        <button
                          onClick={() => removeEl(el.id)}
                          className="w-full py-3 bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 text-red-400 font-bold rounded-xl flex items-center justify-center gap-2 text-xs transition-colors"
                        >
                          <Trash2 size={14} />
                          {lang === 'ar' ? 'حذف العنصر' : 'Delete Element'}
                        </button>
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>
          ) : (
            /* Normal Accordion Menu when nothing is selected */
            <div className="flex flex-col">
              {/* Section 1: Add Elements */}
              <AccordionSection
                id="add"
                label={lang === 'ar' ? 'إضافة عناصر وتصاميم' : 'Add Elements & AI'}
                icon={Type}
                color="indigo"
              >
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={addText} className="flex items-center justify-center gap-1 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-slate-300"><Type size={13} />{lang === 'ar' ? 'نص' : 'Text'}</button>
                  <button onClick={() => imgInputRef.current.click()} className="flex items-center justify-center gap-1 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-slate-300"><ImagePlus size={13} />{lang === 'ar' ? 'صورة' : 'Image'}</button>
                  <button onClick={() => setShowAI(true)} className="flex items-center justify-center gap-1 py-2.5 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 rounded-xl text-xs font-bold text-indigo-400"><Sparkles size={13} />AI</button>
                </div>

                <div className="bg-white/5 border border-white/5 rounded-2xl p-3 space-y-2.5 mt-2">
                  <p className="text-[11px] font-bold text-indigo-400 flex items-center gap-1">
                    <Sparkles size={12} /> {lang === 'ar' ? 'توليد رسومات ملصقة بالذكاء الاصطناعي' : 'Generate AI Stickers'}
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={aiStickerPrompt}
                      onChange={e => setAiStickerPrompt(e.target.value)}
                      placeholder={lang === 'ar' ? 'مثال: صاروخ كرتوني، كتاب ذهبي...' : 'e.g. Cartoon rocket, gold book...'}
                      className="flex-1 bg-black/40 border border-white/5 rounded-xl px-3 py-2 text-white text-xs font-bold outline-none focus:border-indigo-500 transition-colors"
                    />
                    <button
                      onClick={generateSticker}
                      disabled={isGenSticker || !aiStickerPrompt}
                      className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1 active:scale-95 transition-all"
                    >
                      {isGenSticker ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                    </button>
                  </div>
                </div>
              </AccordionSection>

              {/* Section 2: Fonts & Frames */}
              <AccordionSection
                id="styles"
                label={lang === 'ar' ? 'الخطوط والإطارات الخارجية' : 'Fonts & Borders'}
                icon={LayoutTemplate}
                color="emerald"
              >
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-bold text-slate-400 mb-2">{lang === 'ar' ? 'خط العنوان العام:' : 'Global Font family:'}</p>
                    <div className="flex nx gap-2 pb-1">
                      {FONTS.map(f => (
                        <button
                          key={f}
                          onClick={() => setDesign(p => ({ ...p, fontFamily: f }))}
                          className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                            design.fontFamily === f
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-white/5 text-slate-400 border-white/5 hover:border-white/20'
                          }`}
                          style={{ fontFamily: f }}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-bold text-indigo-400 mb-2">{lang === 'ar' ? 'نمط الإطار الزخرفي:' : 'Decorative Frame Style:'}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {FRAMES.map(fr => (
                        <button
                          key={fr.id}
                          onClick={() => setDesign(p => ({ ...p, frameStyle: fr.id }))}
                          className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all border text-center ${
                            design.frameStyle === fr.id
                              ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                              : 'bg-white/5 text-slate-400 border-white/5 hover:border-white/15'
                          }`}
                        >
                          {fr.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </AccordionSection>

              {/* Section 3: Colors & Backdrops */}
              <AccordionSection
                id="colors"
                label={lang === 'ar' ? 'الألوان وخلفيات التصميم' : 'Colors & Backdrops'}
                icon={Palette}
                color="rose"
              >
                <div className="space-y-3">
                  {[{ k: 'bgColor', label: lang === 'ar' ? 'لون الخلفية' : 'Background Color' }, { k: 'borderColor', label: lang === 'ar' ? 'لون الأشكال' : 'Shape Color' }, { k: 'textColor', label: lang === 'ar' ? 'لون النصوص' : 'Text Color' }].map(({ k, label }) => (
                    <div key={k} className="flex items-center justify-between bg-white/5 border border-white/5 rounded-2xl px-4 py-2.5">
                      <span className="text-xs font-bold text-slate-300">{label}</span>
                      <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white/20 shadow-lg" style={{ backgroundColor: design[k] }}>
                        <input type="color" value={design[k]} onChange={e => setDesign(p => ({ ...p, [k]: e.target.value }))} className="w-full h-full opacity-0 cursor-pointer" />
                      </div>
                    </div>
                  ))}

                  {design.bgImage && (
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-3 flex flex-col gap-2.5 mt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-400">{lang === 'ar' ? 'صورة الخلفية التوليدية' : 'Generative Background'}</span>
                        <button
                          onClick={() => setDesign(p => ({ ...p, bgImage: '' }))}
                          className="text-[10px] text-red-400 hover:text-red-300 font-bold flex items-center gap-1"
                        >
                          <Trash2 size={11} /> {lang === 'ar' ? 'إزالة الخلفية' : 'Remove Backdrop'}
                        </button>
                      </div>
                      <img
                        src={design.bgImage}
                        alt="AI background preview"
                        className="w-full h-24 object-cover rounded-xl border border-white/10"
                      />
                    </div>
                  )}
                </div>
              </AccordionSection>

              {/* Section 4: Ready Stickers */}
              <AccordionSection
                id="stickers"
                label={lang === 'ar' ? 'ملصقات جاهزة سريعة' : 'Ready Stickers Grid'}
                icon={Sparkles}
                color="amber"
              >
                <p className="text-[10px] text-slate-500 font-bold mb-3">{lang === 'ar' ? 'اضغط لإضافة أي ملصق سريع لغلافك' : 'Tap to place sticker on the cover'}</p>
                <div className="grid grid-cols-5 gap-2">
                  {STICKERS.map(s => (
                    <button
                      key={s}
                      onClick={() => addSticker(s)}
                      className="text-xl p-2 bg-white/5 hover:bg-white/15 border border-white/5 rounded-xl active:scale-90 transition-all text-center"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </AccordionSection>
            </div>
          )}
        </div>

        {/* Fixed footer */}
        <div className="flex gap-3 p-3 md:p-4 border-t border-white/5 bg-[#131317]">
          <button onClick={downloadCover} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-sm active:scale-95 transition-all"><Download size={15} />{lang === 'ar' ? 'تحميل' : 'Download'}</button>
          <button onClick={() => window.print()} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-sm active:scale-95 transition-all"><Printer size={15} />{lang === 'ar' ? 'طباعة' : 'Print'}</button>
        </div>
      </div>
    </div>
  )
}
