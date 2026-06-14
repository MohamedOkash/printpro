let cvPromise = null
let isLoading = false

export function loadOpenCV() {
  if (cvPromise) return cvPromise

  if (typeof window !== 'undefined' && window.cv && window.cv.Mat) {
    return Promise.resolve(window.cv)
  }

  isLoading = true
  cvPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://docs.opencv.org/4.x/opencv.js'
    script.async = true
    script.onload = () => {
      if (window.cv && window.cv.Mat) {
        isLoading = false
        resolve(window.cv)
      } else {
        const checkReady = setInterval(() => {
          if (window.cv && window.cv.Mat) {
            clearInterval(checkReady)
            isLoading = false
            resolve(window.cv)
          }
        }, 100)
      }
    }
    script.onerror = () => {
      isLoading = false
      cvPromise = null
      reject(new Error('Failed to load OpenCV.js'))
    }
    document.head.appendChild(script)
  })

  return cvPromise
}

export function isOpenCVLoaded() {
  return typeof window !== 'undefined' && window.cv && window.cv.Mat
}

export function getOpenCVLoadingState() {
  if (isOpenCVLoaded()) return 'loaded'
  if (isLoading) return 'loading'
  return 'not-loaded'
}