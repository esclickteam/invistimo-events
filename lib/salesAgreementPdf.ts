import fs from "fs";
import path from "path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, type PDFFont, type PDFPage } from "pdf-lib";

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function money(value: unknown) {
  const amount = Number(value || 0);
  const safe = Number.isFinite(amount) ? amount : 0;
  return `${safe.toLocaleString("he-IL")} ₪`;
}

/** pdf-lib draws left-to-right. Reverse Hebrew letters so the archive reads RTL. */
export function visualHebrew(value: string) {
  const text = clean(value);
  if (!text) return "";
  const parts = text.split(/(\d[\d.,/:-]*|\s+)/);
  return parts
    .map((part) => {
      if (!part || /^\d[\d.,/:-]*$/.test(part) || /^\s+$/.test(part)) return part;
      return [...part].reverse().join("");
    })
    .reverse()
    .join("");
}

function drawLine(
  page: PDFPage,
  font: PDFFont,
  text: string,
  y: number,
) {
  const size = 12;
  const visual = visualHebrew(text);
  const width = font.widthOfTextAtSize(visual, size);
  const right = 555;
  page.drawText(visual, {
    x: Math.max(40, right - width),
    y,
    size,
    font,
  });
}

function signatureBytes(dataUrl: string) {
  const match = dataUrl.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/i);
  if (!match) return null;
  return {
    kind: match[1].toLowerCase() === "png" ? "png" : "jpg",
    bytes: Buffer.from(match[2], "base64"),
  };
}

export async function buildSignedAgreementPdf(document: Record<string, unknown>) {
  const fontPath = path.join(
    process.cwd(),
    "public",
    "fonts",
    "NotoSansHebrew-Regular.ttf",
  );
  const fontBytes = fs.readFileSync(fontPath);
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(fontBytes, { subset: true });
  const page = pdf.addPage([595, 842]);
  const client = (document.client || {}) as Record<string, unknown>;
  const event = (document.event || {}) as Record<string, unknown>;
  const pkg = (document.selectedPackage || {}) as Record<string, unknown>;
  const totals = (document.totals || {}) as Record<string, unknown>;
  const signature = (document.signature || {}) as Record<string, unknown>;
  const gross =
    totals.grossAmountAfterDiscount ?? totals.grossAmount ?? pkg.price ?? 0;

  const lines = [
    "הסכם חתום — עותק קבוע",
    `לקוח: ${clean(client.fullName)}`,
    `טלפון: ${clean(client.phone)}`,
    `אימייל: ${clean(client.email)}`,
    `אירוע: ${clean(event.name)}`,
    `תאריך אירוע: ${clean(event.date)}`,
    `חבילה: ${clean(pkg.title)}`,
    `רשומות: ${clean(pkg.records)}`,
    `סכום עסקה: ${money(gross)}`,
    `נחתם בתאריך: ${clean(signature.date)}`,
    `שם החותם: ${clean(signature.fullName)}`,
  ];

  let y = 790;
  for (const line of lines) {
    drawLine(page, font, line, y);
    y -= 28;
  }

  const image = signatureBytes(clean(signature.signatureDataUrl));
  if (image) {
    const embedded =
      image.kind === "png"
        ? await pdf.embedPng(image.bytes)
        : await pdf.embedJpg(image.bytes);
    const scaled = embedded.scale(0.35);
    page.drawImage(embedded, {
      x: 360,
      y: Math.max(40, y - scaled.height),
      width: Math.min(scaled.width, 180),
      height: Math.min(scaled.height, 80),
    });
  }

  return Buffer.from(await pdf.save());
}
