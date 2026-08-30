export function htmlToPlainTextWithBreaks(input: HTMLElement | string) {
  const html = typeof input === "string" ? input : input.innerHTML || "";
  const text = html
    .replace(/&nbsp;/gi, " ")
    .replace(/<div><br\s*\/?><\/div>/gi, "\n")
    .replace(/<div>/gi, "\n")
    .replace(/<\/div>/gi, "")
    .replace(/<p>/gi, "")
    .replace(/<\/p>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n");

  return decodeHtml(text).replace(/^[ \t]+|[ \t]+$/g, "");
}

export function textHasBreaks(value: unknown) {
  return String(value || "").includes("\n");
}

export function isActivelyEditingText(root?: Element | null) {
  if (typeof document === "undefined") return false;
  const active = document.activeElement as HTMLElement | null;
  if (!active?.isContentEditable) return false;
  if (root && !root.contains(active)) return false;
  return true;
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
