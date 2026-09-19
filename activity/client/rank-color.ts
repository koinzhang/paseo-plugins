type Rgb = [number, number, number];

function parseHex(value: string): Rgb | null {
  const hex = value.trim().replace(/^#/, "");
  const full = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

function rgbToHsl([r, g, b]: Rgb): [number, number, number] {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const lightness = (max + min) / 2;
  if (max === min) return [0, 0, lightness];
  const delta = max - min;
  const saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  const hue =
    max === rr
      ? ((gg - bb) / delta + (gg < bb ? 6 : 0)) / 6
      : max === gg
        ? ((bb - rr) / delta + 2) / 6
        : ((rr - gg) / delta + 4) / 6;
  return [hue * 360, saturation, lightness];
}

function hslToHex(hue: number, saturation: number, lightness: number): string {
  const h = ((hue % 360) + 360) % 360;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const second = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
  const offset = lightness - chroma / 2;
  const [r, g, b] =
    h < 60
      ? [chroma, second, 0]
      : h < 120
        ? [second, chroma, 0]
        : h < 180
          ? [0, chroma, second]
          : h < 240
            ? [0, second, chroma]
            : h < 300
              ? [second, 0, chroma]
              : [chroma, 0, second];
  return `#${[r, g, b]
    .map((value) => Math.round((value + offset) * 255).toString(16).padStart(2, "0"))
    .join("")}`;
}

const GOLDEN_ANGLE = 137.508;

export function mcpServerColor(server: string, accent: string): string {
  const rgb = parseHex(accent);
  if (!rgb) return accent;
  let hash = 0;
  for (let i = 0; i < server.length; i += 1) {
    hash = (hash * 31 + server.charCodeAt(i)) >>> 0;
  }
  const [baseHue, baseSaturation, baseLightness] = rgbToHsl(rgb);
  const hue = (baseHue + hash * GOLDEN_ANGLE) % 360;
  const saturation = Math.min(0.75, Math.max(0.45, baseSaturation));
  const lightness = Math.min(0.7, Math.max(0.32, baseLightness));
  return hslToHex(hue, saturation, lightness);
}
