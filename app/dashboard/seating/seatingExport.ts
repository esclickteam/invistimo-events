"use client";

import type Konva from "konva";

/* ============================================================
   TYPES
============================================================ */
export type SeatingExportGuest = {
  id?: string;
  _id?: string;
  name?: string;
};

export type SeatingExportTable = {
  id?: string;
  _id?: string;
  name?: string;
  seats?: number;
  capacity?: number;
  seatedGuests?: { guestId?: string }[];
};

export type SeatingExportRow = {
  guestId: string;
  name: string;
  count: number;
};

export type SeatingExportTableSummary = {
  id: string;
  name: string;
  capacity: number;
  seatedTotal: number;
  rows: SeatingExportRow[];
};

/** Konva nodes with this name are editor-only controls and are hidden in exports. */
export const SEATING_EXPORT_HIDE_NAME = "seating-export-hide";

const MAP_PADDING_WORLD = 40;
const MAX_OUTPUT_SIDE = 10000;
const MAX_OUTPUT_AREA = 24_000_000;
const MAX_OUTPUT_AREA_IOS = 16_000_000;
const MAX_PIXEL_RATIO = 12;

/* ============================================================
   MAP CAPTURE
============================================================ */
function isIOS() {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function unionRect(
  a: { x: number; y: number; width: number; height: number } | null,
  b: { x: number; y: number; width: number; height: number }
) {
  if (!a) return { ...b };
  const minX = Math.min(a.x, b.x);
  const minY = Math.min(a.y, b.y);
  const maxX = Math.max(a.x + a.width, b.x + b.width);
  const maxY = Math.max(a.y + a.height, b.y + b.height);
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/**
 * Renders the whole seating map (background, zones, tables, chairs, labels)
 * regardless of the current zoom/pan, onto an opaque white canvas.
 */
export function captureSeatingStage(
  stage: Konva.Stage | null | undefined
): HTMLCanvasElement | null {
  if (!stage) return null;

  const hiddenNodes = stage
    .find(`.${SEATING_EXPORT_HIDE_NAME}`)
    .filter((node) => node.visible());

  hiddenNodes.forEach((node) => node.hide());

  try {
    let rect: { x: number; y: number; width: number; height: number } | null =
      null;

    stage.getLayers().forEach((layer) => {
      if (!layer.visible()) return;
      const layerRect = layer.getClientRect();
      if (!(layerRect.width > 0) || !(layerRect.height > 0)) return;
      rect = unionRect(rect, layerRect);
    });

    if (!rect) return null;

    const box = rect as { x: number; y: number; width: number; height: number };
    const stageScale = Math.abs(stage.scaleX()) || 1;
    const pad = MAP_PADDING_WORLD * stageScale;

    const region = {
      x: box.x - pad,
      y: box.y - pad,
      width: box.width + pad * 2,
      height: box.height + pad * 2,
    };

    const maxArea = isIOS() ? MAX_OUTPUT_AREA_IOS : MAX_OUTPUT_AREA;
    const pixelRatio = Math.min(
      MAX_PIXEL_RATIO,
      MAX_OUTPUT_SIDE / Math.max(region.width, region.height),
      Math.sqrt(maxArea / (region.width * region.height))
    );

    const rendered = stage.toCanvas({
      ...region,
      pixelRatio,
    }) as HTMLCanvasElement;

    const output = document.createElement("canvas");
    output.width = rendered.width;
    output.height = rendered.height;

    const ctx = output.getContext("2d");
    if (!ctx) return null;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, output.width, output.height);
    ctx.drawImage(rendered, 0, 0);

    rendered.width = 0;
    rendered.height = 0;

    return output;
  } catch (error) {
    console.error("Failed capturing seating map:", error);
    return null;
  } finally {
    hiddenNodes.forEach((node) => node.show());
    stage.batchDraw();
  }
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: "image/png" | "image/jpeg",
  quality?: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed encoding canvas image"));
      },
      type,
      quality
    );
  });
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/* ============================================================
   GUEST LIST DATA
============================================================ */
function cleanId(value: unknown) {
  return String(value ?? "").trim();
}

const nameCollator = new Intl.Collator("he", {
  numeric: true,
  sensitivity: "base",
});

export function buildSeatingSummary(
  tables: SeatingExportTable[],
  guests: SeatingExportGuest[]
): SeatingExportTableSummary[] {
  const guestMap = new Map<string, SeatingExportGuest>();

  guests.forEach((guest) => {
    const id = cleanId(guest._id ?? guest.id);
    if (id) guestMap.set(id, guest);
    const altId = cleanId(guest.id);
    if (altId && !guestMap.has(altId)) guestMap.set(altId, guest);
  });

  const summaries = tables.map((table, index) => {
    const rowsMap = new Map<string, SeatingExportRow>();

    (Array.isArray(table.seatedGuests) ? table.seatedGuests : []).forEach(
      (seat) => {
        const guestId = cleanId(seat?.guestId);
        if (!guestId) return;

        const guest = guestMap.get(guestId);
        if (!guest) return;

        const existing = rowsMap.get(guestId);
        if (existing) {
          existing.count += 1;
          return;
        }

        rowsMap.set(guestId, {
          guestId,
          name: String(guest.name || "").trim() || "ללא שם",
          count: 1,
        });
      }
    );

    const rows = Array.from(rowsMap.values());
    const seatedTotal = rows.reduce((sum, row) => sum + row.count, 0);
    const capacity = Number(table.seats ?? table.capacity ?? 0) || seatedTotal;

    return {
      id: cleanId(table.id ?? table._id) || `table-${index}`,
      name: String(table.name || "").trim() || `שולחן ${index + 1}`,
      capacity,
      seatedTotal,
      rows,
    };
  });

  return summaries.sort((a, b) => nameCollator.compare(a.name, b.name));
}

/* ============================================================
   CANVAS TEXT HELPERS (RTL)
============================================================ */
const COLORS = {
  ink: "#2F241C",
  muted: "#7A6A5A",
  accent: "#A58A67",
  border: "#2F241C",
  softBorder: "#D8CFC4",
  headerBg: "#F6F1EA",
  rowBg: "#FBF7F0",
  empty: "#047857",
  partial: "#B45309",
};

function getFontFamily() {
  if (typeof document === "undefined") return "Arial, sans-serif";
  const family = getComputedStyle(document.body).fontFamily;
  return family ? `${family}, Arial, sans-serif` : "Arial, sans-serif";
}

function setFont(
  ctx: CanvasRenderingContext2D,
  size: number,
  weight: number | "bold" = 700
) {
  ctx.font = `${weight} ${size}px ${getFontFamily()}`;
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let result = text;
  while (result.length > 1 && ctx.measureText(`${result}…`).width > maxWidth) {
    result = result.slice(0, -1);
  }
  return `${result}…`;
}

function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  align: CanvasTextAlign,
  maxWidth?: number
) {
  ctx.direction = "rtl";
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillText(maxWidth ? fitText(ctx, text, maxWidth) : text, x, y);
}

function createPageCanvas(widthPt: number, heightPt: number, dpi: number) {
  const scale = dpi / 72;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(widthPt * scale);
  canvas.height = Math.round(heightPt * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context not available");
  ctx.scale(scale, scale);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, widthPt, heightPt);
  return { canvas, ctx };
}

/* ============================================================
   PDF BUILDING
============================================================ */
const A4_LONG = 841.89;
const A4_SHORT = 595.28;
const PAGE_MARGIN = 28;
const HEADER_HEIGHT = 74;
const RENDER_DPI = 220;

type HeaderInfo = {
  subtitle: string;
  tablesCount: number;
  seatedTotal: number;
  capacityTotal: number;
};

function renderHeaderCanvas(widthPt: number, info: HeaderInfo) {
  const { canvas, ctx } = createPageCanvas(widthPt, HEADER_HEIGHT, RENDER_DPI);
  const center = widthPt / 2;

  ctx.fillStyle = COLORS.accent;
  setFont(ctx, 9, 800);
  drawText(ctx, "INVISTIMO", center, 10, "center");

  ctx.fillStyle = COLORS.ink;
  setFont(ctx, 20, 900);
  drawText(ctx, "סידור הושבה", center, 30, "center");

  ctx.fillStyle = COLORS.muted;
  setFont(ctx, 10, 700);
  const dateLabel = new Date().toLocaleDateString("he-IL");
  drawText(
    ctx,
    `${info.subtitle} · שולחנות: ${info.tablesCount} · הושבו: ${info.seatedTotal} · מקומות: ${info.capacityTotal} · ${dateLabel}`,
    center,
    52,
    "center",
    widthPt - 20
  );

  ctx.strokeStyle = "#E8DDD0";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(0, HEADER_HEIGHT - 4);
  ctx.lineTo(widthPt, HEADER_HEIGHT - 4);
  ctx.stroke();

  return canvas;
}

const CARD_HEADER_H = 34;
const CARD_THEAD_H = 18;
const CARD_ROW_H = 17;
const CARD_FOOTER_H = 18;
const CARD_GAP = 12;
const COLUMN_GAP = 14;

type CardChunk = {
  table: SeatingExportTableSummary;
  rows: SeatingExportRow[];
  continued: boolean;
  isLast: boolean;
};

function chunkHeight(chunk: CardChunk) {
  const rowsCount = Math.max(1, chunk.rows.length);
  return (
    CARD_HEADER_H +
    CARD_THEAD_H +
    rowsCount * CARD_ROW_H +
    (chunk.isLast ? CARD_FOOTER_H : 0)
  );
}

function drawCard(
  ctx: CanvasRenderingContext2D,
  chunk: CardChunk,
  x: number,
  y: number,
  width: number
) {
  const { table } = chunk;
  const height = chunkHeight(chunk);
  const right = x + width;
  const countColW = 44;
  const pad = 8;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x, y, width, height);

  ctx.fillStyle = COLORS.headerBg;
  ctx.fillRect(x, y, width, CARD_HEADER_H);

  const isEmpty = table.seatedTotal === 0;
  const isPartial = table.seatedTotal > 0 && table.seatedTotal < table.capacity;

  ctx.fillStyle = isEmpty ? COLORS.empty : isPartial ? COLORS.partial : COLORS.ink;
  setFont(ctx, 11.5, 900);
  drawText(
    ctx,
    chunk.continued ? `${table.name} (המשך)` : table.name,
    x + width / 2,
    y + 12,
    "center",
    width - 16
  );

  ctx.fillStyle = COLORS.muted;
  setFont(ctx, 8.5, 800);
  drawText(
    ctx,
    `${table.seatedTotal}/${table.capacity} מקומות`,
    x + width / 2,
    y + 25,
    "center"
  );

  let cursor = y + CARD_HEADER_H;

  ctx.fillStyle = "#F2EEE8";
  ctx.fillRect(x, cursor, width, CARD_THEAD_H);
  ctx.fillStyle = COLORS.ink;
  setFont(ctx, 8.5, 900);
  drawText(ctx, "שם", right - pad, cursor + CARD_THEAD_H / 2, "right");
  drawText(ctx, "כמות", x + countColW / 2, cursor + CARD_THEAD_H / 2, "center");

  ctx.strokeStyle = COLORS.border;
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(x, cursor);
  ctx.lineTo(right, cursor);
  ctx.moveTo(x, cursor + CARD_THEAD_H);
  ctx.lineTo(right, cursor + CARD_THEAD_H);
  ctx.stroke();

  cursor += CARD_THEAD_H;

  if (!chunk.rows.length) {
    ctx.fillStyle = "#9A8B7D";
    setFont(ctx, 8.5, 700);
    drawText(ctx, "אין אורחים בשולחן זה", x + width / 2, cursor + CARD_ROW_H / 2, "center");
    cursor += CARD_ROW_H;
  } else {
    chunk.rows.forEach((row) => {
      ctx.fillStyle = COLORS.ink;
      setFont(ctx, 9, 700);
      drawText(
        ctx,
        row.name,
        right - pad,
        cursor + CARD_ROW_H / 2,
        "right",
        width - countColW - pad * 2
      );
      setFont(ctx, 9, 900);
      drawText(ctx, String(row.count), x + countColW / 2, cursor + CARD_ROW_H / 2, "center");

      ctx.strokeStyle = COLORS.softBorder;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(x, cursor + CARD_ROW_H);
      ctx.lineTo(right, cursor + CARD_ROW_H);
      ctx.stroke();

      cursor += CARD_ROW_H;
    });
  }

  if (chunk.isLast) {
    ctx.fillStyle = COLORS.rowBg;
    ctx.fillRect(x, cursor, width, CARD_FOOTER_H);
    ctx.fillStyle = COLORS.ink;
    setFont(ctx, 9, 900);
    drawText(ctx, "סה״כ", right - pad, cursor + CARD_FOOTER_H / 2, "right");
    drawText(ctx, String(table.seatedTotal), x + countColW / 2, cursor + CARD_FOOTER_H / 2, "center");
    cursor += CARD_FOOTER_H;
  }

  ctx.strokeStyle = COLORS.softBorder;
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(x + countColW, y + CARD_HEADER_H);
  ctx.lineTo(x + countColW, cursor);
  ctx.stroke();

  ctx.strokeStyle = COLORS.border;
  ctx.lineWidth = 0.9;
  ctx.strokeRect(x, y, width, height);
}

/** Lays out table cards in two RTL columns per A4 portrait page. */
function renderGuestListPages(tables: SeatingExportTableSummary[]) {
  const pageW = A4_SHORT;
  const pageH = A4_LONG;
  const top = PAGE_MARGIN + 34;
  const bottom = pageH - PAGE_MARGIN;
  const columnW = (pageW - PAGE_MARGIN * 2 - COLUMN_GAP) / 2;
  const columnXs = [pageW - PAGE_MARGIN - columnW, PAGE_MARGIN];

  const pages: HTMLCanvasElement[] = [];
  let page: ReturnType<typeof createPageCanvas> | null = null;
  let column = 0;
  let cursorY = top;

  const startPage = () => {
    page = createPageCanvas(pageW, pageH, RENDER_DPI);
    pages.push(page.canvas);
    column = 0;
    cursorY = top;

    page.ctx.fillStyle = COLORS.ink;
    setFont(page.ctx, 14, 900);
    drawText(page.ctx, "רשימת אורחים לפי שולחנות", pageW - PAGE_MARGIN, PAGE_MARGIN + 10, "right");
    page.ctx.fillStyle = COLORS.muted;
    setFont(page.ctx, 8.5, 700);
    drawText(page.ctx, `עמוד ${pages.length}`, PAGE_MARGIN, PAGE_MARGIN + 10, "left");
    page.ctx.strokeStyle = "#EFE3D4";
    page.ctx.lineWidth = 0.8;
    page.ctx.beginPath();
    page.ctx.moveTo(PAGE_MARGIN, PAGE_MARGIN + 22);
    page.ctx.lineTo(pageW - PAGE_MARGIN, PAGE_MARGIN + 22);
    page.ctx.stroke();
  };

  const nextColumn = () => {
    if (column === 0) {
      column = 1;
      cursorY = top;
    } else {
      startPage();
    }
  };

  startPage();

  const minRowsPerChunk = 3;

  tables.forEach((table) => {
    let remaining = [...table.rows];
    let continued = false;

    do {
      const available = bottom - cursorY;
      const fixed = CARD_HEADER_H + CARD_THEAD_H;
      const fullHeight = chunkHeight({
        table,
        rows: remaining,
        continued,
        isLast: true,
      });

      let chunk: CardChunk;

      if (fullHeight <= available) {
        chunk = { table, rows: remaining, continued, isLast: true };
        remaining = [];
      } else {
        const fitRows = Math.floor((available - fixed) / CARD_ROW_H);
        if (fitRows < Math.min(minRowsPerChunk, remaining.length) || fitRows < 1) {
          if (cursorY === top) {
            const forcedRows = Math.max(1, Math.floor((bottom - top - fixed) / CARD_ROW_H));
            chunk = {
              table,
              rows: remaining.slice(0, forcedRows),
              continued,
              isLast: false,
            };
            remaining = remaining.slice(forcedRows);
          } else {
            nextColumn();
            continue;
          }
        } else {
          chunk = {
            table,
            rows: remaining.slice(0, fitRows),
            continued,
            isLast: false,
          };
          remaining = remaining.slice(fitRows);
        }
      }

      const activePage = page as unknown as ReturnType<typeof createPageCanvas>;
      drawCard(activePage.ctx, chunk, columnXs[column], cursorY, columnW);
      cursorY += chunkHeight(chunk) + CARD_GAP;
      continued = true;

      if (remaining.length) nextColumn();
    } while (remaining.length);
  });

  return pages;
}

export async function buildSeatingPdf({
  mapCanvas,
  tables,
  includeGuests,
}: {
  mapCanvas: HTMLCanvasElement;
  tables: SeatingExportTableSummary[];
  includeGuests: boolean;
}): Promise<Blob> {
  const { PDFDocument } = await import("pdf-lib");

  if (typeof document !== "undefined" && document.fonts?.ready) {
    await document.fonts.ready;
  }

  const pdf = await PDFDocument.create();
  pdf.setTitle("Seating map - Invistimo");
  pdf.setCreator("Invistimo");

  const seatedTotal = tables.reduce((sum, t) => sum + t.seatedTotal, 0);
  const capacityTotal = tables.reduce((sum, t) => sum + t.capacity, 0);

  const isLandscape = mapCanvas.width >= mapCanvas.height;
  const pageW = isLandscape ? A4_LONG : A4_SHORT;
  const pageH = isLandscape ? A4_SHORT : A4_LONG;

  const headerCanvas = renderHeaderCanvas(pageW - PAGE_MARGIN * 2, {
    subtitle: includeGuests ? "מפת שולחנות + רשימת אורחים" : "מפת שולחנות",
    tablesCount: tables.length,
    seatedTotal,
    capacityTotal,
  });

  const headerImage = await pdf.embedPng(
    await (await canvasToBlob(headerCanvas, "image/png")).arrayBuffer()
  );
  const mapImage = await pdf.embedJpg(
    await (await canvasToBlob(mapCanvas, "image/jpeg", 0.93)).arrayBuffer()
  );

  const mapPage = pdf.addPage([pageW, pageH]);
  mapPage.drawImage(headerImage, {
    x: PAGE_MARGIN,
    y: pageH - PAGE_MARGIN - HEADER_HEIGHT,
    width: pageW - PAGE_MARGIN * 2,
    height: HEADER_HEIGHT,
  });

  const areaW = pageW - PAGE_MARGIN * 2;
  const areaH = pageH - PAGE_MARGIN * 2 - HEADER_HEIGHT - 6;
  const fit = Math.min(areaW / mapCanvas.width, areaH / mapCanvas.height);
  const drawW = mapCanvas.width * fit;
  const drawH = mapCanvas.height * fit;

  mapPage.drawImage(mapImage, {
    x: (pageW - drawW) / 2,
    y: PAGE_MARGIN + (areaH - drawH) / 2,
    width: drawW,
    height: drawH,
  });

  if (includeGuests) {
    const listPages = renderGuestListPages(tables);

    for (const canvas of listPages) {
      const image = await pdf.embedPng(
        await (await canvasToBlob(canvas, "image/png")).arrayBuffer()
      );
      const listPage = pdf.addPage([A4_SHORT, A4_LONG]);
      listPage.drawImage(image, {
        x: 0,
        y: 0,
        width: A4_SHORT,
        height: A4_LONG,
      });
      canvas.width = 0;
      canvas.height = 0;
    }
  }

  const bytes = await pdf.save();
  return new Blob([bytes as BlobPart], { type: "application/pdf" });
}

/* ============================================================
   PRINT PAGE HANDOFF (IndexedDB — sessionStorage is too small)
============================================================ */
const HANDOFF_DB = "invistimo-seating-export";
const HANDOFF_STORE = "maps";
const HANDOFF_KEY = "latest";

function openHandoffDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(HANDOFF_DB, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(HANDOFF_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveSeatingMapForPrint(blob: Blob, eventId: string | null) {
  const db = await openHandoffDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(HANDOFF_STORE, "readwrite");
      tx.objectStore(HANDOFF_STORE).put(
        { blob, eventId: eventId || "", savedAt: Date.now() },
        HANDOFF_KEY
      );
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function loadSeatingMapForPrint(
  eventId: string | null
): Promise<Blob | null> {
  const db = await openHandoffDb();
  try {
    const record = await new Promise<
      { blob?: Blob; eventId?: string } | undefined
    >((resolve, reject) => {
      const tx = db.transaction(HANDOFF_STORE, "readonly");
      const request = tx.objectStore(HANDOFF_STORE).get(HANDOFF_KEY);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    if (!record?.blob) return null;
    if (eventId && record.eventId && record.eventId !== eventId) return null;
    return record.blob;
  } finally {
    db.close();
  }
}
