import { useState, useRef, useEffect, useCallback } from 'react'
import { FILTER_PRESETS } from '../../../constants'

export function useCamera({
  setPages, setActivePage,
  setPanel, setShowBA, setActiveSection,
  applyPreset, showToast, lang,
}) {
  const [cameraOpen, setCameraOpen] = useState(false)
  const videoRef = useRef(null)
  const streamRef = useRef(null)

  const openCamera = useCallback(async () => {
    setCameraOpen(true)
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 } }
      })
      streamRef.current = s
      if (videoRef.current) videoRef.current.srcObject = s
    } catch {
      setCameraOpen(false)
    }
  }, [])

  const closeCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setCameraOpen(false)
  }, [])

  const capturePhoto = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    const w = v.videoWidth || 640
    const h = v.videoHeight || 480
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    c.getContext('2d').drawImage(v, 0, 0)
    c.toBlob(blob => {
      if (setPages) {
        setPages([{ id: Date.now(), src: URL.createObjectURL(blob), name: 'camera.jpg' }])
      }
      if (setActivePage) setActivePage(0)
      if (applyPreset) applyPreset(FILTER_PRESETS[0])
      if (setPanel) setPanel('main')
      if (setShowBA) setShowBA(false)
      closeCamera()
      if (setActiveSection) setActiveSection('crop')
    }, 'image/jpeg', 0.95)
  }, [setPages, setActivePage, applyPreset, setPanel, setShowBA, closeCamera, setActiveSection])

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [])

  return {
    cameraOpen,
    setCameraOpen,
    videoRef,
    streamRef,
    openCamera,
    closeCamera,
    capturePhoto,
  }
}