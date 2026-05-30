import { useState, useRef } from 'react'
import {
  Upload, FileText, FileArchive, FilePlus2, SplitSquareHorizontal,
  FileEdit, RefreshCcw, Loader2, CheckCircle2, AlertTriangle,
  X, Hash, Stamp, ChevronDown,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { loadScript, CDN } from '../utils/scriptLoader'

export default function FileConverter() {
  const { addHistoryItem, lang } = useApp()
  const [mode, setMode] = useState('convert')
  const [files, setFiles] = useState([])
  const [targetFmt, setTargetFmt] = useState('docx')
  const [splitRange, setSplitRange] = useState('1-5')
  const [state, setState] = useState('idle')
  const [progress, setProgress] = useState('')
  const [progressNum, setProgressNum] = useState(0)
  
  // PDF Edit settings
  const [pageNumEnabled, setPageNumEnabled] = useState(true)
  const [pageNumPos, setPageNumPos] = useState('bottom-center')
  const [pageNumSize, setPageNumSize] = useState(18)
  const [pageNumStart, setPageNumStart] = useState(1)
  const [stampEnabled, setStampEnabled] = useState(false)
  const [stampText, setStampText] = useState('')
  const [stampOpacity, setStampOpacity] = useState(20)

  // PDF Encryption settings
  const [pdfPassword, setPdfPassword] = useState('')
  const [pdfEncrypt, setPdfEncrypt]   = useState(false)

  // Accordion active section ('task' | 'upload' | 'options')
  const [activeSection, setActiveSection] = useState('task')
  const [errorMsg, setErrorMsg] = useState('')
  const [isBusy, setIsBusy] = useState(false)

  const fileRef = useRef(null)
  const addRef = useRef(null)

  const onFiles = (e, append = false) => {
    setErrorMsg('')
    const arr = Array.from(e.target.files); if (!arr.length) return;
    if (append) {
      setFiles(p => [...p, ...arr])
    } else {
      setFiles(arr)
      const name = arr[0].name.toLowerCase()
      if (name.endsWith('.pdf')) {
        setTargetFmt('docx')
      } else if (name.match(/\.xlsx?$/i)) {
        setTargetFmt('pdf')
      } else if (name.endsWith('.docx')) {
        setTargetFmt('pdf')
      } else if (name.match(/\.(png|jpe?g|webp)$/i)) {
        setTargetFmt('pdf')
      } else {
        setTargetFmt('pdf')
      }
    }
    setState('idle')
    setProgress('')
    setProgressNum(0)
    e.target.value = ''
    
    // Automatically transition to the settings & options section
    setActiveSection('options')
  }

  const selectMode = (newMode) => {
    setErrorMsg('')
    setMode(newMode)
    setFiles([])
    setState('idle')
    setProgress('')
    setProgressNum(0)
    // Automatically transition to upload section
    setActiveSection('upload')
  }

  const startTask = async () => {
    setErrorMsg('')
    if (!files.length) return;
    setState('processing')
    setProgress('')
    setProgressNum(10)
    
    try {
      if (mode === 'merge') {
        setProgress(lang === 'ar' ? 'دمج ملفات PDF…' : 'Merging PDF files…')
        const { PDFDocument } = await loadScript(CDN.pdfLib || 'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js', 'PDFLib')
        const merged = await PDFDocument.create()
        for (let i = 0; i < files.length; i++) {
          setProgress(lang === 'ar' ? `دمج ${i + 1}/${files.length}…` : `Merging ${i + 1}/${files.length}…`)
          setProgressNum(Math.round(((i + 1) / files.length) * 100))
          
          const pdf = await PDFDocument.load(await files[i].arrayBuffer())
          const pages = await merged.copyPages(pdf, pdf.getPageIndices())
          pages.forEach(p => merged.addPage(p))
        }
        const blob = new Blob([await merged.save()], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a'); a.href = url; a.download = 'PrintPro_Merged.pdf'; a.click(); URL.revokeObjectURL(url)
        addHistoryItem({ type: 'merge', name: lang === 'ar' ? `دمج ${files.length} ملفات` : `Merged ${files.length} files`, thumb: null })
        setState('done')
        setProgressNum(100)
        
      } else if (mode === 'split') {
        // [تم الإصلاح]: فحص النطاق لمنع الشاشة البيضاء والانهيار
        if (!/^\d+(?:\s*-\s*\d+)?$/.test(splitRange.trim())) {
          throw new Error(lang === 'ar' ? 'صيغة النطاق غير صحيحة. استخدم أرقاماً مثل 1-5 أو 3' : 'Invalid range format. Use e.g., 1-5 or 3');
        }
        
        setProgress(lang === 'ar' ? 'تقسيم PDF…' : 'Splitting PDF…')
        setProgressNum(30)
        const { PDFDocument } = await loadScript(CDN.pdfLib || 'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js', 'PDFLib')
        const pdf = await PDFDocument.load(await files[0].arrayBuffer())
        const parts = splitRange.split('-').map(n => parseInt(n.trim()) - 1)
        let [start, end] = [Math.max(0, parts[0] || 0), Math.min(pdf.getPageCount() - 1, parts[1] ?? parts[0] ?? 0)]
        setProgressNum(60)
        const newPdf = await PDFDocument.create()
        const copied = await newPdf.copyPages(pdf, Array.from({ length: end - start + 1 }, (_, i) => i + start))
        copied.forEach(p => newPdf.addPage(p))
        const blob = new Blob([await newPdf.save()], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a'); a.href = url; a.download = `PrintPro_p${start + 1}-${end + 1}.pdf`; a.click(); URL.revokeObjectURL(url)
        addHistoryItem({ type: 'split', name: lang === 'ar' ? `صفحات ${start + 1}-${end + 1}` : `Pages ${start + 1}-${end + 1}`, thumb: null })
        setState('done')
        setProgressNum(100)
        
      } else if (mode === 'edit') {
        setProgress(lang === 'ar' ? 'تحميل مكتبة PDF-lib والخطوط…' : 'Loading PDF-lib & Fonts…')
        setProgressNum(20)
        
        const { PDFDocument, rgb } = await loadScript(CDN.pdfLib || 'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js', 'PDFLib')
        
        // [تم الإصلاح]: جلب الخط العربي لكي لا تظهر النصوص كمربعات
        await loadScript('https://unpkg.com/@pdf-lib/fontkit@0.0.4/dist/fontkit.umd.js', 'fontkit')
        const pdf = await PDFDocument.load(await files[0].arrayBuffer())
        pdf.registerFontkit(window.fontkit)
        
        const fontUrl = 'https://fonts.gstatic.com/s/cairo/v28/SLXVc1nY6HkvangtZmpcWmhz.ttf';
        const fontBytes = await fetch(fontUrl).then(res => res.arrayBuffer());
        const font = await pdf.embedFont(fontBytes);
        
        const pages = pdf.getPages()
        
        pages.forEach((page, idx) => {
          setProgressNum(Math.round(((idx + 1) / pages.length) * 80))
          const { width, height } = page.getSize()
          if (pageNumEnabled) {
            const num = `${pageNumStart + idx}`;
            const fs = pageNumSize; const tw = font.widthOfTextAtSize(num, fs);
            let x = width / 2 - tw / 2, y = 20;
            if (pageNumPos === 'bottom-right') { x = width - tw - 20; }
            else if (pageNumPos === 'bottom-left') { x = 20; }
            else if (pageNumPos === 'top-center') { y = height - 20 - fs; }
            page.drawText(num, { x, y, size: fs, font, color: rgb(.15, .15, .15), opacity: .85 })
          }
          if (stampEnabled && stampText) {
            const fs2 = Math.max(18, width / 20)
            const tw2 = font.widthOfTextAtSize(stampText, fs2)
            page.drawText(stampText, { x: width / 2 - tw2 / 2, y: height / 2 - fs2 / 2, size: fs2, font, color: rgb(.5, .5, .5), opacity: stampOpacity / 100, rotate: { type: 'degrees', angle: 45 } })
          }
        })
        
        setProgress(lang === 'ar' ? 'جاري الحفظ…' : 'Saving…')
        setProgressNum(90)
        
        const pdfBytesOut = pdfEncrypt && pdfPassword
          ? await pdf.save({
              userPassword:  pdfPassword,
              ownerPassword: pdfPassword + '_owner',
              permissions: {
                printing:          'lowResolution',
                modifying:         false,
                copying:           false,
                annotating:        false,
                fillingForms:      false,
                contentAccessibility: true,
                documentAssembly:  false,
              },
            })
          : await pdf.save()

        const blob = new Blob([pdfBytesOut], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a'); a.href = url; a.download = 'PrintPro_Edited.pdf'; a.click(); URL.revokeObjectURL(url)
        addHistoryItem({ type: 'edit', name: lang === 'ar' ? 'تحرير PDF' : 'Edit PDF', thumb: null })
        setState('done')
        setProgressNum(100)
        
      } else {
        // Convert Mode
        const file = files[0]
        const ext = file.name.split('.').pop().toLowerCase()
        
        if (ext === 'pdf') {
          if (targetFmt === 'zip') {
            setProgress(lang === 'ar' ? 'تحميل PDF.js و JSZip…' : 'Loading PDF.js and JSZip…')
            setProgressNum(20)
            const JSZip = await loadScript(CDN.jsZip || 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js', 'JSZip')
            const pdfjsLib = await loadScript(CDN.pdfJs || 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js', 'pdfjsLib')
            pdfjsLib.GlobalWorkerOptions.workerSrc = CDN.pdfJsWorker || 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
            const pdfDoc = await pdfjsLib.getDocument(await file.arrayBuffer()).promise
            const zip = new JSZip(); const folder = zip.folder('pages')
            
            for (let i = 1; i <= pdfDoc.numPages; i++) {
              setProgress(lang === 'ar' ? `رسم صفحة ${i}/${pdfDoc.numPages}…` : `Rendering page ${i}/${pdfDoc.numPages}…`)
              setProgressNum(Math.round((i / pdfDoc.numPages) * 100))
              // [تم الإصلاح]: تقليل مقياس الدقة لمنع انهيار الرامات
              const page = await pdfDoc.getPage(i); const vp = page.getViewport({ scale: 1.5 })
              const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height
              await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise
              folder.file(`page_${String(i).padStart(3, '0')}.jpg`, await new Promise(r => c.toBlob(r, 'image/jpeg', .95)))
            }
            const zipBlob = await zip.generateAsync({ type: 'blob' }, m => {
              setProgress(lang === 'ar' ? `ضغط ${Math.round(m.percent)}%…` : `Compressing ${Math.round(m.percent)}%…`)
              setProgressNum(Math.round(m.percent))
            })
            const url = URL.createObjectURL(zipBlob)
            const a = document.createElement('a'); a.href = url; a.download = `${file.name.replace('.pdf', '')}_images.zip`; a.click(); URL.revokeObjectURL(url)
            addHistoryItem({ type: 'convert', name: lang === 'ar' ? `${file.name} ← صور` : `${file.name} ➜ Images`, thumb: null })
            setState('done')
            setProgressNum(100)
            
          } else if (targetFmt === 'docx' || targetFmt === 'txt') {
            setProgress(lang === 'ar' ? 'تحميل مكتبة PDF.js…' : 'Loading PDF.js…')
            setProgressNum(20)
            const pdfjsLib = await loadScript(CDN.pdfJs || 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js', 'pdfjsLib')
            pdfjsLib.GlobalWorkerOptions.workerSrc = CDN.pdfJsWorker || 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
            
            const pdfDoc = await pdfjsLib.getDocument(await file.arrayBuffer()).promise
            let pagesTextHtml = ''
            let plainText = ''
            
            for (let i = 1; i <= pdfDoc.numPages; i++) {
              setProgress(lang === 'ar' ? `استخراج النص صفحة ${i}/${pdfDoc.numPages}…` : `Extracting text page ${i}/${pdfDoc.numPages}…`)
              setProgressNum(Math.round((i / pdfDoc.numPages) * 100))
              const page = await pdfDoc.getPage(i)
              const textContent = await page.getTextContent()
              
              const items = textContent.items.sort((a, b) => {
                if (Math.abs(a.transform[5] - b.transform[5]) < 5) {
                  return a.transform[4] - b.transform[4]
                }
                return b.transform[5] - a.transform[5]
              })
              
              let lastY = null
              let lastX = null
              let pageHtml = `<div class="page" style="page-break-after: always; padding: 20px;">`
              let lineText = ''
              let pageText = ''
              
              // [تم الإصلاح]: إضافة المسافات بين الكلمات لعدم التصاقها
              for (const item of items) {
                if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
                  if (lineText.trim()) {
                    pageHtml += `<p style="margin: 0 0 10px 0; font-family: Arial, sans-serif; font-size: 12pt;">${lineText}</p>`
                    pageText += lineText + '\n'
                  }
                  lineText = ''
                  lastX = null
                } else if (lastX !== null && Math.abs(item.transform[4] - lastX) > 4) {
                  lineText += ' '
                }
                lineText += item.str
                lastY = item.transform[5]
                lastX = item.transform[4] + (item.width || 0)
              }
              
              if (lineText.trim()) {
                pageHtml += `<p style="margin: 0 0 10px 0; font-family: Arial, sans-serif; font-size: 12pt;">${lineText}</p>`
                pageText += lineText + '\n'
              }
              
              pageHtml += `</div>`
              pagesTextHtml += pageHtml
              plainText += pageText + '\n\n'
            }
            
            if (targetFmt === 'docx') {
              const hasArabic = /[\u0600-\u06FF]/.test(plainText)
              const dir = hasArabic ? 'rtl' : 'ltr'
              const align = hasArabic ? 'right' : 'left'
              
              const docHtml = `
              <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
              <head>
              <meta charset="utf-8">
              <title>${file.name.replace(/\.pdf$/i, '')}</title>
              <style>
                body { font-family: 'Arial', sans-serif; direction: ${dir}; text-align: ${align}; }
                p { margin: 0 0 10px 0; }
              </style>
              </head>
              <body>
                ${pagesTextHtml}
              </body>
              </html>
              `
              const blob = new Blob([docHtml], { type: 'application/msword;charset=utf-8' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `${file.name.replace(/\.pdf$/i, '')}.docx`
              a.click()
              URL.revokeObjectURL(url)
              addHistoryItem({ type: 'convert', name: lang === 'ar' ? `${file.name} ← Word` : `${file.name} ➜ Word`, thumb: null })
            } else {
              const blob = new Blob([plainText], { type: 'text/plain;charset=utf-8' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `${file.name.replace(/\.pdf$/i, '')}.txt`
              a.click()
              URL.revokeObjectURL(url)
              addHistoryItem({ type: 'convert', name: lang === 'ar' ? `${file.name} ← نص` : `${file.name} ➜ Text`, thumb: null })
            }
            setState('done')
            setProgressNum(100)
          }
        } else if (ext === 'docx') {
          setProgress(lang === 'ar' ? 'تحميل مكتبة Mammoth.js…' : 'Loading Mammoth.js…')
          setProgressNum(20)
          const mammoth = await loadScript('https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js', 'mammoth')
          const { jsPDF } = await loadScript(CDN.jsPDF, 'jspdf')
          await loadScript(CDN.html2canvas, 'html2canvas')
          
          setProgressNum(40)
          const arrayBuffer = await file.arrayBuffer()
          const result = await mammoth.convertToHtml({ arrayBuffer })
          const html = result.value || ''
          
          if (!html.trim()) {
            throw new Error(lang === 'ar' ? 'ملف Word فارغ أو غير مدعوم' : 'Word file is empty or unsupported')
          }
          
          setProgress(lang === 'ar' ? 'جاري التحويل لـ PDF…' : 'Converting to PDF…')
          setProgressNum(60)
          const tempDiv = document.createElement('div')
          tempDiv.style.width = '595px'
          tempDiv.style.padding = '40px'
          tempDiv.style.color = '#000000'
          tempDiv.style.backgroundColor = '#ffffff'
          tempDiv.style.fontFamily = 'system-ui, -apple-system, sans-serif'
          tempDiv.style.fontSize = '12px'
          tempDiv.style.lineHeight = '1.5'
          
          const hasArabic = /[\u0600-\u06FF]/.test(html)
          tempDiv.style.direction = hasArabic ? 'rtl' : 'ltr'
          tempDiv.style.textAlign = hasArabic ? 'right' : 'left'
          tempDiv.innerHTML = html
          document.body.appendChild(tempDiv)
          
          const pdf = new jsPDF({
            orientation: 'p',
            unit: 'pt',
            format: 'a4',
          })
          
          setProgressNum(80)
          await new Promise((resolve, reject) => {
            pdf.html(tempDiv, {
              x: 0,
              y: 0,
              width: 595,
              windowWidth: 595,
              callback: function (doc) {
                doc.save(`PrintPro_${file.name.replace(/\.docx?/i, '')}.pdf`)
                document.body.removeChild(tempDiv)
                resolve()
              },
              autoPaging: 'text',
            })
          })
          
          addHistoryItem({ type: 'convert', name: lang === 'ar' ? `${file.name} ← PDF` : `${file.name} ➜ PDF`, thumb: null })
          setState('done')
          setProgressNum(100)
        } else if (ext === 'xlsx' || ext === 'xls') {
          setProgress(lang === 'ar' ? 'معالجة Excel…' : 'Processing Excel…')
          setProgressNum(30)
          const XLSX = await loadScript(CDN.xlsx || 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js', 'XLSX')
          const { jsPDF } = await loadScript(CDN.jsPDF || 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', 'jspdf')
          await loadScript(CDN.jsPDFTable || 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.25/jspdf.plugin.autotable.min.js', 'jsPDFAutoTable')
          
          setProgressNum(60)
          const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' })
          const json = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 })
          const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
          pdf.autoTable({ head: [json[0]?.map(String) || []], body: json.slice(1).map(r => r.map(String)), styles: { fontSize: 9 }, headStyles: { fillColor: [79, 70, 229] }, margin: { top: 30 } })
          pdf.save(`PrintPro_${file.name.replace(/\.xlsx?/i, '')}.pdf`)
          addHistoryItem({ type: 'convert', name: lang === 'ar' ? `${file.name} ← PDF` : `${file.name} ➜ PDF`, thumb: null })
          setState('done')
          setProgressNum(100)
        } else if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
          setProgress(lang === 'ar' ? 'تحميل مكتبة PDF…' : 'Loading PDF Library…')
          setProgressNum(20)
          const { jsPDF } = await loadScript(CDN.jsPDF || 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', 'jspdf')
          let pdf = null
          
          for (let i = 0; i < files.length; i++) {
            setProgress(lang === 'ar' ? `إضافة صورة ${i + 1}/${files.length}…` : `Adding image ${i + 1}/${files.length}…`)
            setProgressNum(Math.round(((i + 1) / files.length) * 100))
            const file = files[i]
            const imgData = await new Promise((resolve) => {
              const reader = new FileReader()
              reader.onload = (e) => resolve(e.target.result)
              reader.readAsDataURL(file)
            })
            
            const img = await new Promise((resolve) => {
              const im = new Image()
              im.onload = () => resolve(im)
              im.src = imgData
            })
            
            const w = img.naturalWidth
            const h = img.naturalHeight
            
            if (i === 0) {
              pdf = new jsPDF({
                orientation: w > h ? 'l' : 'p',
                unit: 'pt',
                format: [w, h]
              })
            } else {
              pdf.addPage([w, h], w > h ? 'l' : 'p')
            }
            
            pdf.addImage(imgData, 'JPEG', 0, 0, w, h)
          }
          
          if (pdf) {
            pdf.save('PrintPro_Images.pdf')
          }
          addHistoryItem({ type: 'convert', name: lang === 'ar' ? `دمج ${files.length} صور ← PDF` : `Merged ${files.length} images ➜ PDF`, thumb: null })
          setState('done')
          setProgressNum(100)
        } else {
          setProgress(lang === 'ar' ? 'صيغة غير مدعومة حالياً' : 'Unsupported format currently')
          setProgressNum(0)
          setTimeout(() => setState('idle'), 2000)
        }
      }
    } catch (e) {
      console.error(e)
      const msg = lang === 'ar'
        ? 'حدث خطأ أثناء المعالجة. تأكد من صحة الملف أو النطاق.'
        : 'An error occurred. Please check the file or range.'
      setErrorMsg(msg)
      setState('idle')
      setProgressNum(0)
    } finally {
      setIsBusy(false)
    }
  }

  const MODES = [
    {
      id: 'convert',
      label: lang === 'ar' ? 'محوّل الصيغ' : 'Format Converter',
      c: 'amber',
      icon: FileArchive,
      desc: lang === 'ar' ? 'تحويل PDF إلى Word أو صور، وورد وإكسل وصور إلى PDF' : 'Convert PDF to Word/Images, Word/Excel/Images to PDF'
    },
    {
      id: 'merge',
      label: lang === 'ar' ? 'دمج PDF' : 'Merge PDF',
      c: 'indigo',
      icon: FilePlus2,
      desc: lang === 'ar' ? 'دمج عدة ملفات PDF في ملف واحد' : 'Merge multiple PDF files into one'
    },
    {
      id: 'split',
      label: lang === 'ar' ? 'تقسيم PDF' : 'Split PDF',
      c: 'emerald',
      icon: SplitSquareHorizontal,
      desc: lang === 'ar' ? 'استخراج صفحات محددة من ملف PDF' : 'Extract specific pages from a PDF'
    },
    {
      id: 'edit',
      label: lang === 'ar' ? 'تحرير PDF' : 'Edit PDF',
      c: 'rose',
      icon: FileEdit,
      desc: lang === 'ar' ? 'أضف ترقيم وتختيم مائي على جميع الصفحات' : 'Add page numbers and stamps to PDF pages'
    },
  ]
  
  const cfg = MODES.find(m => m.id === mode) || MODES[0]
  const BG = {
    amber: 'bg-amber-600',
    indigo: 'bg-indigo-600',
    emerald: 'bg-emerald-600',
    rose: 'bg-rose-600'
  }

  const COLOR_TEXT = {
    indigo: 'text-indigo-400',
    emerald: 'text-emerald-400',
    rose: 'text-rose-400',
    amber: 'text-amber-400',
  }

  const AccordionSection = ({ id, label, icon: Icon, color, children, disabled = false }) => {
    const active = activeSection === id
    return (
      <div className={`border-b border-white/5 ${disabled ? 'opacity-35' : ''}`}>
        <button
          onClick={() => {
            if (disabled) return;
            setActiveSection(active ? '' : id)
          }}
          disabled={disabled}
          className={`w-full flex items-center justify-between p-4 font-bold transition-colors text-sm
            ${active ? `${COLOR_TEXT[color]} bg-white/[0.01]` : 'text-slate-400 hover:text-white hover:bg-white/[0.01]'}`}
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
    )
  }

  return (
    <div className="flex flex-col h-full bg-[#0a0a0d] overflow-y-auto p-4 md:p-8">
      <div className="max-w-md mx-auto w-full flex-1 flex flex-col justify-center my-auto gap-4">
        {state === 'idle' && (
          <div className="bg-[#131317] border border-white/5 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
            {/* Section 1: Select Task */}
            <AccordionSection
              id="task"
              label={lang === 'ar' ? 'اختر نوع المهمة' : 'Select Task Type'}
              icon={FileEdit}
              color="indigo"
            >
              <div className="grid grid-cols-2 gap-2.5">
                {MODES.map(m => {
                  const isSelected = mode === m.id
                  const modeBg = BG[m.c]
                  return (
                    <button
                      key={m.id}
                      onClick={() => selectMode(m.id)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border text-center transition-all ${
                        isSelected
                          ? `${modeBg} border-transparent text-white shadow-lg shadow-indigo-500/10`
                          : 'bg-white/5 border-white/5 text-slate-400 hover:border-white/10 hover:text-white'
                      }`}
                    >
                      <m.icon size={20} className={isSelected ? 'text-white' : `text-${m.c}-400`} />
                      <div className="text-xs font-bold">{m.label}</div>
                      <div className="text-[10px] text-slate-500 line-clamp-2 leading-tight">
                        {m.desc}
                      </div>
                    </button>
                  )
                })}
              </div>
            </AccordionSection>

            {/* Section 2: File Upload */}
            <AccordionSection
              id="upload"
              label={lang === 'ar' ? 'رفع الملفات' : 'Upload Files'}
              icon={Upload}
              color="emerald"
            >
              <div className="space-y-4">
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.docx,.xlsx,.xls,.png,.jpg,.jpeg,.webp"
                  multiple={mode === 'merge' || (mode === 'convert' && targetFmt === 'pdf')}
                  onChange={onFiles}
                />
                <input
                  ref={addRef}
                  type="file"
                  className="hidden"
                  accept={mode === 'merge' ? '.pdf' : '.pdf,.docx,.xlsx,.xls,.png,.jpg,.jpeg,.webp'}
                  multiple
                  onChange={e => onFiles(e, true)}
                />

                {files.length === 0 ? (
                  <div
                    onClick={() => fileRef.current.click()}
                    className="border-2 border-dashed border-white/10 hover:border-emerald-500/30 bg-white/[0.02] rounded-2xl p-6 text-center cursor-pointer transition-all hover:bg-emerald-500/[0.02] group"
                  >
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                      <Upload size={20} className="text-emerald-400" />
                    </div>
                    <div className="text-sm font-bold text-slate-300">
                      {lang === 'ar' ? 'اسحب الملفات هنا أو اضغط للرفع' : 'Drag files here or click to upload'}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">
                      {mode === 'merge'
                        ? (lang === 'ar' ? 'يدعم دمج ملفات PDF' : 'Supports merging PDF files')
                        : (lang === 'ar' ? 'يدعم PDF, Word, Excel والصور' : 'Supports PDF, Word, Excel and Images')}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-black/20 border border-white/5 rounded-xl p-2.5 max-h-40 overflow-y-auto space-y-1.5 sc">
                      {files.map((f, i) => (
                        // [تم الإصلاح]: حل مشكلة الـ key لمنع مسح الملف الخطأ بصرياً
                        <div key={`${f.name}-${i}`} className="flex items-center justify-between bg-white/5 border border-white/5 rounded-lg px-3 py-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText size={14} className="text-slate-400 flex-shrink-0" />
                            <span className="text-xs font-bold text-slate-300 truncate">{f.name}</span>
                          </div>
                          <button
                            onClick={() => setFiles(p => p.filter((_, idx) => idx !== i))}
                            className="text-red-400 p-1 hover:bg-red-500/20 rounded-md transition-colors"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                    
                    {(mode === 'merge' || (mode === 'convert' && targetFmt === 'pdf')) && (
                      <button
                        onClick={() => addRef.current.click()}
                        className="w-full py-2 text-emerald-400 text-xs font-bold border border-dashed border-emerald-500/20 rounded-xl hover:bg-emerald-500/5 transition-colors"
                      >
                        {lang === 'ar' ? '+ إضافة ملفات أخرى' : '+ Add More Files'}
                      </button>
                    )}

                    <button
                      onClick={() => setFiles([])}
                      className="w-full py-2 text-slate-500 hover:text-white text-xs font-bold transition-colors"
                    >
                      {lang === 'ar' ? 'إعادة تعيين الملفات' : 'Reset Files'}
                    </button>
                  </div>
                )}
              </div>
            </AccordionSection>

            {/* Section 3: Settings & Options */}
            <AccordionSection
              id="options"
              label={lang === 'ar' ? 'الإعدادات والخيارات' : 'Settings & Options'}
              icon={Hash}
              color="rose"
              disabled={files.length === 0}
            >
              <div className="space-y-4">
                {mode === 'convert' && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400">
                      {lang === 'ar' ? 'صيغة التحويل المستهدفة:' : 'Target Conversion Format:'}
                    </label>
                    {files.length > 0 ? (
                      (() => {
                        const ext = files[0].name.split('.').pop().toLowerCase()
                        if (ext === 'pdf') {
                          return (
                            <select
                              value={targetFmt}
                              onChange={e => setTargetFmt(e.target.value)}
                              className="w-full bg-black text-white font-bold p-3 rounded-xl border border-white/10 outline-none text-sm appearance-none"
                            >
                              <option value="docx">PDF ➜ Word Document (.docx)</option>
                              <option value="txt">PDF ➜ Text File (.txt)</option>
                              <option value="zip">PDF ➜ Images ZIP (.zip)</option>
                            </select>
                          )
                        } else if (ext === 'docx') {
                          return (
                            <div className="p-3 bg-white/5 border border-white/5 rounded-xl text-center text-xs font-bold text-amber-400">
                              {lang === 'ar' ? 'تحويل Word ➜ PDF (جاهز للطباعة)' : 'Word ➜ PDF (Ready for Printing)'}
                            </div>
                          )
                        } else if (ext === 'xlsx' || ext === 'xls') {
                          return (
                            <div className="p-3 bg-white/5 border border-white/5 rounded-xl text-center text-xs font-bold text-amber-400">
                              {lang === 'ar' ? 'تحويل Excel ➜ PDF (جاهز للطباعة)' : 'Excel ➜ PDF (Ready for Printing)'}
                            </div>
                          )
                        } else if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
                          return (
                            <div className="p-3 bg-white/5 border border-white/5 rounded-xl text-center text-xs font-bold text-amber-400">
                              {lang === 'ar'
                                ? `تحويل الصور لملف PDF (سيتم دمج ${files.length} صور)`
                                : `Images ➜ PDF (Will combine ${files.length} images)`}
                            </div>
                          )
                        } else {
                          return (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-center text-xs font-bold text-red-400">
                              {lang === 'ar' ? 'صيغة الملف غير مدعومة للتحويل' : 'File format not supported for conversion'}
                            </div>
                          )
                        }
                      })()
                    ) : (
                      <div className="text-xs text-slate-500 italic">
                        {lang === 'ar' ? 'يرجى رفع ملف أولاً لتحديد خيارات الصيغ' : 'Please upload a file first to view conversion formats'}
                      </div>
                    )}
                  </div>
                )}

                {mode === 'split' && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-400">
                      {lang === 'ar' ? 'نطاق الصفحات:' : 'Page Range:'}
                    </span>
                    <div className="flex items-center gap-3 bg-black/50 border border-white/10 rounded-xl px-4 py-2.5">
                      <input
                        type="text"
                        value={splitRange}
                        onChange={e => setSplitRange(e.target.value)}
                        placeholder="e.g. 1-5"
                        className="flex-1 bg-transparent text-white font-bold text-center outline-none text-base"
                        dir="ltr"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 leading-normal">
                      {lang === 'ar'
                        ? 'حدد الصفحات التي تريد استخراجها (مثال: 1-5 أو 3)'
                        : 'Specify the pages to extract (e.g., 1-5 or 3)'}
                    </p>
                  </div>
                )}

                {mode === 'merge' && (
                  <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-center">
                    <p className="text-xs text-indigo-300 font-bold">
                      {lang === 'ar'
                        ? `سيتم دمج ${files.length} ملفات PDF معاً في ملف واحد بالترتيب.`
                        : `Will merge ${files.length} PDF files together in order.`}
                    </p>
                  </div>
                )}

                {mode === 'edit' && (
                  <div className="space-y-4">
                    {/* Page Numbers */}
                    <div className="space-y-2">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={pageNumEnabled}
                          onChange={e => setPageNumEnabled(e.target.checked)}
                          className="w-4 h-4 accent-rose-500"
                        />
                        <span className="text-sm font-bold text-white flex items-center gap-2">
                          <Hash size={14} className="text-rose-400" />
                          {lang === 'ar' ? 'ترقيم الصفحات' : 'Page Numbering'}
                        </span>
                      </label>
                      {pageNumEnabled && (
                        <div className="space-y-3 pr-6 fu">
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              ['bottom-center', lang === 'ar' ? 'أسفل وسط' : 'Bottom Center'],
                              ['bottom-right', lang === 'ar' ? 'أسفل يمين' : 'Bottom Right'],
                              ['bottom-left', lang === 'ar' ? 'أسفل يسار' : 'Bottom Left'],
                              ['top-center', lang === 'ar' ? 'أعلى وسط' : 'Top Center'],
                            ].map(([v, l]) => (
                              <button
                                key={v}
                                onClick={() => setPageNumPos(v)}
                                className={`py-2 rounded-xl text-[10px] font-bold border transition-all ${
                                  pageNumPos === v
                                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                    : 'bg-white/5 text-slate-400 border-white/5'
                                }`}
                              >
                                {l}
                              </button>
                            ))}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-slate-400 font-bold whitespace-nowrap">
                              {lang === 'ar' ? 'يبدأ من:' : 'Starts at:'}
                            </span>
                            <input
                              type="number"
                              min={1}
                              value={pageNumStart}
                              onChange={e => setPageNumStart(Number(e.target.value))}
                              className="w-14 bg-black/50 border border-white/10 rounded-lg px-2 py-1 text-white text-xs font-bold text-center outline-none"
                            />
                            <span className="text-xs text-slate-400 font-bold">
                              {lang === 'ar' ? 'حجم:' : 'Size:'}
                            </span>
                            <input
                              type="range"
                              min={10}
                              max={36}
                              value={pageNumSize}
                              onChange={e => setPageNumSize(Number(e.target.value))}
                              className="flex-1 h-1.5 accent-rose-500"
                            />
                            <span className="text-xs text-rose-400 font-bold w-6">{pageNumSize}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Watermark / Stamp */}
                    <div className="pt-3 border-t border-white/5 space-y-2">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={stampEnabled}
                          onChange={e => setStampEnabled(e.target.checked)}
                          className="w-4 h-4 accent-orange-500"
                        />
                        <span className="text-sm font-bold text-white flex items-center gap-2">
                          <Stamp size={14} className="text-orange-400" />
                          {lang === 'ar' ? 'ختم مائي على الصفحات' : 'Watermark / Stamp'}
                        </span>
                      </label>
                      {stampEnabled && (
                        <div className="space-y-3 pr-6 fu">
                          <input
                            type="text"
                            value={stampText}
                            onChange={e => setStampText(e.target.value)}
                            placeholder={lang === 'ar' ? 'مثال: مسودة، سري، اسم المركز...' : 'e.g. Draft, Confidential...'}
                            className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-orange-500 transition-colors"
                          />
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-slate-400 font-bold">
                              {lang === 'ar' ? 'الشفافية' : 'Opacity'}
                            </span>
                            <input
                              type="range"
                              min={5}
                              max={60}
                              value={stampOpacity}
                              onChange={e => setStampOpacity(Number(e.target.value))}
                              className="flex-1 h-1.5 accent-orange-500"
                            />
                            <span className="text-xs text-orange-400 font-bold w-8 text-center">{stampOpacity}%</span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* PDF Encryption */}
                    <div className="pt-3 border-t border-white/5 space-y-2">
                      <label className="flex items-center gap-2.5 bg-white/5 border border-white/5 rounded-xl px-3 py-2.5 cursor-pointer hover:bg-white/10 transition-colors">
                        <input
                          type="checkbox"
                          checked={pdfEncrypt}
                          onChange={e => setPdfEncrypt(e.target.checked)}
                          className="w-3.5 h-3.5 accent-indigo-500"
                        />
                        <span className="text-xs font-bold text-slate-300">
                          {lang === 'ar' ? 'حماية بكلمة مرور' : 'Password protect PDF'}
                        </span>
                      </label>

                      {pdfEncrypt && (
                        <input
                          type="password"
                          value={pdfPassword}
                          onChange={e => setPdfPassword(e.target.value)}
                          placeholder={lang === 'ar' ? 'أدخل كلمة المرور…' : 'Enter password…'}
                          className="w-full bg-black border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs font-bold outline-none focus:border-indigo-500 transition-colors"
                        />
                      )}
                    </div>

                  </div>
                )}

                <button
                  onClick={startTask}
                  className={`w-full ${BG[cfg.c]} text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xl mt-4`}
                >
                  <RefreshCcw size={18} />
                  {lang === 'ar' ? 'بدء المهمة' : 'Start Task'}
                </button>
              </div>
            </AccordionSection>
          </div>
        )}

        {state === 'processing' && (
          <div className="fu flex flex-col items-center text-center gap-4 py-10">
            <div className="w-20 h-20 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Loader2 size={36} className="text-indigo-400 animate-spin" />
            </div>
            <p className="text-xl font-black text-white">{lang === 'ar' ? 'جاري المعالجة…' : 'Processing…'}</p>
            {progress && (
              <div className="w-full max-w-xs space-y-2">
                <div className="w-full bg-white/5 rounded-full h-2 border border-white/5 overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                    style={{ width: `${progressNum}%` }}
                  />
                </div>
                <p className="text-sm text-slate-400 font-bold text-center">
                  {progress}
                </p>
              </div>
            )}
          </div>
        )}

        {errorMsg && (
          <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mt-4 w-full">
            <AlertTriangle size={18} className="text-red-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-red-400">
                {lang === 'ar' ? 'فشلت العملية' : 'Operation failed'}
              </p>
              <p className="text-xs text-red-300/70 mt-0.5">{errorMsg}</p>
            </div>
            <button
              onClick={() => setErrorMsg('')}
              className="text-red-400 hover:text-red-300 transition-colors flex-shrink-0"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {state === 'done' && (
          <div className="fu w-full bg-[#131317] border border-emerald-500/20 rounded-3xl p-10 flex flex-col items-center text-center shadow-[0_0_40px_rgba(16,185,129,.08)]">
            <div className="w-20 h-20 bg-emerald-500/20 border border-emerald-500/20 rounded-full flex items-center justify-center mb-5">
              <CheckCircle2 size={44} className="text-emerald-400" />
            </div>
            <h2 className="text-2xl font-black text-white mb-8">{lang === 'ar' ? 'تم بنجاح!' : 'Done Successfully!'}</h2>
            <button
              onClick={() => {
                setFiles([])
                setState('idle')
                setProgress('')
                setProgressNum(0)
                setActiveSection('upload')
              }}
              className="w-full bg-white/10 hover:bg-white/15 text-white font-bold py-4 rounded-2xl transition-colors"
            >
              {lang === 'ar' ? 'مهمة جديدة' : 'New Task'}
            </button>
          </div>
        )}

        {state === 'error' && (
          <div className="fu w-full bg-[#131317] border border-red-500/20 rounded-3xl p-8 flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
              <AlertTriangle size={32} className="text-red-400" />
            </div>
            <p className="text-red-300 font-bold text-sm">{progress}</p>
            <button
              onClick={() => {
                setState('idle')
                setProgress('')
                setProgressNum(0)
                setActiveSection('options')
              }}
              className="w-full bg-white/10 hover:bg-white/15 text-white font-bold py-3 rounded-2xl transition-colors text-sm"
            >
              {lang === 'ar' ? 'حاول مجدداً' : 'Try Again'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}