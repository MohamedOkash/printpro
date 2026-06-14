import { useState } from 'react'

export function useWatermark() {
  const [wmText, setWmText] = useState('')
  const [wmOpacity, setWmOpacity] = useState(30)

  return {
    wmText,
    setWmText,
    wmOpacity,
    setWmOpacity,
  }
}