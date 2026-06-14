import { useState, useRef, useEffect, useCallback } from 'react'

let jobIdCounter = 0

export function useOCR({ canvasRef, showToast, lang, t }) {
  const [ocrText, setOcrText] = useState('')
  const [ocrProg, setOcrProg] = useState(0)
  const [isOcr, setIsOcr] = useState(false)
  const workerRef = useRef(null)
  const pendingRef = useRef(new Map())

  const initWorker = useCallback(() => {
    if (workerRef.current) return
    const worker = new Worker(new URL('../workers/ocr.worker.js', import.meta.url), { type: 'module' })
    workerRef.current = worker

    worker.onmessage = (e) => {
      const msg = e.data
      const pending = pendingRef.current.get(msg.id)
      if (!pending) return

      switch (msg.type) {
        case 'progress':
          if (msg.status === 'recognizing text') {
            pending.setProgress(Math.floor(msg.progress * 100))
          } else if (msg.status?.includes('downloading')) {
            pending.setProgress(Math.floor(msg.progress * 40))
          }
          break
        case 'result':
          pending.resolve(msg.text)
          pendingRef.current.delete(msg.id)
          break
        case 'error':
          pending.reject(new Error(msg.message || 'OCR error'))
          pendingRef.current.delete(msg.id)
          break
      }
    }

    worker.onerror = () => {
      pendingRef.current.forEach(p => p.reject(new Error('Worker error')))
      pendingRef.current.clear()
    }
  }, [])

  const cleanup = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'terminate' })
      workerRef.current.terminate()
      workerRef.current = null
    }
    pendingRef.current.clear()
  }, [])

  useEffect(() => {
    initWorker()
    return cleanup
  }, [initWorker, cleanup])

  const runOCR = useCallback(async () => {
    if (!canvasRef.current) return
    setIsOcr(true)
    setOcrProg(0)
    setOcrText('')

    const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.85)
    const id = ++jobIdCounter

    return new Promise((resolve, reject) => {
      pendingRef.current.set(id, {
        setProgress: v => setOcrProg(v),
        resolve: text => {
          setOcrText(text?.trim() || t('noText'))
          setIsOcr(false)
          resolve(text)
        },
        reject: err => {
          setOcrText(lang === 'ar' ? 'خطأ في استخراج النص' : 'OCR error')
          setIsOcr(false)
          reject(err)
        },
      })

      if (workerRef.current) {
        workerRef.current.postMessage({ type: 'recognize', id, dataUrl, lang: 'ara+eng' })
      } else {
        pendingRef.current.delete(id)
        reject(new Error('Worker not initialized'))
      }
    })
  }, [canvasRef, t, lang])

  return {
    ocrText,
    setOcrText,
    ocrProg,
    setOcrProg,
    isOcr,
    setIsOcr,
    runOCR,
  }
}