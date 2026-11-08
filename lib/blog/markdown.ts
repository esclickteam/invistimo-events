export type PostBlock =
  | { type: "p"; text: string }
  | { type: "h2"; id: string; text: string }
  | { type: "h3"; id: string; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "image"; alt: string; src: string };

export type RichToken =
  | { type: "text"; text: string }
  | { type: "strong"; text: string }
  | { type: "link"; text: string; href: string; external: boolean }
  | { type: "image"; alt: string; src: string };

const TOKEN = /(!\[[^\]]*\]\([^)\s]+\)|\[[^\]]+\]\([^)\s]+\)|\*\*[^*\n]+\*\*)/g;

/** Site-relative links, or https only. javascript:, data: and protocol-relative URLs are dropped. */
export function safeHref(raw: string): { href: string; external: boolean } | null {
  const href = raw.trim();
  if (!href || /[\s<>"']/.test(href) || href.includes("\\")) return null;
  if (href.startsWith("/") && !href.startsWith("//")) return { href, external: false };
  try {
    const url = new URL(href);
    if (url.protocol !== "https:") return null;
    if (url.username || url.password) return null;
    return { href: url.toString(), external: true };
  } catch {
    return null;
  }
}

/** Images stay on this site. No remote SVG, data URLs, or path traversal. */
export function safeImageSrc(raw: string): string | null {
  const href = raw.trim();
  if (!href.startsWith("/") || href.startsWith("//")) return null;
  if (href.includes("..") || href.includes("\\") || /[\s<>"']/.test(href)) return null;
  const path = href.split("?")[0].split("#")[0];
  if (!/\.(?:jpe?g|png|webp|gif)$/i.test(path)) return null;
  return path;
}

export function richTokens(text: string): RichToken[] {
  const tokens: RichToken[] = [];
  let last = 0;
  for (const match of text.matchAll(TOKEN)) {
    const index = match.index ?? 0;
    if (index > last) tokens.push({ type: "text", text: text.slice(last, index) });
    const token = match[0];
    if (token.startsWith("**")) {
      tokens.push({ type: "strong", text: token.slice(2, -2) });
    } else if (token.startsWith("!")) {
      const image = token.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/);
      const src = image ? safeImageSrc(image[2]) : null;
      if (image && src && image[1].trim()) tokens.push({ type: "image", alt: image[1].trim(), src });
      else tokens.push({ type: "text", text: image?.[1] || "" });
    } else {
      const link = token.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
      const safe = link ? safeHref(link[2]) : null;
      if (link && safe) tokens.push({ type: "link", text: link[1], ...safe });
      else tokens.push({ type: "text", text: link?.[1] || token });
    }
    last = index + token.length;
  }
  if (last < text.length) tokens.push({ type: "text", text: text.slice(last) });
  return tokens;
}

function listFromChunk(text: string) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return null;
  if (lines.every((line) => line.startsWith("- ") || line.startsWith("* "))) {
    return { type: "ul" as const, items: lines.map((line) => line.replace(/^[-*]\s+/, "").trim()) };
  }
  if (lines.every((line) => /^\d+\.\s+/.test(line))) {
    return { type: "ol" as const, items: lines.map((line) => line.replace(/^\d+\.\s+/, "").trim()) };
  }
  return null;
}

function tableCells(line: string) {
  return line
    .slice(1, -1)
    .split("|")
    .map((cell) => cell.trim());
}

function tableFromChunk(text: string) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2 || !lines.every((line) => line.startsWith("|") && line.endsWith("|"))) return null;
  const headers = tableCells(lines[0]);
  const rows = lines
    .slice(1)
    .filter((line) => !/^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(line))
    .map((line) => {
      const cells = tableCells(line);
      if (cells.length < headers.length) return [...cells, ...Array(headers.length - cells.length).fill("")];
      return cells.slice(0, headers.length);
    })
    .filter((row) => row.some(Boolean));
  if (!headers.length || headers.some((header) => !header) || !rows.length) return null;
  return { headers, rows };
}

function imageFromChunk(text: string) {
  const match = text.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/);
  if (!match) return null;
  const src = safeImageSrc(match[2]);
  const alt = match[1].trim();
  if (!src || !alt) return null;
  return { alt, src };
}

export function blocksFromBody(body: string): PostBlock[] {
  const chunks = body.replace(/\r\n/g, "\n").split(/\n{2,}/);
  const blocks: PostBlock[] = [];
  let heading = 0;
  for (const chunk of chunks) {
    const text = chunk.trim();
    if (!text) continue;
    if (text.startsWith("### ")) {
      heading += 1;
      blocks.push({ type: "h3", id: `s-${heading}`, text: text.slice(4).trim() });
      continue;
    }
    if (text.startsWith("## ")) {
      heading += 1;
      blocks.push({ type: "h2", id: `s-${heading}`, text: text.slice(3).trim() });
      continue;
    }
    if (text.startsWith("# ")) continue;
    const image = imageFromChunk(text);
    if (image) {
      blocks.push({ type: "image", ...image });
      continue;
    }
    const list = listFromChunk(text);
    if (list) {
      blocks.push(list);
      continue;
    }
    const table = tableFromChunk(text);
    if (table) {
      blocks.push({ type: "table", ...table });
      continue;
    }
    blocks.push({ type: "p", text });
  }
  return blocks;
}
