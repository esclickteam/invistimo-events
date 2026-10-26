import { STUDIO_FONT_STYLESHEET } from "@/lib/invitationStudio/fonts";

/**
 * html2canvas skips SVG text, and soft-motion templates start that text at
 * opacity 0. Export therefore rasterizes the gated SVG itself, with the
 * OFL faces inlined so Hebrew survives outside the live page.
 */

let inlinedFonts: Promise<string> | null = null;

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunk = 0x2000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return btoa(binary);
}

export function stripStudioMotion(svg: string) {
  return svg
    .replace(/<style>([\s\S]*?)<\/style>/, (_match, css: string) => {
      const faces = [...String(css).matchAll(/@font-face\s*\{[\s\S]*?\}/g)].map(
        (match) => match[0]
      );
      return `<style>${faces.join("\n")}</style>`;
    })
    .replace(/\sclass="studio-motion"/g, "")
    .replace(/\sclass="s-in"/g, "")
    .replace(/\sclass="s-float"/g, "")
    .replace(/\sstyle="animation-delay:[^"]*"/g, "");
}

async function loadInlinedFontCss() {
  if (!inlinedFonts) {
    inlinedFonts = (async () => {
      const cssResponse = await fetch(STUDIO_FONT_STYLESHEET);
      if (!cssResponse.ok) throw new Error("FONT_CSS");
      let css = await cssResponse.text();
      const urls = [
        ...new Set([...css.matchAll(/url\((https:[^)]+)\)/g)].map((match) => match[1])),
      ];
      const replacements = await Promise.all(
        urls.map(async (url) => {
          const file = await fetch(url);
          if (!file.ok) throw new Error("FONT_FILE");
          const bytes = new Uint8Array(await file.arrayBuffer());
          const mime = url.includes(".woff2")
            ? "font/woff2"
            : url.includes(".woff")
              ? "font/woff"
              : "font/ttf";
          return [url, `data:${mime};base64,${bytesToBase64(bytes)}`] as const;
        })
      );
      for (const [url, dataUrl] of replacements) {
        css = css.split(url).join(dataUrl);
      }
      return css;
    })().catch((error) => {
      inlinedFonts = null;
      throw error;
    });
  }
  return inlinedFonts;
}

export async function prepareSvgForRaster(svg: string) {
  const css = await loadInlinedFontCss();
  const viewBox = svg.match(/viewBox="0 0 ([0-9.]+) ([0-9.]+)"/);
  const width = Number(viewBox?.[1] || 1080);
  const height = Number(viewBox?.[2] || 1920);
  const next = stripStudioMotion(svg)
    .replace("<style>", `<style>\n${css}\ntext { opacity: 1; animation: none; }\n`)
    .replace('width="100%"', `width="${width}"`)
    .replace('height="100%"', `height="${height}"`);
  return { svg: next, width, height };
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("SVG_IMAGE"));
    image.src = url;
  });
}

export async function rasterizeSvg(svg: string, scale = 2) {
  const prepared = await prepareSvgForRaster(svg);
  const url = URL.createObjectURL(new Blob([prepared.svg], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const image = await loadImage(url);
    await image.decode?.();
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(prepared.width * scale);
    canvas.height = Math.round(prepared.height * scale);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("CANVAS");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}
