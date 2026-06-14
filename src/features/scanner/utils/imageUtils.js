export const dataURLtoBlob = async (dataurl) => {
  const response = await fetch(dataurl);
  return await response.blob();
};

export const resizeToMax = (w, h, max) => {
  if (w > max) {
    const r = max / w;
    return { w: max, h: Math.round(h * r) };
  }
  return { w, h };
};

export const rotateCanvas = (img) => {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalHeight;
  canvas.height = img.naturalWidth;
  const ctx = canvas.getContext('2d');
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(90 * Math.PI / 180);
  ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
  return canvas;
};

export const flipCanvas = (img) => {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(img, 0, 0);
  return canvas;
};

export const getResizedCanvas = (img, MAX_SIZE) => {
  const canvas = document.createElement('canvas');
  let w = img.naturalWidth, h = img.naturalHeight;
  if (w > MAX_SIZE || h > MAX_SIZE) {
    if (w > h) {
      h = Math.round((h * MAX_SIZE) / w);
      w = MAX_SIZE;
    } else {
      w = Math.round((w * MAX_SIZE) / h);
      h = MAX_SIZE;
    }
  }
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d').drawImage(img, 0, 0, w, h);
  return canvas;
};
