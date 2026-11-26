const DARKEST_LGT = 0.5;

const imageCache = new Map();
const grayscaleSheetCache = new WeakMap();

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export function hslToRgb(hNorm, sNorm, lNorm) {
  const h = ((hNorm % 1) + 1) % 1;
  const s = clamp(sNorm, 0, 1);
  const l = clamp(lNorm, 0, 1);

  if (s === 0) {
    const val = Math.round(l * 255);
    return [val, val, val];
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue2rgb = (t) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };

  return [
    Math.round(hue2rgb(h + 1 / 3) * 255),
    Math.round(hue2rgb(h) * 255),
    Math.round(hue2rgb(h - 1 / 3) * 255),
  ];
}

export function rgbToHsl(r, g, b) {
  const rn = clamp(r, 0, 255) / 255;
  const gn = clamp(g, 0, 255) / 255;
  const bn = clamp(b, 0, 255) / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      default:
        h = (rn - gn) / d + 4;
        break;
    }
    h /= 6;
  }
  return { h, s, l };
}

export function rgbToHex(r, g, b) {
  return (
    '#' +
    [clamp(Math.round(r), 0, 255), clamp(Math.round(g), 0, 255), clamp(Math.round(b), 0, 255)]
      .map((n) => n.toString(16).padStart(2, '0'))
      .join('')
  );
}

export function hexToRgb(hex) {
  const clean = String(hex || '').replace(/^#/, '').trim();
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  if (!/^[0-9a-f]{6}$/i.test(full)) return [255, 192, 64];
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

// Mirrors DDNet ColorHSLA::Pack(DARKEST_LGT=0.5, false) & UnclampLighting
export function hslToDdnetCode(hDeg, sPct, lPct) {
  const h = (((Number(hDeg) || 0) % 360) + 360) % 360 / 360;
  const s = clamp((Number(sPct) || 0) / 100, 0, 1);
  const lUnclamped = clamp((Number(lPct) || 0) / 100, DARKEST_LGT, 1);
  const lPacked = clamp((lUnclamped - DARKEST_LGT) / (1 - DARKEST_LGT), 0, 1);
  return (
    ((Math.round(h * 255) & 0xff) << 16) |
    ((Math.round(s * 255) & 0xff) << 8) |
    (Math.round(lPacked * 255) & 0xff)
  ) >>> 0;
}

export function ddnetCodeToHsl(rawCode) {
  const code = clamp(Math.round(Number(rawCode) || 0), 0, 0xffffff) >>> 0;
  const h = ((code >>> 16) & 0xff) / 255;
  const s = ((code >>> 8) & 0xff) / 255;
  const l = DARKEST_LGT + ((code & 0xff) / 255) * (1 - DARKEST_LGT);
  const rgb = hslToRgb(h, s, l);
  return {
    code,
    hDeg: Math.round(h * 360),
    sPct: Math.round(s * 100),
    lPct: Math.round(l * 100),
    rgb,
    hex: rgbToHex(rgb[0], rgb[1], rgb[2]),
  };
}

export function hexToDdnetCode(hex) {
  const [r, g, b] = hexToRgb(hex);
  const { h, s, l } = rgbToHsl(r, g, b);
  return hslToDdnetCode(h * 360, s * 100, l * 100);
}

export function buildSkinImageUrl(skin, { uhd = false, download = false } = {}) {
  const params = new URLSearchParams({
    name: skin.name,
    type: skin.type === 'community' ? 'community' : 'normal',
  });
  if (uhd && skin.uhd) params.set('uhd', '1');
  if (download) params.set('download', '1');
  return `/api/skin-image?${params.toString()}`;
}

export function buildSkinConsoleCmds(skinName, customColor, bodyCode, feetCode) {
  const safeName = String(skinName || 'default').replaceAll('"', '\\"');
  const lines = [`player_skin "${safeName}"`, `player_use_custom_color ${customColor ? 1 : 0}`];
  if (customColor) {
    lines.push(`player_color_body ${Math.round(Number(bodyCode) || 0)}`);
    lines.push(`player_color_feet ${Math.round(Number(feetCode) || 0)}`);
  }
  return lines.join('; ');
}

export function loadSkinImage(url) {
  const key = String(url || '');
  if (!key) return Promise.reject(new Error('Missing skin URL'));
  if (imageCache.has(key)) return imageCache.get(key);

  const promise = new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => {
      imageCache.delete(key);
      reject(new Error(`Failed to load skin image: ${key}`));
    };
    img.src = key;
  });

  if (imageCache.size > 160) {
    const oldestKey = imageCache.keys().next().value;
    if (oldestKey) imageCache.delete(oldestKey);
  }
  imageCache.set(key, promise);
  return promise;
}

// Computes DDNet's grayscale weight-reordered base spritesheet once per loaded image
function getGrayscaleBaseSheet(img) {
  const cached = grayscaleSheetCache.get(img);
  if (cached) return cached;

  const w = Math.min(img.naturalWidth || img.width || 256, 512);
  const h = Math.max(4, Math.round((w / (img.naturalWidth || 256)) * (img.naturalHeight || 128)));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);

  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // Convert entire spritesheet to grayscale per CSkins::ConvertToGrayscale
  for (let i = 0; i < data.length; i += 4) {
    const gray = Math.round((data[i] + data[i + 1] + data[i + 2]) / 3);
    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
  }

  // Modal luminance byte in body region (0..3/8*w, 0..3/4*h) with alpha > 128
  const bodyW = Math.floor((w * 3) / 8);
  const bodyH = Math.floor((h * 3) / 4);
  const freq = new Int32Array(256);

  for (let y = 0; y < bodyH; y++) {
    for (let x = 0; x < bodyW; x++) {
      const idx = (y * w + x) * 4;
      if (data[idx + 3] > 128) {
        freq[data[idx]] += 1;
      }
    }
  }

  let orgWeight = 1;
  for (let i = 1; i < 256; i++) {
    if (freq[orgWeight] < freq[i]) orgWeight = i;
  }

  const newWeight = 192;
  const invOrg = orgWeight > 0 ? newWeight / orgWeight : 1;
  const upperDenom = Math.max(1, 255 - orgWeight);
  const lut = new Uint8Array(256);
  for (let v = 0; v < 256; v++) {
    lut[v] =
      v <= orgWeight
        ? Math.round(v * invOrg)
        : Math.round(((v - orgWeight) / upperDenom) * (255 - newWeight) + newWeight);
  }

  for (let y = 0; y < bodyH; y++) {
    for (let x = 0; x < bodyW; x++) {
      const idx = (y * w + x) * 4;
      const mapped = lut[data[idx]];
      data[idx] = mapped;
      data[idx + 1] = mapped;
      data[idx + 2] = mapped;
    }
  }

  const result = { w, h, grayPixels: data };
  grayscaleSheetCache.set(img, result);
  return result;
}

function buildTintedSpriteSheet(img, bodyRgb, feetRgb) {
  const base = getGrayscaleBaseSheet(img);
  const { w, h, grayPixels } = base;
  const sheet = document.createElement('canvas');
  sheet.width = w;
  sheet.height = h;
  const ctx = sheet.getContext('2d');
  const out = ctx.createImageData(w, h);
  const dst = out.data;

  // Feet region is grid columns [6..8), rows [1..3) -> x >= 0.75*w, y in [0.25*h, 0.75*h)
  const feetX0 = Math.floor((w * 6) / 8);
  const feetY0 = Math.floor((h * 1) / 4);
  const feetY1 = Math.floor((h * 3) / 4);

  const [br, bg, bb] = bodyRgb;
  const [fr, fg, fb] = feetRgb;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const a = grayPixels[idx + 3];
      if (a === 0) {
        dst[idx + 3] = 0;
        continue;
      }
      const v = grayPixels[idx] / 255;
      const isFoot = x >= feetX0 && y >= feetY0 && y < feetY1;
      const [cr, cg, cb] = isFoot ? [fr, fg, fb] : [br, bg, bb];
      dst[idx] = Math.round(v * cr);
      dst[idx + 1] = Math.round(v * cg);
      dst[idx + 2] = Math.round(v * cb);
      dst[idx + 3] = a;
    }
  }

  ctx.putImageData(out, 0, 0);
  return sheet;
}

const EYE_RECT_COL = {
  normal: 2,
  blink: 2,
  angry: 3,
  pain: 4,
  happy: 5,
  dead: 6,
  surprise: 7,
};

function drawCenteredSprite(ctx, sheet, sx, sy, sw, sh, cx, cy, dw, dh, flipX = false) {
  ctx.save();
  ctx.translate(cx, cy);
  if (flipX) ctx.scale(-1, 1);
  ctx.drawImage(sheet, sx, sy, sw, sh, -dw / 2, -dh / 2, dw, dh);
  ctx.restore();
}

export function renderTeeToCanvas(
  canvas,
  img,
  {
    size = 96,
    customColor = false,
    bodyCode = 65408,
    feetCode = 65408,
    emote = 'normal',
    lookX = 0.25,
    lookY = 0,
  } = {}
) {
  if (!canvas || !img) return;
  const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
  const pxW = Math.round(size * dpr);
  if (canvas.width !== pxW || canvas.height !== pxW) {
    canvas.width = pxW;
    canvas.height = pxW;
  }

  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, size, size);

  const sheet = customColor
    ? buildTintedSpriteSheet(img, ddnetCodeToHsl(bodyCode).rgb, ddnetCodeToHsl(feetCode).rgb)
    : img;

  const sw = sheet.width || sheet.naturalWidth || 256;
  const sh = sheet.height || sheet.naturalHeight || 128;
  const cw = sw / 8;
  const ch = sh / 4;

  // Idle pose keyframes from datasrc/content.py + RenderTee6
  const baseSize = size * 0.66;
  const animScale = baseSize / 64;
  const cx = size * 0.5;
  const cy = size * 0.53;

  const bodyX = cx;
  const bodyY = cy - 4 * animScale;
  const backFootX = cx - 7 * animScale;
  const backFootY = cy + 10 * animScale;
  const frontFootX = cx + 7 * animScale;
  const frontFootY = cy + 10 * animScale;

  // Sprites from datasrc/content.py
  const rBody = [0, 0, 3 * cw, 3 * ch];
  const rBodyOut = [3 * cw, 0, 3 * cw, 3 * ch];
  const rFoot = [6 * cw, 1 * ch, 2 * cw, 1 * ch];
  const rFootOut = [6 * cw, 2 * ch, 2 * cw, 1 * ch];

  const footW = baseSize;
  const footH = baseSize / 2;
  const flipFeet = lookX < 0;

  // Pass 0: Outlines (back foot outline -> body outline -> front foot outline)
  drawCenteredSprite(ctx, sheet, ...rFootOut, backFootX, backFootY, footW, footH, flipFeet);
  drawCenteredSprite(ctx, sheet, ...rBodyOut, bodyX, bodyY, baseSize, baseSize, false);
  drawCenteredSprite(ctx, sheet, ...rFootOut, frontFootX, frontFootY, footW, footH, flipFeet);

  // Pass 1: Fills (back foot -> body -> eyes -> front foot)
  drawCenteredSprite(ctx, sheet, ...rFoot, backFootX, backFootY, footW, footH, flipFeet);
  drawCenteredSprite(ctx, sheet, ...rBody, bodyX, bodyY, baseSize, baseSize, false);

  const len = Math.hypot(lookX, lookY);
  const dx = len > 1 ? lookX / len : lookX;
  const dy = len > 1 ? lookY / len : lookY;

  const eyeCol = EYE_RECT_COL[emote] ?? EYE_RECT_COL.normal;
  const eyeScale = baseSize * 0.4;
  const eyeH = emote === 'blink' ? baseSize * 0.15 : eyeScale;
  const eyeSep = (0.075 - 0.01 * Math.abs(dx)) * baseSize;
  const eyeOffX = dx * 0.125 * baseSize;
  const eyeOffY = (-0.05 + dy * 0.1) * baseSize;

  drawCenteredSprite(
    ctx,
    sheet,
    eyeCol * cw,
    3 * ch,
    cw,
    ch,
    bodyX - eyeSep + eyeOffX,
    bodyY + eyeOffY,
    eyeScale,
    eyeH,
    false
  );
  drawCenteredSprite(
    ctx,
    sheet,
    eyeCol * cw,
    3 * ch,
    cw,
    ch,
    bodyX + eyeSep + eyeOffX,
    bodyY + eyeOffY,
    eyeScale,
    eyeH,
    true
  );

  drawCenteredSprite(ctx, sheet, ...rFoot, frontFootX, frontFootY, footW, footH, flipFeet);
}
