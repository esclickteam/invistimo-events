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

  /* -------- ריבועי — סימטרי ומדויק -------- */
  if (table.type === "square") {
    const width = 160;
    const height = 160;
    const offset = 100;

    // חלוקה סימטרית של הכיסאות בין 4 הצדדים
    const sideDistribution = [0, 0, 0, 0];
    for (let i = 0; i < seats; i++) {
      sideDistribution[i % 4]++;
    }

    // למעלה
    for (let i = 0; i < sideDistribution[0]; i++) {
      const step = width / (sideDistribution[0] + 1);
      const x = -width / 2 + (i + 1) * step;
      const y = -offset;
      coords.push({ x, y, rotation: Math.PI });
    }

    // ימין
    for (let i = 0; i < sideDistribution[1]; i++) {
      const step = height / (sideDistribution[1] + 1);
      const y = -height / 2 + (i + 1) * step;
      const x = offset;
      coords.push({ x, y, rotation: Math.PI / 2 });
    }

    // למטה
    for (let i = 0; i < sideDistribution[2]; i++) {
      const step = width / (sideDistribution[2] + 1);
      const x = width / 2 - (i + 1) * step;
      const y = offset;
      coords.push({ x, y, rotation: 0 });
    }

    // שמאל
    for (let i = 0; i < sideDistribution[3]; i++) {
      const step = height / (sideDistribution[3] + 1);
      const y = height / 2 - (i + 1) * step;
      const x = -offset;
      coords.push({ x, y, rotation: -Math.PI / 2 });
    }
  }

  /* -------- בנקט (מלבני) -------- */
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
