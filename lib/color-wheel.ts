// Conversii între culoarea #rrggbb și modelul HSV (nuanță, saturație, luminozitate), folosite de roata de culori din ColorPicker.
export type Hsv = { h: number; s: number; v: number };

// Nuanța în grade (0-360), saturația și luminozitatea între 0 și 1.
export function hsvToHex({ h, s, v }: Hsv) {
  const hue = ((h % 360) + 360) % 360;
  const chroma = v * s;
  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = v - chroma;
  const [r, g, b] =
    hue < 60 ? [chroma, x, 0]
    : hue < 120 ? [x, chroma, 0]
    : hue < 180 ? [0, chroma, x]
    : hue < 240 ? [0, x, chroma]
    : hue < 300 ? [x, 0, chroma]
    : [chroma, 0, x];
  const toHex = (channel: number) => Math.round((channel + m) * 255).toString(16).padStart(2, "0");

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Culoarea #rrggbb în HSV; o valoare invalidă devine alb.
export function hexToHsv(hex: string): Hsv {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());

  if (!match) {
    return { h: 0, s: 0, v: 1 };
  }

  const [r, g, b] = [match[1], match[2], match[3]].map((part) => parseInt(part, 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;

  if (delta > 0) {
    if (max === r) {
      h = ((g - b) / delta) % 6;
    } else if (max === g) {
      h = (b - r) / delta + 2;
    } else {
      h = (r - g) / delta + 4;
    }

    h = (h * 60 + 360) % 360;
  }

  return { h, s: max === 0 ? 0 : delta / max, v: max };
}
