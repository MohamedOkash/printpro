import { useState, useRef, useEffect, useCallback } from 'react'
import { computeCropBox, applySobelEdgeDetection, findEdgeBounds } from '../utils/cropMath'
import { cropImageToBlob } from '../utils/canvasUtils'
import { detectDocumentCornersFromDataUrl } from '../services/opencv/documentDetection'

export function useCrop({
  currentSrc,
  activePage,
  pages,
  setPages,
  setPanel,
  setShowBA,
  setIsBusy,
  showToast,
  lang,
  saveSnapshot,
}) {
  const [cropBox, setCropBox] = useState({ x: 10, y: 10, w: 80, h: 80 })
  const [cropHandle, setCropHandle] = useState(null)
  const [forceA4, setForceA4] = useState(false)
  const [cropMode, setCropMode] = useState(false)
  const cropImgRef = useRef(null)
  const cropContRef = useRef(null)

  // cropDragging: derived from cropHandle !== null
  const cropDragging = cropHandle !== null

  useEffect(() => {
    if (!cropHandle) return
    const handlePointerMove = (e) => {
      if (!cropContRef.current) return
      const rect = cropContRef.current.getBoundingClientRect()
      const cx = e.clientX - rect.left
      const cy = e.clientY - rect.top
      const xp = Math.max(0, Math.min(100, (cx / rect.width) * 100))
      const yp = Math.max(0, Math.min(100, (cy / rect.height) * 100))
      setCropBox(prev => computeCropBox(prev, cropHandle, xp, yp, forceA4))
    }
    const handlePointerUp = () => { setCropHandle(null) }
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [cropHandle, forceA4, cropContRef])

  const startCrop = useCallback(() => {
    setCropMode(true)
    setCropBox({ x: 10, y: 10, w: 80, h: 80 })
    setPanel('crop')
    setShowBA(false)
  }, [setPanel, setShowBA])

  const updateCrop = useCallback((e) => {
    if (!cropHandle || !cropContRef.current) return
    const rect = cropContRef.current.getBoundingClientRect()
    const cx = e.clientX - rect.left
    const cy = e.clientY - rect.top
    const xp = Math.max(0, Math.min(100, (cx / rect.width) * 100))
    const yp = Math.max(0, Math.min(100, (cy / rect.height) * 100))
    setCropBox(prev => computeCropBox(prev, cropHandle, xp, yp, forceA4))
  }, [cropHandle, forceA4, cropContRef])

  const finishCrop = useCallback(() => {
    setCropHandle(null)
  }, [])

  const resetCrop = useCallback(() => {
    setCropBox({ x: 10, y: 10, w: 80, h: 80 })
    setCropHandle(null)
    setCropMode(false)
    setPanel('main')
  }, [setPanel])

  const applyCrop = useCallback(() => {
    saveSnapshot()
    setIsBusy(true)
    requestAnimationFrame(async () => {
      const img = cropImgRef.current
      const blob = await cropImageToBlob(img, cropBox, 0.95)
      const newSrc = URL.createObjectURL(blob)
      const oldSrc = pages[activePage]?.src
      if (oldSrc && oldSrc.startsWith('blob:')) URL.revokeObjectURL(oldSrc)
      setPages(pp => pp.map((p, i) => i === activePage ? { ...p, src: newSrc } : p))
      setPanel('main')
      setCropMode(false)
      setIsBusy(false)
      showToast(lang === 'ar' ? 'تم القص بنجاح! ✓' : 'Cropped successfully! ✓')
    })
  }, [cropImgRef, cropBox, activePage, pages, setPages, setPanel, setIsBusy, showToast, lang, saveSnapshot])

  const toggleAspectLock = useCallback(() => {
    setForceA4(v => !v)
  }, [])

  const detectSmartCrop = useCallback(async () => {
    if (!currentSrc) return
    setIsBusy(true)
    try {
      const result = await detectDocumentCornersFromDataUrl(currentSrc)
      if (!result || !result.corners || result.corners.length !== 4) {
        throw new Error('No document detected')
      }

      const { corners, imageWidth, imageHeight } = result
      const [tl, tr, br, bl] = corners

      const minX = Math.min(tl.x, tr.x, br.x, bl.x)
      const maxX = Math.max(tl.x, tr.x, br.x, bl.x)
      const minY = Math.min(tl.y, tr.y, br.y, bl.y)
      const maxY = Math.max(tl.y, tr.y, br.y, bl.y)

      const padX = Math.round(imageWidth * 0.015)
      const padY = Math.round(imageHeight * 0.015)
      const x1 = Math.max(0, minX - padX)
      const y1 = Math.max(0, minY - padY)
      const x2 = Math.min(imageWidth, maxX + padX)
      const y2 = Math.min(imageHeight, maxY + padY)

      setCropBox({
        x: Math.max(0, Math.min(80, Math.round((x1 / imageWidth) * 100))),
        y: Math.max(0, Math.min(80, Math.round((y1 / imageHeight) * 100))),
        w: Math.min(100 - Math.round((x1 / imageWidth) * 100), Math.max(20, Math.round(((x2 - x1) / imageWidth) * 100))),
        h: Math.min(100 - Math.round((y1 / imageHeight) * 100), Math.max(20, Math.round(((y2 - y1) / imageHeight) * 100))),
      })
      showToast(lang === 'ar' ? 'تم تحديد حواف المستند! ✓' : 'Document edges detected! ✓')
      setPanel('crop')
      setCropMode(true)
      setShowBA(false)
    } catch (err) {
      console.warn('OpenCV detection failed, falling back to Sobel:', err)
      const img = new Image()
      img.onload = () => {
        const MAX_W = 600
        const r = Math.min(1, MAX_W / img.naturalWidth)
        const w = Math.round(img.naturalWidth * r)
        const h = Math.round(img.naturalHeight * r)
        const tc = document.createElement('canvas')
        tc.width = w
        tc.height = h
        const ctx = tc.getContext('2d', { willReadFrequently: true })
        ctx.drawImage(img, 0, 0, w, h)
        const imgData = ctx.getImageData(0, 0, w, h)

        const { edges, maxEdge } = applySobelEdgeDetection(imgData, w, h)

        if (maxEdge < 10) {
          setCropBox({ x: 5, y: 5, w: 90, h: 90 })
          showToast(lang === 'ar' ? 'لم يتم كشف حواف واضحة' : 'No clear edges detected')
          setPanel('crop')
          setCropMode(true)
          setIsBusy(false)
          return
        }

        const threshold = maxEdge * 0.15
        const { minX, maxX, minY, maxY } = findEdgeBounds(edges, w, h, threshold)

        const padX = Math.round(w * 0.015)
        const padY = Math.round(h * 0.015)
        const x1 = Math.max(0, minX - padX)
        const y1 = Math.max(0, minY - padY)
        const x2 = Math.min(w, maxX + padX)
        const y2 = Math.min(h, maxY + padY)

        setCropBox({
          x: Math.max(0, Math.min(80, Math.round((x1 / w) * 100))),
          y: Math.max(0, Math.min(80, Math.round((y1 / h) * 100))),
          w: Math.min(100 - Math.round((x1 / w) * 100), Math.max(20, Math.round(((x2 - x1) / w) * 100))),
          h: Math.min(100 - Math.round((y1 / h) * 100), Math.max(20, Math.round(((y2 - y1) / h) * 100))),
        })
        showToast(lang === 'ar' ? 'تم تحديد حواف المستند! ✓' : 'Document edges detected! ✓')
        setPanel('crop')
        setCropMode(true)
        setShowBA(false)
        setIsBusy(false)
      }
      img.onerror = () => {
        setIsBusy(false)
        showToast(lang === 'ar' ? 'خطأ في معالجة الصورة' : 'Error processing image')
      }
      img.src = currentSrc
    }
  }, [currentSrc, setIsBusy, showToast, lang, setPanel, setShowBA])

  return {
    cropBox,
    setCropBox,
    cropHandle,
    setCropHandle,
    cropMode,
    setCropMode,
    cropDragging,
    cropAspectLocked: forceA4,
    setForceA4,
    cropImgRef,
    cropContRef,
    forceA4,
    updateCrop,
    onCropMove: updateCrop,
    startCrop,
    finishCrop,
    resetCrop,
    applyCrop,
    executeCrop: applyCrop,
    toggleAspectLock,
    detectSmartCrop,
  }
}