// /logic/seatingEngine.js

/* ============================================================
   DEBUG FLAGS
============================================================ */
const DEBUG_SEATING_ENGINE = true;

/* ============================================================
   helpers
============================================================ */
function dlog(...args) {
  if (!DEBUG_SEATING_ENGINE) return;
  // keep it easy to filter in console
  console.log("[seatingEngine]", ...args);
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function summarizeUsed(usedSet, seats) {
  const usedArr = Array.from(usedSet).sort((a, b) => a - b);
  const freeArr = [];
  for (let i = 0; i < seats; i++) if (!usedSet.has(i)) freeArr.push(i);

  return {
    usedArr,
    freeArr,
    usedCount: usedArr.length,
    freeCount: freeArr.length,
  };
}

function visualizeLine(usedSet, seats) {
  // Example: "00:🟦 01:⬜ 02:⬜ ..."
  const parts = [];
  for (let i = 0; i < seats; i++) {
    parts.push(`${pad2(i)}:${usedSet.has(i) ? "🟦" : "⬜"}`);
  }
  return parts.join(" ");
}

function visualizeCoords(coords) {
  // show seatIndex order with rough position
  // 00(x,y) 01(x,y) ...
  return coords
    .map((c, idx) => {
      const x = Math.round(c.x);
      const y = Math.round(c.y);
      return `${pad2(idx)}(${x},${y})`;
    })
    .join(" ");
}

/* ---------------------------------------------
   מציאת בלוק פנוי רציף לפי כמות מקומות נדרשת
--------------------------------------------- */
export function findFreeBlock(table, needed) {
  const used = new Set((table.seatedGuests || []).map((s) => s.seatIndex));
  const seats = Number(table.seats || 0);

  dlog("findFreeBlock()", {
    tableId: table._id || table.id,
    tableName: table.name,
    type: table.type,
    seats,
    needed,
  });

  if (!seats || needed <= 0) {
    dlog("❌ invalid input", { seats, needed });
    return null;
  }

  const sum = summarizeUsed(used, seats);
  dlog("used/free summary", sum);
  dlog("seat line", visualizeLine(used, seats));

  // NOTE: this search is strictly linear by seatIndex (0..n-1)
  // If visual order differs from seatIndex order — you'll see "looks contiguous" but not found here.
  for (let start = 0; start <= seats - needed; start++) {
    let ok = true;
    const block = [];

    for (let i = 0; i < needed; i++) {
      const idx = start + i;
      block.push(idx);

      if (used.has(idx)) {
        ok = false;
        dlog(
          `start=${start} ❌ blocked at idx=${idx} (i=${i})`,
          "block:",
          block
        );
        break;
      }
    }

    if (ok) {
      const result = Array.from({ length: needed }, (_, x) => start + x);
      dlog("✅ found contiguous block", { start, result });
      return result;
    }
  }

  dlog("❌ no contiguous block found by seatIndex order");
  return null;
}

/* ---------------------------------------------
   קואורדינטות מושבים — עגול / מרובע / מלבני
--------------------------------------------- */
export function getSeatCoordinates(table) {
  const coords = [];
  const seats = Number(table.seats || 0);

  dlog("getSeatCoordinates()", {
    tableId: table._id || table.id,
    tableName: table.name,
    type: table.type,
    seats,
  });

  if (!seats) {
    dlog("❌ no seats");
    return coords;
  }

  /* -------- עגול -------- */
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

    dlog("round coords (seatIndex order):", visualizeCoords(coords));
  }

  /* -------- ריבועי — סימטרי ומדויק -------- */
  if (table.type === "square") {
    const width = 160;
    const height = 160;
    const offset = 100;
    const total = seats;

    // 🟦 חישוב כמות כסאות סימטרית בין צדדים מקבילים
    const horizontalSeats = Math.ceil(total / 4); // למעלה ולמטה
    const verticalSeats = Math.floor(total / 4); // שמאל וימין

    // במידה ויש שארית (למשל 10 כסאות), נחלק אותה לצדדים העליון והתחתון
    const remainder = total - (horizontalSeats * 2 + verticalSeats * 2);
    const topExtra = remainder > 0 ? 1 : 0;
    const bottomExtra = remainder > 1 ? 1 : 0;

    const topCount = horizontalSeats + topExtra;
    const bottomCount = horizontalSeats + bottomExtra;

    dlog("square distribution", {
      total,
      horizontalSeats,
      verticalSeats,
      remainder,
      topCount,
      bottomCount,
    });

    // למעלה
    for (let i = 0; i < topCount; i++) {
      const step = width / (topCount + 1);
      const x = -width / 2 + (i + 1) * step;
      const y = -offset;
      coords.push({ x, y, rotation: Math.PI });
    }

    // למטה
    for (let i = 0; i < bottomCount; i++) {
      const step = width / (bottomCount + 1);
      const x = -width / 2 + (i + 1) * step;
      const y = offset;
      coords.push({ x, y, rotation: 0 });
    }

    // ימין
    for (let i = 0; i < verticalSeats; i++) {
      const step = height / (verticalSeats + 1);
      const y = -height / 2 + (i + 1) * step;
      const x = offset;
      coords.push({ x, y, rotation: Math.PI / 2 });
    }

    // שמאל
    for (let i = 0; i < verticalSeats; i++) {
      const step = height / (verticalSeats + 1);
      const y = -height / 2 + (i + 1) * step;
      const x = -offset;
      coords.push({ x, y, rotation: -Math.PI / 2 });
    }

    dlog("square coords (seatIndex order):", visualizeCoords(coords));
    dlog(
      "⚠️ NOTE: seatIndex order here is: TOP -> BOTTOM -> RIGHT -> LEFT. If your UI looks different, seatIndex≠visual order."
    );
  }

  /* -------- בנקט (מלבני) -------- */
  if (table.type === "banquet") {
    const width = 240;
    const height = 90;

    // keep your original logic (no change), but log if odd seats
    const seatsPerSide = seats / 2;

    if (!Number.isInteger(seatsPerSide)) {
      dlog("⚠️ banquet seats is not even -> seatsPerSide is fractional", {
        seats,
        seatsPerSide,
      });
    }

    const spacingTop = width / (seatsPerSide + 1);

    // top
    for (let i = 0; i < seatsPerSide; i++) {
      coords.push({
        x: -width / 2 + spacingTop * (i + 1),
        y: -height,
        rotation: Math.PI,
      });
    }

    // bottom
    for (let i = 0; i < seatsPerSide; i++) {
      coords.push({
        x: -width / 2 + spacingTop * (i + 1),
        y: height,
        rotation: 0,
      });
    }

    dlog("banquet coords (seatIndex order):", visualizeCoords(coords));
    dlog(
      "⚠️ NOTE: seatIndex order here is: TOP then BOTTOM. If you render in a different order, seatIndex≠visual order."
    );
  }

  // final sanity
  if (coords.length !== seats) {
    dlog("⚠️ coords length != seats", { coordsLen: coords.length, seats });
  } else {
    dlog("✅ coords ready", { coordsLen: coords.length });
  }

  return coords;
}
