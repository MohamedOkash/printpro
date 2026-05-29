/**
 * Dynamically load an external script via CDN and cache it.
 * Returns a promise that resolves with the global variable the script exposes.
 *
 * Usage:
 *   const { jsPDF } = await loadScript('https://cdn.../jspdf.umd.min.js', 'jspdf')
 */
const cache = {}

export const loadScript = (src, globalVar) =>
  new Promise((resolve, reject) => {
    if (window[globalVar]) return resolve(window[globalVar])
    if (cache[src])        return cache[src].then(resolve).catch(reject)

    const p = new Promise((res, rej) => {
      const s = document.createElement('script')
      s.src = src
      s.onload  = () => res(window[globalVar])
      s.onerror = rej
      document.head.appendChild(s)
    })

    cache[src] = p
    p.then(resolve).catch(reject)
  })

// ─── CDN URLs ─────────────────────────────────────────────────────────────────
export const CDN = {
  jsPDF:        'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  jsPDFTable:   'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.25/jspdf.plugin.autotable.min.js',
  pdfLib:       'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js',
  pdfJs:        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  pdfJsWorker:  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
  jsZip:        'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
  xlsx:         'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  html2canvas:  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  tesseract:    'https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/4.1.1/tesseract.min.js',
}
