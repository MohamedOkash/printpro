import { loadOpenCV } from './opencvLoader'

const MIN_CONTOUR_AREA_RATIO = 0.01
const MAX_CONTOUR_AREA_RATIO = 0.95
const APPROX_EPSILON_RATIO = 0.02

function matFromImageElement(cv, img) {
  const src = cv.imread(img)
  return src
}

function resizeWithAspect(cv, src, maxDim) {
  const h = src.rows
  const w = src.cols
  const scale = maxDim / Math.max(w, h)
  if (scale >= 1) return src
  const newW = Math.round(w * scale)
  const newH = Math.round(h * scale)
  const dst = new cv.Mat()
  cv.resize(src, dst, new cv.Size(newW, newH), 0, 0, cv.INTER_AREA)
  return dst
}

function orderPoints(pts) {
  const rect = []
  const sum = pts.map(p => p.x + p.y)
  const diff = pts.map(p => p.x - p.y)
  rect[0] = pts[sum.indexOf(Math.min(...sum))]
  rect[2] = pts[sum.indexOf(Math.max(...sum))]
  rect[1] = pts[diff.indexOf(Math.min(...diff))]
  rect[3] = pts[diff.indexOf(Math.max(...diff))]
  return rect
}

function contourArea(cv, contour) {
  return cv.contourArea(contour, false)
}

function isConvexQuad(cv, approx) {
  return approx.rows === 4 && cv.isContourConvex(approx)
}

export async function detectDocumentCorners(imageElement) {
  const cv = await loadOpenCV()

  let src = matFromImageElement(cv, imageElement)
  const originalH = src.rows
  const originalW = src.cols
  const workDim = 800

  if (Math.max(originalW, originalH) > workDim) {
    src = resizeWithAspect(cv, src, workDim)
  }

  const gray = new cv.Mat()
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY)

  const blurred = new cv.Mat()
  cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0)

  const edges = new cv.Mat()
  cv.Canny(blurred, edges, 50, 150)

  const contours = new cv.MatVector()
  const hierarchy = new cv.Mat()
  cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)

  const imageArea = src.rows * src.cols
  let bestContour = null
  let bestArea = 0
  let bestApprox = null

  for (let i = 0; i < contours.size(); i++) {
    const contour = contours.get(i)
    const area = contourArea(cv, contour)

    if (area < imageArea * MIN_CONTOUR_AREA_RATIO) continue
    if (area > imageArea * MAX_CONTOUR_AREA_RATIO) continue

    const perimeter = cv.arcLength(contour, true)
    const approx = new cv.Mat()
    cv.approxPolyDP(contour, approx, APPROX_EPSILON_RATIO * perimeter, true)

    if (!isConvexQuad(cv, approx)) {
      approx.delete()
      continue
    }

    if (area > bestArea) {
      bestArea = area
      bestContour = contour
      if (bestApprox) bestApprox.delete()
      bestApprox = approx
    } else {
      approx.delete()
    }
  }

  src.delete()
  gray.delete()
  blurred.delete()
  edges.delete()
  contours.delete()
  hierarchy.delete()

  if (!bestApprox) return null

  const scaleX = originalW / (src.cols || originalW)
  const scaleY = originalH / (src.rows || originalH)

  const corners = []
  for (let i = 0; i < 4; i++) {
    const pt = bestApprox.data32S.slice(i * 2, i * 2 + 2)
    corners.push({
      x: Math.round(pt[0] * scaleX),
      y: Math.round(pt[1] * scaleY),
    })
  }

  const ordered = orderPoints(corners)
  const confidence = Math.min(1, bestArea / (imageArea * 0.5))

  bestApprox.delete()

  return {
    corners: ordered,
    confidence,
    contourArea: bestArea,
    imageWidth: originalW,
    imageHeight: originalH,
  }
}

export async function detectDocumentCornersFromDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = async () => {
      try {
        const result = await detectDocumentCorners(img)
        resolve(result)
      } catch (err) {
        reject(err)
      }
    }
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = dataUrl
  })
}