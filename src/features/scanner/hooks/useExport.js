import { useCallback } from 'react'
import { applySharpen, applyAdaptive, applyShadowRemoval, applyColorAdjustments } from '../../../utils/imageProcessing'
import { loadScript } from '../../../utils/scriptLoader'
import { resizeToMax, getResizedCanvas } from '../utils/imageUtils'
import { buildFinalCanvas, renderPageWithFilters } from '../utils/canvasUtils'

export function useExport({
  canvasRef, pages, activePage,
  wmText, wmOpacity,
  brightness, contrast, grayscale, invert,
  adaptThresh, shadowFix, hdSharpen, activeFilter,
  setIsBusy, showToast, addHistoryItem, t, lang,
}) {
  const getPagesForHistory = useCallback(async () => {
    const pagesData = []
    for (const page of pages) {
      try {
        const base64 = await new Promise((resolve, reject) => {
          const img = new Image()
          img.onload = () => { resolve(getResizedCanvas(img, 300).toDataURL('image/jpeg', 0.8)) }
          img.onerror = reject
          img.src = page.src
        })
        pagesData.push({ name: page.name, base64 })
      } catch (e) { console.error('Error converting page to base64 for history', e) }
    }
    return pagesData
  }, [pages])

  const buildFinal = useCallback(() => {
    return buildFinalCanvas(canvasRef.current, wmText, wmOpacity)
  }, [canvasRef, wmText, wmOpacity])

  const saveImage = useCallback(async () => {
    if (!canvasRef.current) return
    setIsBusy(true)
    const pagesData = await getPagesForHistory()
    requestAnimationFrame(() => {
      const c = buildFinal()
      c.toBlob(blob => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.download = 'PrintPro_doc.jpg'; a.href = url; a.click()
        URL.revokeObjectURL(url)
        addHistoryItem({
          type: 'image', name: pages[activePage]?.name || (lang === 'ar' ? 'مستند' : 'Document'),
          filter: activeFilter, thumb: c.toDataURL('image/jpeg', 0.1),
          projectData: { pages: pagesData },
        })
        showToast(t('savedToHistory'))
        setIsBusy(false)
      }, 'image/jpeg', 1.0)
    })
  }, [canvasRef, setIsBusy, getPagesForHistory, buildFinal, addHistoryItem, pages, activePage, activeFilter, showToast, t, lang])

  const shareFile = useCallback(async (blob, filename) => {
    if (!navigator.share || !navigator.canShare) {
      showToast(lang === 'ar' ? 'المشاركة غير مدعومة في هذا المتصفح' : 'Sharing not supported in this browser')
      return
    }
    const file = new File([blob], filename, { type: blob.type })
    if (!navigator.canShare({ files: [file] })) {
      showToast(lang === 'ar' ? 'لا يمكن مشاركة هذا النوع' : 'Cannot share this file type')
      return
    }
    try { await navigator.share({ files: [file], title: 'PrintPro' }) }
    catch (e) { if (e.name !== 'AbortError') showToast(lang === 'ar' ? 'فشلت المشاركة' : 'Share failed') }
  }, [showToast, lang])

  const savePDF = useCallback(async () => {
    if (!pages.length) return
    setIsBusy(true)
    const pagesData = await getPagesForHistory()
    try {
      const { jsPDF } = await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', 'jspdf')
      let pdf = null
      for (let idx = 0; idx < pages.length; idx++) {
        const imgData = await new Promise(res => {
          const img = new Image()
          img.onload = () => {
            const { w, h } = resizeToMax(img.naturalWidth, img.naturalHeight, 2200)
            const c = renderPageWithFilters(img, w, h, brightness, contrast, grayscale, invert, adaptThresh, shadowFix, hdSharpen, applyColorAdjustments, applyAdaptive, applyShadowRemoval, applySharpen)
            res({ data: c.toDataURL('image/jpeg', 0.9), w, h })
          }
          img.src = pages[idx].src
        })
        if (!pdf) pdf = new jsPDF({ orientation: imgData.w > imgData.h ? 'l' : 'p', unit: 'px', format: [imgData.w, imgData.h] })
        else pdf.addPage([imgData.w, imgData.h], imgData.w > imgData.h ? 'l' : 'p')
        pdf.addImage(imgData.data, 'JPEG', 0, 0, imgData.w, imgData.h)
      }
      pdf.save('PrintPro_Document.pdf')
      addHistoryItem({ type: 'pdf', name: lang === 'ar' ? `${pages.length} صفحة` : `${pages.length} page(s)`, thumb: null, projectData: { pages: pagesData } })
      showToast(lang === 'ar' ? 'تم حفظ PDF بنجاح! ✓' : 'PDF saved successfully! ✓')
    } catch (e) { console.error(e) }
    setIsBusy(false)
  }, [pages, setIsBusy, getPagesForHistory, brightness, contrast, grayscale, invert, adaptThresh, shadowFix, hdSharpen, addHistoryItem, showToast, lang])

  return {
    buildFinal,
    saveImage,
    savePDF,
    shareFile,
    getPagesForHistory,
  }
}