/* ---------------------------------------------
   מציאת בלוק פנוי רציף לפי כמות מקומות נדרשת
--------------------------------------------- */
export function findFreeBlock(table, needed) {
  const used = new Set(table.seatedGuests.map((s) => s.seatIndex));
  const seats = table.seats;

  for (let start = 0; start <= seats - needed; start++) {
    let ok = true;
    for (let i = 0; i < needed; i++) {
      if (used.has(start + i)) {
        ok = false;
        break;
      }
    }
    if (ok) return Array.from({ length: needed }, (_, x) => start + x);
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

  /* -------- ריבועי — רצף היקפי -------- */
  if (table.type === "square") {
    const width = 160;
    const height = 160;
    const offset = 100;

    const perSide = Math.floor(seats / 4);
    let remainder = seats % 4;

    const sides = [
      { side: "top", count: perSide + (remainder-- > 0 ? 1 : 0) },
      { side: "right", count: perSide + (remainder-- > 0 ? 1 : 0) },
      { side: "bottom", count: perSide + (remainder-- > 0 ? 1 : 0) },
      { side: "left", count: perSide },
    ];

    sides.forEach(({ side, count }) => {
      for (let i = 0; i < count; i++) {
        const t = (i + 1) / (count + 1);

        if (side === "top") {
          coords.push({
            x: -width / 2 + t * width,
            y: -offset,
            rotation: Math.PI,
          });
        }

        if (side === "right") {
          coords.push({
            x: offset,
            y: -height / 2 + t * height,
            rotation: Math.PI / 2,
          });
        }

        if (side === "bottom") {
          coords.push({
            x: width / 2 - t * width,
            y: offset,
            rotation: 0,
          });
        }

        if (side === "left") {
          coords.push({
            x: -offset,
            y: height / 2 - t * height,
            rotation: -Math.PI / 2,
          });
        }
      }
    });
  }

  /* -------- בנקט (מלבני) — רצף אחד -------- */
  if (table.type === "banquet") {
    const width = 240;
    const height = 90;
    const topCount = Math.ceil(seats / 2);
    const bottomCount = seats - topCount;

    // top
    for (let i = 0; i < topCount; i++) {
      coords.push({
        x: -width / 2 + ((i + 1) / (topCount + 1)) * width,
        y: -height,
        rotation: Math.PI,
      });
    }

    // bottom
    for (let i = 0; i < bottomCount; i++) {
      coords.push({
        x: width / 2 - ((i + 1) / (bottomCount + 1)) * width,
        y: height,
        rotation: 0,
      });
    }
  }

  return coords;
}
