import { loadOpenCV } from './opencvLoader'
import { enhancementPipeline } from './enhancementPipeline'

function orderPoints(pts) {
  const rect = []
  const sum = pts.map(p => p.x + p.y)
  const diff = pts.map(p => p.x - p.y)
  rect[0] = pts[sum.indexOf(Math.min(...sum))] // TL
  rect[2] = pts[sum.indexOf(Math.max(...sum))] // BR
  rect[1] = pts[diff.indexOf(Math.min(...diff))] // TR
  rect[3] = pts[diff.indexOf(Math.max(...diff))] // BL
  return rect
}

function euclidean(a, b) {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.hypot(dx, dy)
}

function computeTargetSize(pts) {
  // pts expected ordered [TL, TR, BR, BL]
  const [tl, tr, br, bl] = pts
  const widthA = euclidean(br, bl)
  const widthB = euclidean(tr, tl)
  const maxWidth = Math.max(Math.round(widthA), Math.round(widthB))

  const heightA = euclidean(tr, br)
  const heightB = euclidean(tl, bl)
  const maxHeight = Math.max(Math.round(heightA), Math.round(heightB))

  return { maxWidth, maxHeight }
}

function dataUrlToBlob(dataUrl) {
  const parts = dataUrl.split(',')
  const meta = parts[0]
  const isBase64 = meta.indexOf('base64') !== -1
  const raw = parts[1]
  if (isBase64) {
    const binary = atob(raw)
    const len = binary.length
    const buffer = new Uint8Array(len)
    for (let i = 0; i < len; i++) buffer[i] = binary.charCodeAt(i)
    const type = meta.split(':')[1].split(';')[0]
    return new Blob([buffer], { type })
  }
  // fallback for non-base64
  return fetch(dataUrl).then(r => r.blob())
}

export async function correctPerspective(dataUrl, corners) {
  const cv = await loadOpenCV()

  if (!corners || corners.length !== 4) return null

  const ordered = orderPoints(corners)
  const { maxWidth, maxHeight } = computeTargetSize(ordered)

  // load image element
  const img = new Image()
  img.src = dataUrl

  await new Promise((res, rej) => {
    img.onload = res
    img.onerror = () => rej(new Error('Failed to load image for perspective correction'))
  })

  const src = cv.imread(img)
  const dst = new cv.Mat()

  const srcPts = cv.matFromArray(4, 1, cv.CV_32FC2, [
    ordered[0].x, ordered[0].y,
    ordered[1].x, ordered[1].y,
    ordered[2].x, ordered[2].y,
    ordered[3].x, ordered[3].y,
  ])

  const dstPts = cv.matFromArray(4, 1, cv.CV_32FC2, [
    0, 0,
    maxWidth - 1, 0,
    maxWidth - 1, maxHeight - 1,
    0, maxHeight - 1,
  ])

  const M = cv.getPerspectiveTransform(srcPts, dstPts)
  const dsize = new cv.Size(maxWidth, maxHeight)
  cv.warpPerspective(src, dst, M, dsize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar())

  // apply enhancement pipeline (OCR-optimized)
  let processed = null
  try {
    processed = await enhancementPipeline(cv, dst, { adaptiveThreshold: false, ocrOptimized: true })
  } catch (e) {
    console.warn('Enhancement pipeline failed, using warped result', e)
    processed = dst.clone()
  }

  // draw to canvas
  const canvas = document.createElement('canvas')
  canvas.width = maxWidth
  canvas.height = maxHeight
  cv.imshow(canvas, processed)

  const dataUrlOut = canvas.toDataURL('image/jpeg', 0.95)

  // cleanup
  src.delete()
  dst.delete()
  srcPts.delete()
  dstPts.delete()
  M.delete()
  if (processed) processed.delete()

  return {
    correctedImage: dataUrlOut,
    width: maxWidth,
    height: maxHeight,
  }
}

export { orderPoints, computeTargetSize }
