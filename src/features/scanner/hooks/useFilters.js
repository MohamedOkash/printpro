import { useState, useCallback, useEffect, useRef } from 'react'
import { FILTER_PRESETS } from '../../../constants'
import { applySharpen, applyAdaptive, applyShadowRemoval, applyColorAdjustments } from '../../../utils/imageProcessing'
import { resizeToMax } from '../utils/imageUtils'

export function useFilters({ canvasRef, currentSrc, panel, showToast, lang }) {
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(100)
  const [grayscale, setGrayscale] = useState(0)
  const [invert, setInvert] = useState(false)
  const [hdSharpen, setHdSharpen] = useState(false)
  const [adaptThresh, setAdaptThresh] = useState(false)
  const [shadowFix, setShadowFix] = useState(false)
  const [activeFilter, setActiveFilter] = useState('raw')

  const getCurrentFilters = useCallback(() => ({
    brightness, contrast, grayscale, invert
  }), [brightness, contrast, grayscale, invert])

  const applyPreset = useCallback((preset) => {
    setActiveFilter(preset.id)
    setBrightness(preset.br)
    setContrast(preset.ct)
    setGrayscale(preset.gs)
    setInvert(preset.inv)
    setAdaptThresh(preset.adapt)
    setHdSharpen(preset.sharp)
    setShadowFix(preset.shadow)
  }, [])

  const autoEnhance = useCallback(() => {
    if (!currentSrc) return
    const img = new Image()
    img.onload = () => {
      const tc = document.createElement('canvas')
      tc.width = 60
      tc.height = 60
      const ctx = tc.getContext('2d', { willReadFrequently: true })
      ctx.drawImage(img, 0, 0, 60, 60)
      const data = ctx.getImageData(0, 0, 60, 60).data
      let total = 0
      for (let i = 0; i < data.length; i += 4) total += data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
      const avg = total / (60 * 60)
      const br = Math.max(100, Math.min(300, Math.round((230 / avg) * 100)))
      setBrightness(br)
      setContrast(220)
      setGrayscale(100)
      setAdaptThresh(false)
      setHdSharpen(true)
      setShadowFix(false)
      setActiveFilter('custom')
      showToast(lang === 'ar' ? 'تم التبييض والتحسين تلقائياً! ✓' : 'Whitened and enhanced automatically! ✓')
    }
    img.src = currentSrc
  }, [currentSrc, showToast, lang])

  const applySmartScanAll = useCallback(() => {
    setBrightness(160)
    setContrast(220)
    setGrayscale(100)
    setHdSharpen(true)
    setAdaptThresh(true)
    setActiveFilter('custom')
    showToast(lang === 'ar' ? 'تم تطبيق المسح الضوئي الذكي على كامل الملف! ✓' : 'Smart Scan applied to all pages! ✓')
  }, [showToast, lang])

  // Canvas rendering effect
  useEffect(() => {
    if (!currentSrc || panel === 'crop') return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    canvas.style.filter = 'none'
    const img = new Image()
    img.onload = () => {
      const { w, h } = resizeToMax(img.naturalWidth, img.naturalHeight, 2200)
      canvas.width = w
      canvas.height = h
      ctx.drawImage(img, 0, 0, w, h)
      applyColorAdjustments(ctx, w, h, brightness, contrast, grayscale, invert)
      if (adaptThresh) applyAdaptive(ctx, w, h)
      if (shadowFix) applyShadowRemoval(ctx, w, h)
      if (hdSharpen) applySharpen(ctx, w, h)
    }
    img.src = currentSrc
  }, [currentSrc, panel, brightness, contrast, grayscale, invert, adaptThresh, hdSharpen, shadowFix, canvasRef])

  return {
    brightness, setBrightness,
    contrast, setContrast,
    grayscale, setGrayscale,
    invert, setInvert,
    hdSharpen, setHdSharpen,
    adaptThresh, setAdaptThresh,
    shadowFix, setShadowFix,
    activeFilter, setActiveFilter,
    getCurrentFilters,
    applyPreset,
    autoEnhance,
    applySmartScanAll,
  }
}