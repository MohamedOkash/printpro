import { useState, useRef, useCallback, useEffect } from 'react'
import { batchProcess } from '../../../services/batchProcessor'

export function useBatch({ pages, setPages, activePage, showToast, lang }) {
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })

  const cancelRef = useRef(null)
  const pagesRef = useRef(pages)
  const setPagesRef = useRef(setPages)
  const activePageRef = useRef(activePage)

  pagesRef.current = pages
  setPagesRef.current = setPages
  activePageRef.current = activePage

  useEffect(() => {
    return () => {
      cancelRef.current?.abort()
    }
  }, [])

  const cancelBatch = useCallback(() => {
    cancelRef.current?.abort()
  }, [])

  const batchRun = useCallback(
    async (scope, operation, onResult) => {
      const controller = new AbortController()
      cancelRef.current = controller
      setIsRunning(true)
      setProgress({ current: 0, total: 0 })

      const currentPages = pagesRef.current
      const indices =
        scope === 'all'
          ? currentPages.map((_, i) => i)
          : [activePageRef.current]

      if (!indices.length) {
        setIsRunning(false)
        return true
      }

      setProgress({ current: 0, total: indices.length })

      try {
        const { results, cancelled } = await batchProcess({
          items: indices,
          operation: async (pageIndex) => {
            const page = pagesRef.current[pageIndex]
            return operation(page.src, pageIndex)
          },
          onProgress: (current, total) => {
            setProgress({ current, total })
          },
          signal: controller.signal,
        })

        if (!cancelled) {
          // Apply page replacements (newSrc)
          let needsUpdate = false
          setPagesRef.current((prev) => {
            const next = [...prev]
            for (let i = 0; i < indices.length; i++) {
              const idx = indices[i]
              const result = results[i]
              if (result && result.newSrc && result.newSrc !== next[idx]?.src) {
                const oldSrc = next[idx]?.src
                if (oldSrc?.startsWith('blob:')) URL.revokeObjectURL(oldSrc)
                next[idx] = {
                  ...next[idx],
                  src: result.newSrc,
                  name: result.name || next[idx]?.name,
                }
                needsUpdate = true
              }
            }
            return needsUpdate ? next : prev
          })

          // Fire per-result callback (for side-effects like OCR)
          if (onResult) {
            for (let i = 0; i < indices.length; i++) {
              onResult(results[i], indices[i])
            }
          }
        }

        return !cancelled
      } finally {
        setIsRunning(false)
        setProgress({ current: 0, total: 0 })
      }
    },
    []
  )

  return {
    isRunning,
    progress,
    batchRun,
    cancelBatch,
  }
}
