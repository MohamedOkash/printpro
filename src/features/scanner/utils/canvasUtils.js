export const buildFinalCanvas = (srcCanvas, wmText, wmOpacity) => {
  const c = document.createElement('canvas');
  c.width = srcCanvas.width;
  c.height = srcCanvas.height;
  const ctx = c.getContext('2d');
  ctx.drawImage(srcCanvas, 0, 0);
  if (wmText) {
    ctx.save();
    ctx.translate(c.width / 2, c.height / 2);
    ctx.rotate(-Math.PI / 4);
    ctx.fillStyle = `rgba(0,0,0,${wmOpacity / 100})`;
    const fs = Math.max(20, c.width / 8);
    ctx.font = `bold ${fs}px Cairo,sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = -2; i <= 2; i++) {
      for (let j = -2; j <= 2; j++) {
        ctx.fillText(wmText, i * c.width * 0.45, j * c.height * 0.4);
      }
    }
    ctx.restore();
  }
  return c;
};

export const cropImageToBlob = (img, cropBox, quality) => {
  return new Promise(resolve => {
    const nw = img.naturalWidth, nh = img.naturalHeight;
    const c = document.createElement('canvas');
    const cw = (cropBox.w / 100) * nw;
    const ch = (cropBox.h / 100) * nh;
    c.width = cw;
    c.height = ch;
    c.getContext('2d').drawImage(
      img,
      (cropBox.x / 100) * nw, (cropBox.y / 100) * nh, cw, ch,
      0, 0, cw, ch
    );
    c.toBlob(resolve, 'image/jpeg', quality);
  });
};

export const renderPageWithFilters = (img, w, h, brightness, contrast, grayscale, invert, adaptThresh, shadowFix, hdSharpen, applyColorAdjustments, applyAdaptive, applyShadowRemoval, applySharpen) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);
  applyColorAdjustments(ctx, w, h, brightness, contrast, grayscale, invert);
  if (adaptThresh) applyAdaptive(ctx, w, h);
  if (shadowFix) applyShadowRemoval(ctx, w, h);
  if (hdSharpen) applySharpen(ctx, w, h);
  return c;
};
