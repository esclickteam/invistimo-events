import { STUDIO_FONT_STYLESHEET } from "@/lib/invitationStudio/fonts";
import { motifMarkup } from "@/lib/invitationStudio/ornaments";
import type {
  PaletteToken,
  RenderModel,
  StudioLayer,
  StudioPalette,
} from "@/lib/invitationStudio/types";

const HEX = /^#[0-9a-fA-F]{6}$/;

export function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function safeColor(value: string | undefined, fallback: string) {
  if (value && HEX.test(value)) return value;
  return HEX.test(fallback) ? fallback : "#1f1a17";
}

function tokenColor(
  token: PaletteToken | undefined,
  explicit: string | undefined,
  palette: StudioPalette,
  fallback: string
) {
  if (explicit && HEX.test(explicit)) return explicit;
  if (token && HEX.test(palette[token])) return palette[token];
  return safeColor(explicit, fallback);
}

function wrapText(text: string, fontSize: number, width: number) {
  const maxChars = Math.max(6, Math.floor(width / (fontSize * 0.56)));
  const lines: string[] = [];
  for (const paragraph of text.split(/\n/)) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push("");
      continue;
    }
    let current = "";
    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (next.length > maxChars && current) {
        lines.push(current);
        current = word;
      } else {
        current = next;
      }
    }
    if (current) lines.push(current);
  }
  return lines.slice(0, 8);
}

function paintLayer(
  layer: StudioLayer & { text?: string; href?: string },
  palette: StudioPalette,
  index: number
) {
  const opacity = "opacity" in layer && layer.opacity != null ? layer.opacity : 1;
  if (layer.type === "shape") {
    const fill = tokenColor(layer.fillToken, layer.fill, palette, "none");
    const stroke = tokenColor(layer.strokeToken, layer.stroke, palette, "none");
    const rotate = layer.rotate
      ? ` transform="rotate(${layer.rotate} ${layer.x + layer.w / 2} ${layer.y + layer.h / 2})"`
      : "";
    if (layer.shape === "ellipse") {
      return `<ellipse cx="${layer.x + layer.w / 2}" cy="${layer.y + layer.h / 2}" rx="${layer.w / 2}" ry="${layer.h / 2}" fill="${fill}" stroke="${stroke}" stroke-width="${layer.strokeWidth || 0}" opacity="${opacity}"${rotate}/>`;
    }
    if (layer.shape === "line") {
      return `<line x1="${layer.x}" y1="${layer.y}" x2="${layer.x + layer.w}" y2="${layer.y + layer.h}" stroke="${stroke === "none" ? fill : stroke}" stroke-width="${layer.strokeWidth || 1}" opacity="${opacity}"/>`;
    }
    if (layer.shape === "arch") {
      const x = layer.x;
      const y = layer.y;
      const w = layer.w;
      const h = layer.h;
      return `<path d="M${x} ${y + h} V ${y + h * 0.38} C ${x} ${y + h * 0.05}, ${x + w} ${y + h * 0.05}, ${x + w} ${y + h * 0.38} V ${y + h} Z" fill="${fill}" stroke="${stroke}" stroke-width="${layer.strokeWidth || 0}" opacity="${opacity}"/>`;
    }
    return `<rect x="${layer.x}" y="${layer.y}" width="${layer.w}" height="${layer.h}" rx="${layer.radius || 0}" fill="${fill}" stroke="${stroke}" stroke-width="${layer.strokeWidth || 0}" opacity="${opacity}"${rotate}/>`;
  }

  if (layer.type === "ornament") {
    const color = tokenColor(layer.token, layer.color, palette, palette.accent);
    const flip =
      layer.flip === "x"
        ? `translate(${layer.w} 0) scale(-1 1)`
        : layer.flip === "y"
          ? `translate(0 ${layer.h}) scale(1 -1)`
          : layer.flip === "both"
            ? `translate(${layer.w} ${layer.h}) scale(-1 -1)`
            : "";
    const rotate = layer.rotate
      ? `rotate(${layer.rotate} ${layer.w / 2} ${layer.h / 2})`
      : "";
    return `<g opacity="${opacity}" transform="translate(${layer.x} ${layer.y})" class="s-float" style="animation-delay:${(index % 5) * 0.4}s"><g transform="${flip} ${rotate}">${motifMarkup(layer.motif, layer.w, layer.h, color)}</g></g>`;
  }

  if (layer.type === "image") {
    const href = layer.href || "";
    const frame = tokenColor(layer.frameToken, undefined, palette, palette.accent);
    const clip = `clip-${index}`;
    const image = href
      ? `<image href="${escapeXml(href)}" x="${layer.x}" y="${layer.y}" width="${layer.w}" height="${layer.h}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${clip})"/>`
      : `<rect x="${layer.x}" y="${layer.y}" width="${layer.w}" height="${layer.h}" rx="${layer.radius || 0}" fill="${palette.muted}" opacity="0.28"/>`;
    return `
      <clipPath id="${clip}"><rect x="${layer.x}" y="${layer.y}" width="${layer.w}" height="${layer.h}" rx="${layer.radius || 0}"/></clipPath>
      ${image}
      <rect x="${layer.x}" y="${layer.y}" width="${layer.w}" height="${layer.h}" rx="${layer.radius || 0}" fill="none" stroke="${frame}" stroke-width="2"/>
    `;
  }

  const text = layer.text || "";
  if (!text.trim()) return "";
  const color = tokenColor(layer.token, layer.color, palette, palette.ink);
  const lines = wrapText(text, layer.fontSize, layer.w);
  const lineHeight = (layer.lineHeight || 1.25) * layer.fontSize;
  const anchor =
    layer.align === "center" ? "middle" : layer.align === "left" ? "end" : "start";
  const x =
    layer.align === "center"
      ? layer.x + layer.w / 2
      : layer.align === "left"
        ? layer.x
        : layer.x + layer.w;
  const tspans = lines
    .map(
      (line, lineIndex) =>
        `<tspan x="${x}" dy="${lineIndex === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`
    )
    .join("");
  return `<text class="s-in" style="animation-delay:${index * 0.08}s" x="${x}" y="${layer.y + layer.fontSize}" text-anchor="${anchor}" direction="rtl" unicode-bidi="plaintext" fill="${color}" font-family="${escapeXml(layer.fontFamily)}, 'Frank Ruhl Libre', serif" font-size="${layer.fontSize}" font-weight="${layer.weight || 500}" letter-spacing="${layer.letterSpacing || 0}">${tspans}</text>`;
}

export function renderModelToSvg(model: RenderModel): string {
  const { width, height, palette, motion } = model;
  const wash =
    model.background === "wash"
      ? `<rect width="${width}" height="${height}" fill="url(#studioWash)"/>`
      : "";
  const motionClass = motion === "soft" ? " studio-motion" : "";
  const body = model.layers.map((layer, index) => paintLayer(layer, palette, index)).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%" role="img" aria-label="הזמנה מעוצבת" class="${motionClass.trim()}" direction="rtl">
  <style>
    ${
      model.fontFace?.dataUrl?.startsWith("data:") &&
      !model.fontFace.dataUrl.startsWith("data:image/")
        ? `@font-face { font-family: '${escapeXml(model.fontFace.family)}'; src: url('${model.fontFace.dataUrl}') format('woff2'); font-display: swap; }`
        : ""
    }
    @import url('${STUDIO_FONT_STYLESHEET}');
    .studio-motion .s-in { animation: studioIn 1s ease both; }
    .studio-motion .s-float { animation: studioFloat 7s ease-in-out infinite; }
    @keyframes studioIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
    @keyframes studioFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
  </style>
  <defs>
    <linearGradient id="studioWash" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${safeColor(palette.paper, "#fff")}"/>
      <stop offset="100%" stop-color="${safeColor(palette.muted, "#eee")}"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="${safeColor(palette.paper, "#fffaf4")}"/>
  ${wash}
  ${body}
</svg>`;
}
