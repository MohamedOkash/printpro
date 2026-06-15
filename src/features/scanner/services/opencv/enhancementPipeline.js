import { loadOpenCV } from './opencvLoader'

// enhancementPipeline: applies CLAHE, white balance (Y channel equalization),
// denoising, optional adaptive thresholding and OCR-optimized adjustments.
// All operations use OpenCV and ensure Mats are deleted.

export async function enhancementPipeline(cv, srcMat, opts = {}) {
  // opts: { adaptiveThreshold: boolean, ocrOptimized: boolean }
  const adaptive = !!opts.adaptiveThreshold
  const ocrOpt = !!opts.ocrOptimized

  // Work on a copy to avoid modifying input unexpectedly
  const working = new cv.Mat()
  srcMat.copyTo(working)

  // 1) CLAHE on L channel (Lab colorspace)
  const lab = new cv.Mat()
  cv.cvtColor(working, lab, cv.COLOR_RGBA2Lab)
  const labPlanes = new cv.MatVector()
  cv.split(lab, labPlanes)
  const l = labPlanes.get(0)
  const lClahe = new cv.Mat()
  try {
    const clahe = new cv.CLAHE(2.0, new cv.Size(8, 8))
    clahe.apply(l, lClahe)
    clahe.delete()
  } catch (e) {
    // fallback to equalizeHist if CLAHE not available
    cv.equalizeHist(l, lClahe)
  }
  labPlanes.set(0, lClahe)
  cv.merge(labPlanes, lab)
  const claheColor = new cv.Mat()
  cv.cvtColor(lab, claheColor, cv.COLOR_Lab2RGBA)

  // cleanup Lab intermediates
  l.delete()
  lClahe.delete()
  labPlanes.delete()
  lab.delete()

  // 2) White balance via Y channel equalization (YCrCb)
  const ycrcb = new cv.Mat()
  cv.cvtColor(claheColor, ycrcb, cv.COLOR_RGBA2YCrCb)
  const ycrcbPlanes = new cv.MatVector()
  cv.split(ycrcb, ycrcbPlanes)
  const y = ycrcbPlanes.get(0)
  const yEq = new cv.Mat()
  cv.equalizeHist(y, yEq)
  ycrcbPlanes.set(0, yEq)
  cv.merge(ycrcbPlanes, ycrcb)
  const wb = new cv.Mat()
  cv.cvtColor(ycrcb, wb, cv.COLOR_YCrCb2RGBA)

  // cleanup YCrCb intermediates
  y.delete()
  yEq.delete()
  ycrcbPlanes.delete()
  ycrcb.delete()
  claheColor.delete()

  // 3) Denoise (colored)
  const denoised = new cv.Mat()
  // stronger denoise if OCR optimized
  const h = ocrOpt ? 12 : 10
  const hColor = ocrOpt ? 12 : 10
  cv.fastNlMeansDenoisingColored(wb, denoised, h, hColor, 7, 21)
  wb.delete()

  let finalMat = denoised

  // 4) Optional Adaptive Threshold (if requested or OCR mode)
  if (adaptive || ocrOpt) {
    const gray = new cv.Mat()
    cv.cvtColor(denoised, gray, cv.COLOR_RGBA2GRAY)

    const thresh = new cv.Mat()
    // blockSize must be odd and >=3
    const blockSize = ocrOpt ? 15 : 11
    const C = ocrOpt ? 6 : 2
    cv.adaptiveThreshold(gray, thresh, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, blockSize, C)

    // convert back to RGBA for downstream consistency
    const threshColor = new cv.Mat()
    cv.cvtColor(thresh, threshColor, cv.COLOR_GRAY2RGBA)

    // cleanup intermediate mats
    gray.delete()
    thresh.delete()
    denoised.delete()

    finalMat = threshColor
  }

  // If OCR optimized, perform a light unsharp mask (sharpen)
  if (ocrOpt) {
    const blurred = new cv.Mat()
    cv.GaussianBlur(finalMat, blurred, new cv.Size(0, 0), 1.0)
    const sharpen = new cv.Mat()
    // sharpen = finalMat * 1.5 - blurred * 0.5
    cv.addWeighted(finalMat, 1.5, blurred, -0.5, 0, sharpen)
    finalMat.delete()
    blurred.delete()
    finalMat = sharpen
  }

  // cleanup working copy
  working.delete()

  return finalMat
}

export default enhancementPipeline
