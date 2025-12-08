// /logic/seatingEngine.js

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

  if (table.type === "square") {
    const width = 160;
    const height = 160;
    const perSide = Math.ceil(seats / 4);
    const margin = 30;
    const spacingX = width / (perSide + 1);
    const spacingY = height / (perSide + 1);

    for (let i = 0; i < seats; i++) {
      const side = Math.floor((i * 4) / seats);
      const pos = i % perSide;

      let x = 0,
        y = 0,
        rotation = 0;

      if (side === 0) {
        x = -width / 2 + spacingX * (pos + 1);
        y = -height / 2 - margin;
        rotation = Math.PI;
      } else if (side === 1) {
        x = width / 2 + margin;
        y = -height / 2 + spacingY * (pos + 1);
        rotation = -Math.PI / 2;
      } else if (side === 2) {
        x = width / 2 - spacingX * (pos + 1);
        y = height / 2 + margin;
        rotation = 0;
      } else {
        x = -width / 2 - margin;
        y = -height / 2 + spacingY * (pos + 1);
        rotation = Math.PI / 2;
      }

      coords.push({ x, y, rotation });
    }
  }

  if (table.type === "banquet") {
    const width = 240;
    const height = 90;
    const seatsPerSide = table.seats / 2;

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
  }

  return coords;
}
