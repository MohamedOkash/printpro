importScripts('https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/4.1.1/tesseract.min.js')

const jobQueue = []
let isProcessing = false
let workerInstance = null

async function initializeWorker() {
  if (workerInstance) return
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