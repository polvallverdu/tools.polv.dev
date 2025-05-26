// Color conversion utilities
export function hexToRgb(hex: string): [number, number, number] | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : null;
}

export function rgbToHex(r: number, g: number, b: number): string {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).padStart(6, "0");
}

export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360;
  s /= 100;
  l /= 100;

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  if (s === 0) {
    const gray = Math.round(l * 255);
    return [gray, gray, gray];
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const r = hue2rgb(p, q, h + 1 / 3);
  const g = hue2rgb(p, q, h);
  const b = hue2rgb(p, q, h - 1 / 3);

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

export function rgbToHwb(r: number, g: number, b: number): [number, number, number] {
  const [h] = rgbToHsl(r, g, b);
  const w = (Math.min(r, g, b) / 255) * 100;
  const bl = (1 - Math.max(r, g, b) / 255) * 100;
  return [h, Math.round(w), Math.round(bl)];
}

export function hwbToRgb(h: number, w: number, bl: number): [number, number, number] {
  w /= 100;
  bl /= 100;

  if (w + bl >= 1) {
    const gray = Math.round((w / (w + bl)) * 255);
    return [gray, gray, gray];
  }

  const [rVal, gVal, bVal] = hslToRgb(h, 100, 50); // Use different names to avoid conflict
  const nr = rVal / 255;
  const ng = gVal / 255;
  const nb = bVal / 255;

  return [
    Math.round((nr * (1 - w - bl) + w) * 255),
    Math.round((ng * (1 - w - bl) + w) * 255),
    Math.round((nb * (1 - w - bl) + w) * 255),
  ];
}

// OKLAB and OKLCH conversion (simplified)
// For more accurate conversions, a dedicated library is recommended.
export function rgbToOklab(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;

  const lr = r <= 0.04045 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  const lg = g <= 0.04045 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  const lb = b <= 0.04045 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const sVal = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb; // Renamed to avoid conflict

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(sVal);

  return [
    0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  ];
}

export function oklabToRgb(l: number, a: number, b: number): [number, number, number] {
  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.291485548 * b;

  const lVal = l_ * l_ * l_;
  const mVal = m_ * m_ * m_;
  const sVal = s_ * s_ * s_;

  let r = +4.0767416621 * lVal - 3.3077115913 * mVal + 0.2309699292 * sVal;
  let g = -1.2684380046 * lVal + 2.6097574011 * mVal - 0.3413193965 * sVal;
  let bl = -0.0041960863 * lVal - 0.7034186147 * mVal + 1.707614701 * sVal;

  // sRGB
  r = r > 0.0031308 ? 1.055 * Math.pow(r, 1.0 / 2.4) - 0.055 : 12.92 * r;
  g = g > 0.0031308 ? 1.055 * Math.pow(g, 1.0 / 2.4) - 0.055 : 12.92 * g;
  bl = bl > 0.0031308 ? 1.055 * Math.pow(bl, 1.0 / 2.4) - 0.055 : 12.92 * bl;

  return [
    Math.max(0, Math.min(1, r)) * 255,
    Math.max(0, Math.min(1, g)) * 255,
    Math.max(0, Math.min(1, bl)) * 255,
  ].map(Math.round) as [number, number, number];
}

export function oklabToOklch(l: number, a: number, b: number): [number, number, number] {
  const c = Math.sqrt(a * a + b * b);
  let h = (Math.atan2(b, a) * 180) / Math.PI;
  if (h < 0) h += 360;
  return [l, c, h];
}

export function oklchToOklab(l: number, c: number, h: number): [number, number, number] {
  const rad = h * (Math.PI / 180);
  const a = c * Math.cos(rad);
  const b = c * Math.sin(rad);
  return [l, a, b];
}

// Parsers for CSS color strings
export function parseHex(str: string): string | null {
  const match = str.match(/^#?([a-f0-9]{6}|[a-f0-9]{3})$/i);
  if (!match) return null;
  let hex = match[1];
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((char) => char + char)
      .join("");
  }
  return `#${hex}`;
}

export function parseRgb(str: string): [number, number, number] | null {
  const match = str.match(
    /^rgba?\(\s*(\d+)(?:\s*,?\s*|\s+)(\d+)(?:\s*,?\s*|\s+)(\d+)(?:(?:\s*,?\s*|\s*\/\s*)(\d*\.?\d+))?\s*\)$/i,
  );
  if (!match) return null;
  const r = parseInt(match[2], 10);
  const g = parseInt(match[3], 10);
  const b = parseInt(match[4], 10);
  // Alpha is ignored for now in the main color object, but could be stored separately
  if (r > 255 || g > 255 || b > 255 || r < 0 || g < 0 || b < 0) return null;
  return [r, g, b];
}

export function parseHsl(str: string): [number, number, number] | null {
  const match = str.match(
    /^hsla?\(\s*(\d+)(?:deg)?(?:\s*,?\s*|\s+)(\d+)%(?:\s*,?\s*|\s+)(\d+)%(?:(?:\s*,?\s*|\s*\/\s*)(\d*\.?\d+))?\s*\)$/i,
  );
  if (!match) return null;
  const h = parseInt(match[2], 10);
  const s = parseInt(match[3], 10);
  const l = parseInt(match[4], 10);
  // Alpha is ignored for now
  if (h > 360 || s > 100 || l > 100 || h < 0 || s < 0 || l < 0) return null;
  return [h, s, l];
}

export function parseHwb(str: string): [number, number, number] | null {
  const match = str.match(
    /^hwb\(\s*(\d+)(?:deg)?\s+(\d+)%\s+(\d+)%(?:\s*\/\s*(\d*\.?\d+))?\s*\)$/i,
  );
  if (!match) return null;
  const h = parseInt(match[1], 10);
  const w = parseInt(match[2], 10);
  const b = parseInt(match[3], 10);
  // Alpha is ignored for now
  if (h > 360 || w > 100 || b > 100 || h < 0 || w < 0 || b < 0) return null;
  return [h, w, b];
}

export function parseOklab(str: string): [number, number, number] | null {
  const match = str.match(
    /^oklab\(\s*(\d*\.?\d+)%?\s+(-?\d*\.?\d+)\s+(-?\d*\.?\d+)(?:\s*\/\s*(\d*\.?\d+))?\s*\)$/i,
  );
  if (!match) return null;
  // Oklab L is 0-1 or 0%-100%, a and b are roughly -0.4 to 0.4
  let l = parseFloat(match[1]);
  if (match[1].includes("%")) l /= 100;
  const a = parseFloat(match[2]);
  const b = parseFloat(match[3]);
  // Alpha is ignored for now
  if (l < 0 || l > 1 || a < -0.5 || a > 0.5 || b < -0.5 || b > 0.5) return null; // Approximate valid ranges
  return [l, a, b];
}

export function parseOklch(str: string): [number, number, number] | null {
  const match = str.match(
    /^oklch\(\s*(\d*\.?\d+)%?\s+(\d*\.?\d+)\s+(\d+)(?:deg)?(?:\s*\/\s*(\d*\.?\d+))?\s*\)$/i,
  );
  if (!match) return null;
  // Oklch L is 0-1 or 0%-100%, C is roughly 0-0.4, H is 0-360
  let l = parseFloat(match[1]);
  if (match[1].includes("%")) l /= 100;
  const c = parseFloat(match[2]);
  const h = parseInt(match[3], 10);
  // Alpha is ignored for now
  if (l < 0 || l > 1 || c < 0 || c > 0.5 || h < 0 || h > 360) return null; // Approximate valid ranges
  return [l, c, h];
}
