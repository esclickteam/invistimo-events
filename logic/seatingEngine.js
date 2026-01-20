/* ============================================================
   DEBUG
============================================================ */
const DEBUG_SEATING_ENGINE = true;

function dlog(...args) {
  if (!DEBUG_SEATING_ENGINE) return;
  console.log("[seatingEngine]", ...args);
}

/* ============================================================
   VISUAL ORDER
   מחשב סדר מושבים ויזואלי סביב השולחן
============================================================ */
function getVisualOrder(table) {
  const coords = getSeatCoordinates(table);

  // ✅ SQUARE: סדר פרימטרי (מסביב לשולחן) ולא לפי atan2
  if (table.type === "square") {
    const xs = coords.map((c) => c.x);
    const ys = coords.map((c) => c.y);

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    // סף קטן כדי לשייך נקודות לצלע (כי יש עיגולים/שברים)
    const EPS = 6;

    const top = [];
    const right = [];
    const bottom = [];
    const left = [];

    coords.forEach((c, seatIndex) => {
      const nearTop = Math.abs(c.y - minY) <= EPS;
      const nearBottom = Math.abs(c.y - maxY) <= EPS;
      const nearRight = Math.abs(c.x - maxX) <= EPS;
      const nearLeft = Math.abs(c.x - minX) <= EPS;

      // סדר סביב השולחן: TOP -> RIGHT -> BOTTOM -> LEFT
      if (nearTop) top.push({ seatIndex, x: c.x, y: c.y });
      else if (nearRight) right.push({ seatIndex, x: c.x, y: c.y });
      else if (nearBottom) bottom.push({ seatIndex, x: c.x, y: c.y });
      else if (nearLeft) left.push({ seatIndex, x: c.x, y: c.y });
      else {
        // fallback אם משהו "נפל בין הכיסאות"
        // נשים לפי זווית כדי לא להחזיר מערך חסר
        top.push({ seatIndex, x: c.x, y: c.y });
      }
    });

    // מיון לאורך כל צלע כדי שהרצף יהיה “ליד ליד”
    top.sort((a, b) => a.x - b.x);        // שמאל -> ימין
    right.sort((a, b) => a.y - b.y);      // למעלה -> למטה
    bottom.sort((a, b) => b.x - a.x);     // ימין -> שמאל
    left.sort((a, b) => b.y - a.y);       // למטה -> למעלה

    const order = [
      ...top.map((o) => o.seatIndex),
      ...right.map((o) => o.seatIndex),
      ...bottom.map((o) => o.seatIndex),
      ...left.map((o) => o.seatIndex),
    ];

    dlog("visual order (square)", order);
    return order;
  }

  // ✅ ROUND/BANQUET/others: לפי זווית
  const ordered = coords
    .map((c, seatIndex) => ({
      seatIndex,
      angle: Math.atan2(c.y, c.x),
    }))
    .sort((a, b) => a.angle - b.angle)
    .map((o) => o.seatIndex);

  dlog("visual order (angle)", ordered);
  return ordered;
}


/* ============================================================
   FIND CONTIGUOUS BLOCK (VISUAL)
============================================================ */
export function findFreeBlock(table, needed) {
  const used = new Set((table.seatedGuests || []).map((s) => s.seatIndex));
  const seats = Number(table.seats || 0);

  dlog("findFreeBlock()", {
    tableId: table._id || table.id,
    type: table.type,
    seats,
    needed,
    used: Array.from(used),
  });

  if (!seats || needed <= 0) return null;

  const visualOrder = getVisualOrder(table);

  // מאפשר wrap (עגול / מסביב)
  const extended =
    table.type === "round"
      ? [...visualOrder, ...visualOrder.slice(0, needed - 1)]
      : visualOrder;

  for (let i = 0; i <= extended.length - needed; i++) {
    const block = extended.slice(i, i + needed);

    // בלי חזרות
    if (new Set(block).size !== needed) continue;

    const ok = block.every((idx) => !used.has(idx));

    if (ok) {
      dlog("✅ found visual contiguous block", block);
      return block;
    }
  }

  dlog("❌ no visual contiguous block found");
  return null;
}

/* ============================================================
   SEAT COORDINATES
============================================================ */
export function getSeatCoordinates(table) {
  const coords = [];
  const seats = Number(table.seats || 0);

  /* -------- ROUND -------- */
  if (table.type === "round") {
    const radius = 100;
    for (let i = 0; i < seats; i++) {
      const angle = (i / seats) * Math.PI * 2;
      coords.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        rotation: angle + Math.PI / 2,
      });
    }
  }

  /* -------- SQUARE -------- */
  if (table.type === "square") {
    const width = 160;
    const height = 160;
    const offset = 100;
    const total = seats;

    const horizontal = Math.ceil(total / 4);
    const vertical = Math.floor(total / 4);
    const remainder = total - (horizontal * 2 + vertical * 2);

    const topCount = horizontal + (remainder > 0 ? 1 : 0);
    const bottomCount = horizontal + (remainder > 1 ? 1 : 0);

    // top
    for (let i = 0; i < topCount; i++) {
      const step = width / (topCount + 1);
      coords.push({
        x: -width / 2 + (i + 1) * step,
        y: -offset,
        rotation: Math.PI,
      });
    }

    // right
    for (let i = 0; i < vertical; i++) {
      const step = height / (vertical + 1);
      coords.push({
        x: offset,
        y: -height / 2 + (i + 1) * step,
        rotation: Math.PI / 2,
      });
    }

    // bottom
    for (let i = 0; i < bottomCount; i++) {
      const step = width / (bottomCount + 1);
      coords.push({
        x: -width / 2 + (i + 1) * step,
        y: offset,
        rotation: 0,
      });
    }

    // left
    for (let i = 0; i < vertical; i++) {
      const step = height / (vertical + 1);
      coords.push({
        x: -offset,
        y: -height / 2 + (i + 1) * step,
        rotation: -Math.PI / 2,
      });
    }
  }

  /* -------- BANQUET -------- */
  if (table.type === "banquet") {
    const width = 240;
    const height = 90;
    const perSide = seats / 2;
    const step = width / (perSide + 1);

    // top
    for (let i = 0; i < perSide; i++) {
      coords.push({
        x: -width / 2 + step * (i + 1),
        y: -height,
        rotation: Math.PI,
      });
    }

    // bottom
    for (let i = 0; i < perSide; i++) {
      coords.push({
        x: -width / 2 + step * (i + 1),
        y: height,
        rotation: 0,
      });
    }
  }

  return coords;
}
