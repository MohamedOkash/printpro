/**
 * Apply unsharp-mask sharpening kernel to a canvas context.
 */
export const applySharpen = (ctx, w, h) => {
  const src = ctx.getImageData(0, 0, w, h)
  const dst = ctx.createImageData(w, h)
  const s = src.data, d = dst.data
  const k = [0, -1, 0, -1, 5, -1, 0, -1, 0]

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const o = (y * w + x) * 4
      let r = 0, g = 0, b = 0
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const p = ((y + ky) * w + (x + kx)) * 4
          const wt = k[(ky + 1) * 3 + (kx + 1)]
          r += s[p] * wt; g += s[p + 1] * wt; b += s[p + 2] * wt
        }
      }
      d[o]     = Math.max(0, Math.min(255, r))
      d[o + 1] = Math.max(0, Math.min(255, g))
      d[o + 2] = Math.max(0, Math.min(255, b))
      d[o + 3] = s[o + 3]
    }
  }
  ctx.putImageData(dst, 0, 0)
}

/**
 * Adaptive threshold binarization — like CamScanner's document mode.
 */
export const applyAdaptive = (ctx, w, h) => {
  const img = ctx.getImageData(0, 0, w, h)
  const d = img.data
  const bs = 19, C = 12

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4
      const gray = 0.299 * d[o] + 0.587 * d[o + 1] + 0.114 * d[o + 2]
      let sum = 0, cnt = 0
      const half = Math.floor(bs / 2)
      for (let by = Math.max(0, y - half); by <= Math.min(h - 1, y + half); by++) {
        for (let bx = Math.max(0, x - half); bx <= Math.min(w - 1, x + half); bx++) {
          const bo = (by * w + bx) * 4
          sum += 0.299 * d[bo] + 0.587 * d[bo + 1] + 0.114 * d[bo + 2]
          cnt++
        }
      }
      const val = gray < sum / cnt - C ? 0 : 255
      d[o] = d[o + 1] = d[o + 2] = val
    }
  }
  ctx.putImageData(img, 0, 0)
}

/**
 * Shadow / uneven-lighting removal by normalizing toward white background.
 */
export const applyShadowRemoval = (ctx, w, h) => {
  const src = ctx.getImageData(0, 0, w, h)
  const d = src.data
  for (let i = 0; i < d.length; i += 4) {
    const maxC = Math.max(d[i], d[i + 1], d[i + 2])
    if (maxC > 0) {
      const f = Math.min(255 / maxC * 1.1, 2.5)
      d[i]     = Math.min(255, d[i]     * f)
      d[i + 1] = Math.min(255, d[i + 1] * f)
      d[i + 2] = Math.min(255, d[i + 2] * f)
    }
  }
  ctx.putImageData(src, 0, 0)
}

/**
 * Analyse average brightness of an image src URL.
 * Returns a number 0-255.
 */
export const getAverageBrightness = (src) =>
  new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const tc = document.createElement('canvas')
      tc.width = 60; tc.height = 60
      const ctx = tc.getContext('2d', { willReadFrequently: true })
      ctx.drawImage(img, 0, 0, 60, 60)
      const data = ctx.getImageData(0, 0, 60, 60).data
      let total = 0
      for (let i = 0; i < data.length; i += 4)
        total += data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
      resolve(total / (60 * 60))
    }
    img.src = src
  })
