import { useState, useCallback } from 'react'

export function useUIState() {
  const [panel, setPanel] = useState('main')
  const [isBusy, setIsBusy] = useState(false)
  const [toast, setToast] = useState('')
  const [activeSection, setActiveSection] = useState('upload')

  const showToast = useCallback((msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }, [])

  return {
    panel,
    setPanel,
    isBusy,
    setIsBusy,
    toast,
    setToast,
    activeSection,
    setActiveSection,
    showToast,
  }
}