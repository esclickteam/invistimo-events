export type SeatedGuest = {
  guestId: string;
  seatIndex?: number;
  arrived?: boolean;
  groupId?: string;
};

export type SeatingTable = {
  id: string;
  name: string;
  number?: number | string;
  type: string;
  seats: number;
  capacity: number;
  x: number;
  y: number;
  rotation?: number;
  seatedGuests: SeatedGuest[];
};

export type SeatCoord = { x: number; y: number };

export type TableLayout = {
  type: string;
  coords: SeatCoord[];
  size: number;
  width: number;
  height: number;
  radius: number;
};

export function tableId(table: { id?: unknown; _id?: unknown; tableId?: unknown; number?: unknown }) {
  return String(table.id || table.tableId || table._id || table.number || "");
}

export function tableLabel(table: {
  name?: unknown;
  number?: unknown;
  tableNumber?: unknown;
  id?: unknown;
}) {
  const name = String(table.name || "").trim();
  if (name) return name;
  const number = table.number ?? table.tableNumber;
  if (number != null && String(number).trim()) return `שולחן ${number}`;
  return "שולחן";
}

export function parseSeatingTable(raw: Record<string, unknown>, index: number): SeatingTable {
  const seats = Math.max(
    0,
    Number(raw.seats || raw.capacity || raw.seatCount || 0)
  );
  const typeRaw = String(raw.type || "round");
  const type =
    typeRaw === "rectangle" || typeRaw === "rect" || typeRaw === "knight"
      ? "banquet"
      : typeRaw;
  const seatedGuests = Array.isArray(raw.seatedGuests)
    ? (raw.seatedGuests as Record<string, unknown>[]).map((seat) => ({
        guestId: String(seat.guestId || seat._id || ""),
        seatIndex: Number(seat.seatIndex || 0),
        arrived: Boolean(seat.arrived),
        groupId: seat.groupId ? String(seat.groupId) : undefined,
      }))
    : [];

  return {
    id: tableId(raw) || `table-${index + 1}`,
    name: tableLabel(raw),
    number: (raw.number ?? raw.tableNumber ?? index + 1) as number,
    type,
    seats,
    capacity: seats,
    x: Number(raw.x || 0),
    y: Number(raw.y || 0),
    rotation: Number(raw.rotation || 0),
    seatedGuests,
  };
}

export function getTableLayout(rawTable: SeatingTable): TableLayout {
  const seats = Math.max(0, Number(rawTable.seats || 0));
  const type =
    rawTable.type === "rectangle" || rawTable.type === "rect"
      ? "banquet"
      : rawTable.type;

  const SEAT_R = 13;
  const SEAT_GAP = 12;
  const OUTSIDE = 10;
  const STEP = SEAT_R * 2 + SEAT_GAP;
  const PAD = SEAT_R + OUTSIDE + 18;
  const coords: SeatCoord[] = [];
  const dims = { size: 150, width: 240, height: 75, radius: 55 };

  if (!seats) return { coords, ...dims, type };

  const splitSquareOpposite = (n: number) => {
    const hasExtra = n % 2 === 1;
    const even = hasExtra ? n - 1 : n;
    const pairs = even / 2;
    const horizontalPairs = Math.ceil(pairs / 2);
    const verticalPairs = Math.floor(pairs / 2);
    return {
      top: horizontalPairs + (hasExtra ? 1 : 0),
      bottom: horizontalPairs,
      left: verticalPairs,
      right: verticalPairs,
    };
  };

  const placeLineCentered = (count: number, fixed: number, axis: "x" | "y") => {
    if (count <= 0) return;
    if (count === 1) {
      coords.push(axis === "x" ? { x: 0, y: fixed } : { x: fixed, y: 0 });
      return;
    }
    const span = (count - 1) * STEP;
    const start = -span / 2;
    for (let i = 0; i < count; i += 1) {
      const v = start + i * STEP;
      coords.push(axis === "x" ? { x: v, y: fixed } : { x: fixed, y: v });
    }
  };

  if (type === "round") {
    const requiredCirc = seats * STEP;
    const seatRing = Math.max(48, requiredCirc / (2 * Math.PI));
    const tableRadius = Math.max(42, seatRing - (SEAT_R + OUTSIDE));
    const ring = tableRadius + SEAT_R + OUTSIDE;
    for (let i = 0; i < seats; i += 1) {
      const angle = (2 * Math.PI * i) / seats - Math.PI / 2;
      coords.push({ x: Math.cos(angle) * ring, y: Math.sin(angle) * ring });
    }
    dims.radius = tableRadius;
    return { coords, ...dims, type };
  }

  if (type === "square") {
    const { top, right, bottom, left } = splitSquareOpposite(seats);
    const maxSide = Math.max(top, right, bottom, left);
    const span = maxSide <= 1 ? 0 : (maxSide - 1) * STEP;
    const size = Math.max(140, span + PAD * 2);
    const half = size / 2;
    const fixed = half + SEAT_R + OUTSIDE;
    placeLineCentered(top, -fixed, "x");
    placeLineCentered(bottom, fixed, "x");
    placeLineCentered(right, fixed, "y");
    placeLineCentered(left, -fixed, "y");
    dims.size = size;
    return { coords, ...dims, type };
  }

  const topCount = Math.ceil(seats / 2);
  const bottomCount = seats - topCount;
  const maxRow = Math.max(topCount, bottomCount);
  const span = maxRow <= 1 ? 0 : (maxRow - 1) * STEP;
  const width = Math.max(230, span + PAD * 2);
  const height = 78;
  const yFixed = height / 2 + SEAT_R + OUTSIDE;
  const placeRow = (count: number, y: number) => {
    if (count <= 0) return;
    if (count === 1) {
      coords.push({ x: 0, y });
      return;
    }
    const rowSpan = (count - 1) * STEP;
    const start = -rowSpan / 2;
    for (let i = 0; i < count; i += 1) {
      coords.push({ x: start + i * STEP, y });
    }
  };
  placeRow(topCount, -yFixed);
  placeRow(bottomCount, yFixed);
  dims.width = width;
  dims.height = height;
  return { coords, ...dims, type: "banquet" };
}

export function tableFootprint(layout: TableLayout) {
  if (layout.type === "round") {
    const size = layout.radius * 2 + 56;
    return { width: size, height: size };
  }
  if (layout.type === "square") {
    const size = layout.size + 56;
    return { width: size, height: size };
  }
  return { width: layout.width + 40, height: layout.height + 70 };
}

export function occupiedSeatIndexes(table: SeatingTable) {
  return new Set(
    (table.seatedGuests || [])
      .map((seat) => Number(seat.seatIndex))
      .filter((index) => Number.isFinite(index))
  );
}

export function guestSeatCount(guest: { rsvp?: string; arrivedCount?: number; guestsCount?: number }) {
  if (guest.rsvp === "no") return 0;
  const arriving = Number(guest.arrivedCount || guest.guestsCount || 1);
  return Math.max(1, arriving);
}
