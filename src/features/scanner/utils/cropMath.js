export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export const toPercent = (val, total) => (val / total) * 100;

export const fromPercent = (pct, total) => (pct / 100) * total;

export const computeCropBox = (prev, handle, xp, yp, forceA4) => {
  let nb = { ...prev };
  if (handle === 'n') {
    nb.y = Math.min(yp, prev.y + prev.h - 5);
    nb.h = (prev.y + prev.h) - nb.y;
  } else if (handle === 's') {
    nb.h = Math.max(5, yp - prev.y);
  } else if (handle === 'w') {
    nb.x = Math.min(xp, prev.x + prev.w - 5);
    nb.w = (prev.x + prev.w) - nb.x;
  } else if (handle === 'e') {
    nb.w = Math.max(5, xp - prev.x);
  } else if (handle === 'nw') {
    nb.x = Math.min(xp, prev.x + prev.w - 5);
    nb.w = (prev.x + prev.w) - nb.x;
    nb.y = Math.min(yp, prev.y + prev.h - 5);
    nb.h = (prev.y + prev.h) - nb.y;
  } else if (handle === 'ne') {
    nb.w = Math.max(5, xp - prev.x);
    nb.y = Math.min(yp, prev.y + prev.h - 5);
    nb.h = (prev.y + prev.h) - nb.y;
  } else if (handle === 'sw') {
    nb.x = Math.min(xp, prev.x + prev.w - 5);
    nb.w = (prev.x + prev.w) - nb.x;
    nb.h = Math.max(5, yp - prev.y);
  } else if (handle === 'se') {
    nb.w = Math.max(5, xp - prev.x);
    nb.h = Math.max(5, yp - prev.y);
  }
  if (forceA4) {
    nb.w = nb.h / 1.414;
    if (nb.x + nb.w > 100) nb.w = 100 - nb.x;
  }
  return nb;
};

export const DEFAULT_CROP = { x: 10, y: 10, w: 80, h: 80 };

export const applySobelEdgeDetection = (imageData, w, h) => {
  const data = imageData.data;
  const gray = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    gray[i] = 0.299 * data[o] + 0.587 * data[o + 1] + 0.114 * data[o + 2];
  }
  const edges = new Float32Array(w * h);
  let maxEdge = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const gx =
        -gray[(y - 1) * w + (x - 1)] + gray[(y - 1) * w + (x + 1)]
        - 2 * gray[y * w + (x - 1)] + 2 * gray[y * w + (x + 1)]
        - gray[(y + 1) * w + (x - 1)] + gray[(y + 1) * w + (x + 1)];
      const gy =
        -gray[(y - 1) * w + (x - 1)] - 2 * gray[(y - 1) * w + x] - gray[(y - 1) * w + (x + 1)]
        + gray[(y + 1) * w + (x - 1)] + 2 * gray[(y + 1) * w + x] + gray[(y + 1) * w + (x + 1)];
      const mag = Math.sqrt(gx * gx + gy * gy);
      edges[y * w + x] = mag;
      if (mag > maxEdge) maxEdge = mag;
    }
  }
  return { edges, maxEdge };
};

export const findEdgeBounds = (edges, w, h, threshold) => {
  let minX = w, maxX = 0, minY = h, maxY = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (edges[y * w + x] > threshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return { minX, maxX, minY, maxY };
};
