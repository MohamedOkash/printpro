import { useRef, useCallback } from 'react'

export function useUndoRedo({ canvasRef, showToast, lang }) {
  const undoStackRef = useRef([])
  const redoStackRef = useRef([])

  const saveSnapshot = useCallback(() => {
    if (!canvasRef.current) return
    undoStackRef.current.push(canvasRef.current.toDataURL('image/jpeg', 0.8))
    if (undoStackRef.current.length > 15) undoStackRef.current.shift()
    redoStackRef.current = []
  }, [canvasRef])

  const handleUndo = useCallback(() => {
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
  }, [canvasRef])

  const handleRedo = useCallback(() => {
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
  }, [canvasRef])

  return {
    undoStackRef,
    redoStackRef,
    saveSnapshot,
    handleUndo,
    handleRedo,
  }
}