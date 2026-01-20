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
  const seats = Number(table.seats || 0);

  // ⛔ הגנה: לא יותר כיסאות מהמוגדר
  const coords = getSeatCoordinates(table).slice(0, seats);

  const ordered = coords
    .map((c, seatIndex) => ({
      seatIndex,
      angle: Math.atan2(c.y, c.x),
      x: c.x,
      y: c.y,
    }))
    .sort((a, b) => a.angle - b.angle);

  dlog(
    "visual order:",
    ordered.map((o) => o.seatIndex)
  );

  return ordered.map((o) => o.seatIndex);
}


/* ============================================================
   FIND CONTIGUOUS BLOCK (VISUAL)
============================================================ */
export function findFreeBlock(table, needed) {
  const used = new Set((table.seatedGuests || []).map((s) => s.seatIndex));
  const seats = Number(table.seats || 0);

  // ⛔ אי אפשר לבקש יותר מהמקומות
  if (needed > seats) {
    dlog("❌ needed > seats", { needed, seats });
    return null;
  }


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

  // ⛔ SAFETY: never render more seats than defined
if (coords.length > seats) {
  coords.length = seats;
}

dlog("FINAL SEATS:", seats, "FINAL COORDS:", coords.length);


return coords;

}
