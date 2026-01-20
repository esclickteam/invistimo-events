// /logic/seatingEngine.js

/* ---------------------------------------------
   מציאת בלוק פנוי רציף לפי כמות מקומות נדרשת
--------------------------------------------- */
export function findFreeBlock(table, needed) {
  if (!table || !needed || needed <= 0) return null;

  const used = new Set(
    (table.seatedGuests || []).map((s) => s.seatIndex)
  );

  // ⬅️ קריטי: הסדר הוויזואלי האמיתי
  const coords = getSeatCoordinates(table);
  const total = coords.length;

  if (needed > total) return null;

  // סדר ישיבה ויזואלי
  const order = coords.map((_, i) => i);

  // בעגול – מאפשרים wrap-around
  const extended =
    table.type === "round"
      ? [...order, ...order.slice(0, needed - 1)]
      : order;

  for (let i = 0; i <= extended.length - needed; i++) {
    const block = extended.slice(i, i + needed);

    // בעגול – מונע כפילויות
    const unique = new Set(block.map((x) => x % total));
    if (unique.size !== needed) continue;

    const ok = block.every(
      (idx) => !used.has(idx % total)
    );

    if (ok) {
      return block.map((x) => x % total);
    }
  }

  return null;
}


/* ---------------------------------------------
   קואורדינטות מושבים — עגול / מרובע / מלבני
--------------------------------------------- */
export function getSeatCoordinates(table) {
  const coords = [];
  const seats = table.seats;

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
  }

  /* -------- ריבועי — סימטרי -------- */
  if (table.type === "square") {
    const width = 160;
    const height = 160;
    const offset = 100;
    const total = seats;

    const horizontalSeats = Math.ceil(total / 4);
    const verticalSeats = Math.floor(total / 4);

    const remainder =
      total - (horizontalSeats * 2 + verticalSeats * 2);

    const topExtra = remainder > 0 ? 1 : 0;
    const bottomExtra = remainder > 1 ? 1 : 0;

    const topCount = horizontalSeats + topExtra;
    const bottomCount = horizontalSeats + bottomExtra;

    // למעלה
    for (let i = 0; i < topCount; i++) {
      const step = width / (topCount + 1);
      coords.push({
        x: -width / 2 + (i + 1) * step,
        y: -offset,
        rotation: Math.PI,
      });
    }

    // למטה
    for (let i = 0; i < bottomCount; i++) {
      const step = width / (bottomCount + 1);
      coords.push({
        x: -width / 2 + (i + 1) * step,
        y: offset,
        rotation: 0,
      });
    }

    // ימין
    for (let i = 0; i < verticalSeats; i++) {
      const step = height / (verticalSeats + 1);
      coords.push({
        x: offset,
        y: -height / 2 + (i + 1) * step,
        rotation: Math.PI / 2,
      });
    }

    // שמאל
    for (let i = 0; i < verticalSeats; i++) {
      const step = height / (verticalSeats + 1);
      coords.push({
        x: -offset,
        y: -height / 2 + (i + 1) * step,
        rotation: -Math.PI / 2,
      });
    }
  }

  /* -------- בנקט (מלבני) -------- */
  if (table.type === "banquet") {
    const width = 240;
    const height = 90;
    const seatsPerSide = seats / 2;

    const spacing = width / (seatsPerSide + 1);

    // top
    for (let i = 0; i < seatsPerSide; i++) {
      coords.push({
        x: -width / 2 + spacing * (i + 1),
        y: -height,
        rotation: Math.PI,
      });
    }

    // bottom
    for (let i = 0; i < seatsPerSide; i++) {
      coords.push({
        x: -width / 2 + spacing * (i + 1),
        y: height,
        rotation: 0,
      });
    }
  }

  return coords;
}
