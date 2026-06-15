const jobQueue = []
let isProcessing = false
let workerInstance = null

async function loadTesseractScript() {
  if (self.Tesseract) return
  const response = await fetch('https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/4.1.1/tesseract.min.js')
  if (!response.ok) {
    throw new Error('Failed to load Tesseract.js script')
  }
  const script = await response.text()
  const fn = new Function(script)
  fn()
  if (!self.Tesseract) {
    throw new Error('Tesseract failed to initialize')
  }
}


async function initializeWorker() {
  if (workerInstance) return
  await loadTesseractScript()
  workerInstance = await self.Tesseract.createWorker({
    workerBlobURL: false,
  })
  await workerInstance.loadLanguage('ara+eng')
  await workerInstance.initialize('ara+eng')
}

async function processQueue() {
  if (isProcessing || jobQueue.length === 0) return
  isProcessing = true

  while (jobQueue.length > 0) {
    const { id, dataUrl, resolve, reject } = jobQueue.shift()
    try {
      const result = await workerInstance.recognize(dataUrl, {
        logger: m => self.postMessage({ type: 'progress', id, status: m.status, progress: m.progress }),
      })
      resolve({ id, text: result.data.text })
      self.postMessage({ type: 'result', id, text: result.data.text })
    } catch (err) {
      reject(err)
      self.postMessage({ type: 'error', id, message: err.message || 'OCR error' })
    }
  }

  isProcessing = false
}

self.addEventListener('message', async (e) => {
  const { type, id, dataUrl } = e.data

  if (type === 'recognize') {
    if (!workerInstance) await initializeWorker()
    jobQueue.push({ id, dataUrl, resolve: null, reject: null })
    processQueue()
  } else if (type === 'terminate') {
    if (workerInstance) {
      await workerInstance.terminate()
      workerInstance = null
    }
    isProcessing = false
    jobQueue.length = 0
  }
})