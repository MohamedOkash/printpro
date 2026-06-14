import { useState, useRef, useEffect, useCallback } from 'react'

export function useBeforeAfter({ currentSrc, showBA, setShowBA, lang }) {
  const [baSplit, setBaSplit] = useState(50)
  const [isDraggingBA, setIsDraggingBA] = useState(false)
  const origCanvasRef = useRef(null)
  const baContRef = useRef(null)

  useEffect(() => {
    if (!showBA || !currentSrc || !origCanvasRef.current) return
    const ctx = origCanvasRef.current.getContext('2d')
    const img = new Image()
    img.onload = () => {
      origCanvasRef.current.width = img.naturalWidth
      origCanvasRef.current.height = img.naturalHeight
      ctx.drawImage(img, 0, 0)
    }
    img.src = currentSrc
  }, [showBA, currentSrc])

  const onBAMove = useCallback((e) => {
    if (!isDraggingBA) return
    if (!baContRef.current) return
    const rect = baContRef.current.getBoundingClientRect()
    const cx = e.clientX - rect.left
    setBaSplit(Math.max(3, Math.min(97, (cx / rect.width) * 100)))
  }, [isDraggingBA])

  return {
    showBA,
    setShowBA,
    baSplit,
    setBaSplit,
    isDraggingBA,
    setIsDraggingBA,
    onBAMove,
    origCanvasRef,
    baContRef,
  }
}