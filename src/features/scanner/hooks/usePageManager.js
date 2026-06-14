import { useState, useRef, useCallback, useEffect } from 'react'
import { FILTER_PRESETS } from '../../../constants'
import { loadScript, CDN } from '../../../utils/scriptLoader'
import { dataURLtoBlob, resizeToMax } from '../utils/imageUtils'

export function usePageManager({
  setActiveFilter, setBrightness, setContrast, setGrayscale,
  setInvert, setAdaptThresh, setHdSharpen, setShadowFix,
  setPanel, setShowBA, setActiveSection, setIsBusy, showToast,
  applyPreset, lang, t, setPages: _setPages, activePage: _activePage,
  setActivePage: _setActivePage, pages: _pages,
}) {
  const [pages, setPages] = useState(_pages || [])
  const [activePage, setActivePage] = useState(_activePage || 0)
  const fileRef = useRef(null)
  const addPageRef = useRef(null)
  const pagesRef = useRef(pages)
  pagesRef.current = pages

  const currentSrc = pages[activePage]?.src || null
  const currentPage = activePage
  const pageIndex = activePage
  const pageCount = pages.length

  const selectPage = useCallback((index) => {
    if (index >= 0 && index < pages.length) {
      setActivePage(index)
    }
  }, [pages.length])

  const nextPage = useCallback(() => {
    if (activePage < pages.length - 1) setActivePage(p => p + 1)
  }, [activePage, pages.length])

  const previousPage = useCallback(() => {
    if (activePage > 0) setActivePage(p => p - 1)
  }, [activePage])

  const internalApplyPreset = useCallback((preset) => {
    if (setActiveFilter) setActiveFilter(preset.id)
    if (setBrightness) setBrightness(preset.br)
    if (setContrast) setContrast(preset.ct)
    if (setGrayscale) setGrayscale(preset.gs)
    if (setInvert) setInvert(preset.inv)
    if (setAdaptThresh) setAdaptThresh(preset.adapt)
    if (setHdSharpen) setHdSharpen(preset.sharp)
    if (setShadowFix) setShadowFix(preset.shadow)
  }, [setActiveFilter, setBrightness, setContrast, setGrayscale, setInvert, setAdaptThresh, setHdSharpen, setShadowFix])

  const cbApplyPreset = applyPreset || internalApplyPreset

  const loadFiles = useCallback(async (fileList, append = false) => {
    const validFiles = Array.from(fileList).filter(
      f => f.type.startsWith('image/') || f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    )
    if (!validFiles.length) return
    if (setIsBusy) setIsBusy(true)
    let newPages = []
    try {
      for (const file of validFiles) {
        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
          if (showToast) showToast(lang === 'ar' ? 'جاري استخراج صفحات الـ PDF...' : 'Extracting PDF pages...')
          const pdfjsLib = await loadScript(CDN.pdfJs || 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js', 'pdfjsLib')
          pdfjsLib.GlobalWorkerOptions.workerSrc = CDN.pdfJsWorker || 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
          const arrayBuffer = await file.arrayBuffer()
          const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
          for (let i = 1; i <= pdfDoc.numPages; i++) {
            if (showToast) showToast(lang === 'ar' ? `جاري معالجة الصفحة ${i} من ${pdfDoc.numPages}...` : `Processing page ${i} of ${pdfDoc.numPages}...`)
            const page = await pdfDoc.getPage(i)
            const vp = page.getViewport({ scale: 2.0 })
            const c = document.createElement('canvas')
            c.width = vp.width
            c.height = vp.height
            const ctx = c.getContext('2d')
            await page.render({ canvasContext: ctx, viewport: vp }).promise
            const blob = await new Promise(resolve => c.toBlob(resolve, 'image/jpeg', 0.95))
            newPages.push({
              id: Date.now() + Math.random(),
              src: URL.createObjectURL(blob),
              name: `${file.name.replace(/\.pdf$/i, '')}_page_${i}.jpg`
            })
          }
        } else {
          newPages.push({
            id: Date.now() + Math.random(),
            src: URL.createObjectURL(file),
            name: file.name
          })
        }
      }
      if (!newPages.length) { if (setIsBusy) setIsBusy(false); return }
      if (append) {
        setPages(p => { setActivePage(p.length); return [...p, ...newPages] })
      } else {
        pagesRef.current.forEach(p => { if (p.src && p.src.startsWith('blob:')) URL.revokeObjectURL(p.src) })
        setPages(newPages)
        setActivePage(0)
      }
      cbApplyPreset(FILTER_PRESETS[0])
      if (setPanel) setPanel('main')
      if (setShowBA) setShowBA(false)
      if (setActiveSection) setActiveSection('crop')
      if (showToast) showToast(lang === 'ar' ? 'تم تحميل الملفات بنجاح!' : 'Files loaded successfully!')
    } catch (err) {
      console.error(err)
      if (showToast) showToast(lang === 'ar' ? 'خطأ في قراءة الملفات' : 'Error reading files')
    } finally {
      if (setIsBusy) setIsBusy(false)
    }
  }, [setIsBusy, showToast, lang, cbApplyPreset, setPanel, setShowBA, setActiveSection])

  const onUpload = useCallback((e, append = false) => {
    loadFiles(e.target.files, append)
    e.target.value = ''
  }, [loadFiles])

  const addPage = useCallback(() => {
    addPageRef.current?.click()
  }, [])

  const replacePage = useCallback((pageIndex, newSrc, newName) => {
    setPages(pp => pp.map((p, i) => i === pageIndex ? { ...p, src: newSrc, name: newName || p.name } : p))
  }, [])

  const rotateImage90 = useCallback(() => {
    if (!currentSrc) return
    if (setIsBusy) setIsBusy(true)
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = img.naturalHeight
      c.height = img.naturalWidth
      const ctx = c.getContext('2d')
      ctx.translate(c.width / 2, c.height / 2)
      ctx.rotate(90 * Math.PI / 180)
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2)
      c.toBlob(blob => {
        const newSrc = URL.createObjectURL(blob)
        const oldSrc = pages[activePage]?.src
        if (oldSrc && oldSrc.startsWith('blob:')) URL.revokeObjectURL(oldSrc)
        setPages(pp => pp.map((p, i) => i === activePage ? { ...p, src: newSrc } : p))
        if (setIsBusy) setIsBusy(false)
        if (showToast) showToast(lang === 'ar' ? 'تم التدوير ✓' : 'Rotated ✓')
      }, 'image/jpeg', 0.95)
    }
    img.src = currentSrc
  }, [currentSrc, activePage, pages, setIsBusy, showToast, lang])

  const flipImageH = useCallback(() => {
    if (!currentSrc) return
    if (setIsBusy) setIsBusy(true)
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = img.naturalWidth
      c.height = img.naturalHeight
      const ctx = c.getContext('2d')
      ctx.translate(c.width, 0)
      ctx.scale(-1, 1)
      ctx.drawImage(img, 0, 0)
      c.toBlob(blob => {
        const newSrc = URL.createObjectURL(blob)
        const oldSrc = pages[activePage]?.src
        if (oldSrc && oldSrc.startsWith('blob:')) URL.revokeObjectURL(oldSrc)
        setPages(pp => pp.map((p, i) => i === activePage ? { ...p, src: newSrc } : p))
        if (setIsBusy) setIsBusy(false)
        if (showToast) showToast(lang === 'ar' ? 'تم الانعكاس ✓' : 'Flipped ✓')
      }, 'image/jpeg', 0.95)
    }
    img.src = currentSrc
  }, [currentSrc, activePage, pages, setIsBusy, showToast, lang])

  return {
    pages, setPages,
    activePage, setActivePage,
    currentSrc,
    currentPage, pageIndex, pageCount,
    fileRef, addPageRef, pagesRef,
    loadFiles, onUpload,
    selectPage, nextPage, previousPage,
    addPage, replacePage,
    rotateImage90, flipImageH,
  }
}