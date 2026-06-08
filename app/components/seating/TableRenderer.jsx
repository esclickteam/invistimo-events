"use client";

import React from "react";
import { useRef, useMemo, useState, useEffect } from "react";
import { Group, Circle, Rect, Text } from "react-konva";
import { useSeatingStore } from "@/store/seatingStore";
import { useSearchParams } from "next/navigation";
import { useGroupStore } from "@/store/groupStore";

/* ============================================================
   חישוב דינמי של צורת השולחן + כסאות
============================================================ */
function getTableLayout(rawTable) {
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

  const coords = [];
  const dims = {
    size: 150,
    width: 240,
    height: 75,
    radius: 55,
  };

  if (!seats) return { coords, ...dims, type };

  const splitSquareOpposite = (n) => {
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

  const placeLineCentered = (count, fixed, axis) => {
    if (count <= 0) return;

    if (count === 1) {
      coords.push(axis === "x" ? { x: 0, y: fixed } : { x: fixed, y: 0 });
      return;
    }

    const span = (count - 1) * STEP;
    const start = -span / 2;

    for (let i = 0; i < count; i++) {
      const v = start + i * STEP;
      coords.push(axis === "x" ? { x: v, y: fixed } : { x: fixed, y: v });
    }
  };

  if (type === "round") {
    const requiredCirc = seats * STEP;
    const seatRing = Math.max(48, requiredCirc / (2 * Math.PI));
    const tableRadius = Math.max(42, seatRing - (SEAT_R + OUTSIDE));
    const ring = tableRadius + SEAT_R + OUTSIDE;

    for (let i = 0; i < seats; i++) {
      const angle = (2 * Math.PI * i) / seats - Math.PI / 2;

      coords.push({
        x: Math.cos(angle) * ring,
        y: Math.sin(angle) * ring,
      });
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

  if (type === "banquet") {
    const topCount = Math.ceil(seats / 2);
    const bottomCount = seats - topCount;
    const maxRow = Math.max(topCount, bottomCount);

    const span = maxRow <= 1 ? 0 : (maxRow - 1) * STEP;
    const width = Math.max(230, span + PAD * 2);
    const height = 78;
    const yFixed = height / 2 + SEAT_R + OUTSIDE;

    const placeRow = (count, y) => {
      if (count <= 0) return;

      if (count === 1) {
        coords.push({ x: 0, y });
        return;
      }

      const rowSpan = (count - 1) * STEP;
      const start = -rowSpan / 2;

      for (let i = 0; i < count; i++) {
        coords.push({ x: start + i * STEP, y });
      }
    };

    placeRow(topCount, -yFixed);
    placeRow(bottomCount, yFixed);

    dims.width = width;
    dims.height = height;

    return { coords, ...dims, type };
  }

  return { coords, ...dims, type };
}

/* ============================================================
   סיבוב כיסאות
============================================================ */
function getSeatRotation(table, c) {
  if (table.type === "round") {
    return (Math.atan2(-c.y, -c.x) * 180) / Math.PI + 90;
  }

  if (table.type === "banquet") {
    return c.y > 0 ? 0 : 180;
  }

  if (table.type === "square" || table.type === "rectangle") {
    if (Math.abs(c.x) > Math.abs(c.y)) {
      return c.x > 0 ? -90 : 90;
    }

    return c.y > 0 ? 0 : 180;
  }

  return 0;
}

/* ============================================================
   זיהוי seatIndex חזק לכיסאות שנוספו אחרי יצירת שולחן
============================================================ */
function getSeatIndexValue(seat) {
  const raw =
    seat?.seatIndex ??
    seat?.index ??
    seat?.chairIndex ??
    seat?.seat ??
    null;

  const n = Number(raw);

  return Number.isFinite(n) ? n : null;
}

function isOneBasedSeatSource(seatSource, maxSeats) {
  if (!Array.isArray(seatSource) || !seatSource.length) return false;

  const indexes = seatSource
    .map((seat) => getSeatIndexValue(seat))
    .filter((index) => Number.isFinite(index));

  if (!indexes.length) return false;

  const hasZero = indexes.some((index) => Number(index) === 0);

  if (hasZero) return false;

  return indexes.every(
    (index) => Number(index) >= 1 && Number(index) <= Number(maxSeats || 0)
  );
}

function normalizeSeatIndexForSource(seat, seatSource, maxSeats) {
  const index = getSeatIndexValue(seat);

  if (index === null) return null;

  if (isOneBasedSeatSource(seatSource, maxSeats)) {
    return index - 1;
  }

  return index;
}

function findSeatForRenderedIndex(seatSource, renderedIndex, maxSeats) {
  if (!Array.isArray(seatSource)) return null;

  return (
    seatSource.find(
      (seat) =>
        Number(normalizeSeatIndexForSource(seat, seatSource, maxSeats)) ===
        Number(renderedIndex)
    ) || null
  );
}

/* ============================================================
   TableRenderer
============================================================ */
function TableRenderer({ table: tableProp, hideSeats = false }) {
  const tableRef = useRef(null);

  const [rotating, setRotating] = useState(false);

  const rotateActiveRef = useRef(false);
  const startAngleRef = useRef(0);
  const startRotationRadRef = useRef(0);

  const demoMode = useSeatingStore((s) => s.demoMode);
  const highlightedTable = useSeatingStore((s) => s.highlightedTable);
  const selectedGuestId = useSeatingStore((s) => s.selectedGuestId);
  const draggingGuest = useSeatingStore((s) => s.draggingGuest);
  const guests = useSeatingStore((s) => s.guests);
  const assignGuestBlock = useSeatingStore((s) => s.assignGuestBlock);
  const selectedTableId = useSeatingStore((s) => s.selectedTableId);
  const liveArrivals = useSeatingStore((s) => s.liveArrivals);
  const seatingMode = useSeatingStore((s) => s.seatingMode);

  /*
    חשוב:
    ה-TableRenderer לא מצייר לפי snapshot ישן שקיבל מה-parent,
    אלא מושך את השולחן הכי עדכני מה-store.
    ככה כיסא שנוסף במודאל / אורח שהושב במודאל
    מתעדכן מיד גם בציור של השולחן.
  */
  const storeTables = useSeatingStore((s) => s.tables);

  const tablePropId = String(tableProp?.id || tableProp?._id || "");

  const table = useMemo(() => {
    const latestTable = (storeTables || []).find(
      (t) => String(t.id || t._id || "") === tablePropId
    );

    if (!latestTable) return tableProp;

    return {
      ...tableProp,
      ...latestTable,

      /*
        שומרים דברים שהגיעו מה-parent ולא קיימים ב-store
        כדי לא לשבור פתיחת מודאל / סטטיסטיקות.
      */
      openAddGuestModal: tableProp?.openAddGuestModal,
      statsLabel: tableProp?.statsLabel,
    };
  }, [storeTables, tableProp, tablePropId]);

  const groups = useGroupStore((s) => s.groups);

  const searchParams = useSearchParams();
  const from = searchParams.get("from");
  const guestIdFromUrl = searchParams.get("guestId");

  useEffect(() => {
    console.log("🟢 seatingMode in TableRenderer:", seatingMode);
  }, [seatingMode]);

  const deleteTable =
    useSeatingStore((s) => s.deleteTable) ||
    useSeatingStore((s) => s.removeTable) ||
    (() => {});

  const tableId = String(table.id || table._id || "");

  const normalizeSeatedGuests = (value) => {
    if (!Array.isArray(value)) return [];

    return value
      .map((seat) => {
        const seatIndexValue = getSeatIndexValue(seat);

        return {
          ...seat,
          guestId: String(seat.guestId || seat._id || seat.id || ""),
          seatIndex:
            seatIndexValue !== null
              ? seatIndexValue
              : Number(seat.seatIndex ?? 0),
        };
      })
      .filter((seat) => seat.guestId);
  };

  const liveSnapshotKey = tableId ? `invistimo:planned-seating:${tableId}` : "";

  /*
    מקור אמת להושבה המקורית:
    - אם יש snapshot מהשרת, משתמשים בו.
    - במצב רגיל שומרים את ההושבה הקיימת.
    - בלייב קוראים את ההושבה המקורית מה־localStorage.
    - fallback אחרון: table.seatedGuests.
  */
  const plannedSeatedGuests = useMemo(() => {
    const serverSnapshot =
      table.plannedSeatedGuests ||
      table.originalSeatedGuests ||
      table.seatingSnapshot ||
      table.snapshotSeatedGuests ||
      null;

    if (Array.isArray(serverSnapshot) && serverSnapshot.length) {
      return normalizeSeatedGuests(serverSnapshot);
    }

    if (seatingMode !== "live") {
      return normalizeSeatedGuests(table.seatedGuests || []);
    }

    if (typeof window !== "undefined" && liveSnapshotKey) {
      try {
        const raw = window.localStorage.getItem(liveSnapshotKey);
        const parsed = raw ? JSON.parse(raw) : null;

        if (Array.isArray(parsed) && parsed.length) {
          return normalizeSeatedGuests(parsed);
        }
      } catch (err) {
        console.warn("Failed to read planned seating snapshot", err);
      }
    }

    return normalizeSeatedGuests(table.seatedGuests || []);
  }, [
    table.id,
    table._id,
    table.seatedGuests,
    table.plannedSeatedGuests,
    table.originalSeatedGuests,
    table.seatingSnapshot,
    table.snapshotSeatedGuests,
    seatingMode,
    liveSnapshotKey,
  ]);

  /*
    מצב נוכחי של השולחן מהשרת:
    זה המקור לצביעת כיסאות בלייב אחרי שחרור כיסאות.
    plannedSeatedGuests נשאר רק בשביל הטקסט "הושבה" וה-snapshot המקורי.
  */
  const currentSeatedGuests = useMemo(() => {
    return normalizeSeatedGuests(table.seatedGuests || []);
  }, [table.seatedGuests]);

  /*
    שומר snapshot רק במצב רגיל.
    בלייב לא שומרים, כדי לא לדרוס את ההושבה המקורית לפי מי שהגיע בפועל.
  */
  useEffect(() => {
    if (seatingMode === "live") return;
    if (!liveSnapshotKey) return;

    const current = normalizeSeatedGuests(table.seatedGuests || []);

    try {
      window.localStorage.setItem(liveSnapshotKey, JSON.stringify(current));
    } catch (err) {
      console.warn("Failed to save planned seating snapshot", err);
    }
  }, [seatingMode, liveSnapshotKey, table.seatedGuests]);

  const assigned = plannedSeatedGuests;

  const groupForTable = useMemo(() => {
    const seatedGuestsForGroup = plannedSeatedGuests?.length
      ? plannedSeatedGuests
      : table.seatedGuests || [];

    if (!seatedGuestsForGroup.length) return null;

    const guestWithGroup = guests.find(
      (g) =>
        g.groupId &&
        seatedGuestsForGroup.some(
          (s) => String(s.guestId) === String(g._id || g.id)
        )
    );

    if (!guestWithGroup?.groupId) return null;

    return groups.find(
      (gr) => String(gr._id) === String(guestWithGroup.groupId)
    );
  }, [plannedSeatedGuests, table.seatedGuests, guests, groups]);

  const occupiedSeatsCount = useMemo(() => {
    if (!plannedSeatedGuests.length) return 0;

    const counted = new Set();

    return plannedSeatedGuests.reduce((sum, s) => {
      const guestId = String(s.guestId);
      if (counted.has(guestId)) return sum;

      counted.add(guestId);

      const g = guests.find((g) => String(g._id || g.id) === guestId);
      if (!g) return sum;

      if (seatingMode === "live") {
        const key = String(g.id ?? g._id);

        const liveValue =
          liveArrivals && Object.prototype.hasOwnProperty.call(liveArrivals, key)
            ? Number(liveArrivals[key] || 0)
            : Number(g.actualArrivedCount || 0);

        return sum + Math.max(0, liveValue);
      }

      return sum + Math.max(0, Number(g.arrivedCount ?? 0));
    }, 0);
  }, [plannedSeatedGuests, guests, seatingMode, liveArrivals]);

  const seatsTotal = Number(table.seats || 0);
  const tableTitle = table.name || "";

  /*
    הפרדה מלאה בין:
    1. הושבה רגילה / מגיעים מתוכננים = arrivedCount
    2. מגיעים בפועל בלייב = actualArrivedCount / liveArrivals
    חשוב: לא משתמשים ב-plannedSeatedGuests.length לתצוגת "הושבה",
    כי זה מספר הכיסאות/שיבוצים ולא מספר המגיעים שהוגדר בקבוצה/אורח.
  */
  const plannedArrivedCount = useMemo(() => {
    if (!plannedSeatedGuests.length) {
      return Math.max(0, Number(table.arrivedCount ?? 0));
    }

    const counted = new Set();

    return plannedSeatedGuests.reduce((sum, s) => {
      const guestId = String(s.guestId);
      if (!guestId || counted.has(guestId)) return sum;

      counted.add(guestId);

      const g = guests.find((guest) => String(guest._id || guest.id) === guestId);

      if (!g) return sum;

      return sum + Math.max(0, Number(g.arrivedCount ?? 0));
    }, 0);
  }, [plannedSeatedGuests, guests, table.arrivedCount]);

  const actualArrivedCount = useMemo(() => {
    if (!plannedSeatedGuests.length) {
      return Math.max(0, Number(table.actualArrivedCount ?? 0));
    }

    const counted = new Set();

    return plannedSeatedGuests.reduce((sum, s) => {
      const guestId = String(s.guestId);
      if (!guestId || counted.has(guestId)) return sum;

      counted.add(guestId);

      const g = guests.find((guest) => String(guest._id || guest.id) === guestId);

      if (!g) return sum;

      const key = String(g.id ?? g._id);

      const liveValue =
        liveArrivals && Object.prototype.hasOwnProperty.call(liveArrivals, key)
          ? Number(liveArrivals[key] || 0)
          : Number(g.actualArrivedCount ?? 0);

      return sum + Math.max(0, liveValue);
    }, 0);
  }, [plannedSeatedGuests, guests, liveArrivals, table.actualArrivedCount]);

  const displayPlannedCount =
    seatingMode === "live" ? plannedArrivedCount : plannedArrivedCount;

  const displayActualCount = actualArrivedCount;

  const isHighlighted =
    highlightedTable === table.id ||
    assigned.some((s) => String(s.guestId) === String(selectedGuestId)) ||
    (from === "personal" &&
      guestIdFromUrl &&
      assigned.some((s) => String(s.guestId) === String(guestIdFromUrl)));

  const hasArrived =
    seatingMode === "live" ? displayActualCount > 0 : displayPlannedCount > 0;

  /* ============================================================
     עיצוב בלבד
  ============================================================ */
  const tableFill = "#FFF9ED";

  const tableStroke = isHighlighted
    ? "#D7A63F"
    : hasArrived
      ? "#CBA56C"
      : "#D9C4A4";

  const tableText = isHighlighted ? "#6A4300" : "#3D3025";

  const tableLines = useMemo(() => {
    const lines = [];

    if (groupForTable?.name) {
      lines.push({
        text: groupForTable.name,
        fill: tableText,
        fontSize: seatingMode === "live" ? 13 : 14,
        fontStyle: "bold",
      });
    }

    lines.push({
      text: tableTitle,
      fill: tableText,
      fontSize: seatingMode === "live" ? 14 : 16,
      fontStyle: "bold",
    });

    if (seatingMode === "live") {
      lines.push({
        text: `הושבה: ${displayPlannedCount}/${seatsTotal}`,
        fill: "#B98A45",
        fontSize: 15,
        fontStyle: "bold",
      });

      lines.push({
        text: `בפועל: ${displayActualCount}/${seatsTotal}`,
        fill: "#DC2626",
        fontSize: 15,
        fontStyle: "bold",
      });
    } else {
      lines.push({
        text: `${displayPlannedCount}/${seatsTotal}`,
        fill: tableText,
        fontSize: 15,
        fontStyle: "bold",
      });
    }

    return lines;
  }, [
    groupForTable,
    tableTitle,
    tableText,
    seatingMode,
    displayPlannedCount,
    displayActualCount,
    seatsTotal,
  ]);

  const layout = useMemo(() => getTableLayout(table), [table.type, table.seats]);

  const seatsCoords = layout.coords;

  /* ============================================================
     חישוב כיסאות שהגיעו בפועל
     ההושבה הרגילה נשארת בסיס בלייב.
     רק actualArrivedCount / liveArrivals צובע כיסאות אדום.
  ============================================================ */
  const arrivedSeatsSet = useMemo(() => {
    const arrived = new Set();

    const maxSeats = Number(table.seats || 0);

    /*
      בלייב הצביעה חייבת להתבסס על מצב השולחן הנוכחי מהשרת
      כדי שכיסאות ששוחררו יהפכו לירוק מיד אחרי refresh של הנתונים.
      במצב רגיל ממשיכים לעבוד לפי ההושבה המקורית.
    */
    const seatSource =
      seatingMode === "live" ? currentSeatedGuests : plannedSeatedGuests;

    const guestSourceForCounts = [
      ...plannedSeatedGuests,
      ...currentSeatedGuests,
    ];

    if (!guestSourceForCounts.length && !seatSource.length) return arrived;

    const guestActualMap = new Map();
    let totalActualRequired = 0;

    for (const seated of guestSourceForCounts) {
      const guestId = String(seated.guestId || "");
      if (!guestId || guestActualMap.has(guestId)) continue;

      const guest = guests.find((g) => String(g._id || g.id) === guestId);

      if (!guest) {
        guestActualMap.set(guestId, 0);
        continue;
      }

      let value = 0;

      if (seatingMode === "live") {
        const key = String(guest.id ?? guest._id);

        value =
          liveArrivals && Object.prototype.hasOwnProperty.call(liveArrivals, key)
            ? Number(liveArrivals[key] || 0)
            : Number(guest.actualArrivedCount || 0);
      } else {
        value = Number(guest.arrivedCount || 0);
      }

      const safeValue = Math.max(0, value);
      guestActualMap.set(guestId, safeValue);
      totalActualRequired += safeValue;
    }

    const sorted = [...seatSource].sort((a, b) => {
      const aIndex = normalizeSeatIndexForSource(a, seatSource, maxSeats);
      const bIndex = normalizeSeatIndexForSource(b, seatSource, maxSeats);

      return Number(aIndex ?? 0) - Number(bIndex ?? 0);
    });

    for (const seated of sorted) {
      const guestId = String(seated.guestId);
      const remaining = Number(guestActualMap.get(guestId) || 0);

      if (remaining <= 0) continue;

      const normalizedSeatIndex = normalizeSeatIndexForSource(
        seated,
        seatSource,
        maxSeats
      );

      if (
        normalizedSeatIndex !== null &&
        normalizedSeatIndex >= 0 &&
        normalizedSeatIndex < maxSeats
      ) {
        arrived.add(Number(normalizedSeatIndex));
      }

      guestActualMap.set(guestId, remaining - 1);
    }

    /*
      השלמה חשובה: אם בפועל הגיעו יותר אנשים מכמות השיבוצים
      שהקנבס קיבל מהשרת, עדיין נצבע מספר נכון של כיסאות באדום.
    */
    if (seatingMode === "live") {
      const target = Math.min(maxSeats, Math.max(0, totalActualRequired));

      if (arrived.size < target) {
        const preferredIndexes = [
          ...sorted
            .map((s) => normalizeSeatIndexForSource(s, seatSource, maxSeats))
            .filter((idx) => idx !== null && idx >= 0 && idx < maxSeats),
          ...Array.from({ length: maxSeats }, (_, idx) => idx),
        ];

        for (const idx of preferredIndexes) {
          if (arrived.size >= target) break;
          arrived.add(Number(idx));
        }
      }
    }

    return arrived;
  }, [
    plannedSeatedGuests,
    currentSeatedGuests,
    guests,
    seatingMode,
    liveArrivals,
    table.seats,
  ]);

  const getSeatVisual = (seat, seatIndex) => {
    /*
      מצב רגיל בלבד:
      - כיסא משובץ = זהב
      - כיסא פנוי / כיסא חדש שנוסף = שמנת
      אסור ירוק במצב רגיל.
    */
    if (seatingMode !== "live") {
      const isOccupied = !!seat;

      return {
        chairFill: isOccupied ? "#B98A45" : "#FFF9EF",
        chairStroke: isOccupied ? "#8B6532" : "#D9C3A2",
        chairHighlight: isOccupied ? "#E3BD63" : "#FFFFFF",
        chairDepth: isOccupied ? "#8D642C" : "#E9D8BD",
        chairShadow: isOccupied ? "#6F4A19" : "#D6C3A6",
      };
    }

    /*
      מצב לייב בלבד:
      קודם בודקים אם אין seat.
      כיסא בלי שיבוץ בפועל = ירוק.
      זה כולל:
      - כיסא חדש שהוספת
      - כיסא ששוחרר
      - כיסא פנוי רגיל בלייב
    */
    if (!seat) {
      return {
        chairFill: "#16A34A",
        chairStroke: "#166534",
        chairHighlight: "#DCFCE7",
        chairDepth: "#15803D",
        chairShadow: "#14532D",
      };
    }

    /*
      בלייב:
      רק כיסא שיש עליו seat אמיתי יכול להיות אדום.
      ככה כיסא חדש בלי שיבוץ לא ייצבע אדום בטעות.
    */
    if (arrivedSeatsSet.has(Number(seatIndex))) {
      return {
        chairFill: "#DC2626",
        chairStroke: "#991B1B",
        chairHighlight: "#FEE2E2",
        chairDepth: "#B91C1C",
        chairShadow: "#7F1D1D",
      };
    }

    /*
      בלייב:
      יש שיבוץ רגיל אבל עדיין לא הגיע בפועל = זהב.
    */
    return {
      chairFill: "#B98A45",
      chairStroke: "#8B6532",
      chairHighlight: "#E3BD63",
      chairDepth: "#8D642C",
      chairShadow: "#6F4A19",
    };
  };

  const renderTableCenterLines = (boxWidth, compact = false) => {
    const lineHeight =
      seatingMode === "live"
        ? compact
          ? 15
          : 22
        : compact
          ? 21
          : 26;

    const totalHeight = tableLines.length * lineHeight;

    const startY =
      seatingMode === "live" && compact
        ? -totalHeight / 2 - 2
        : -totalHeight / 2 + 2;

    return tableLines.map((line, index) => {
      const safeFontSize =
        seatingMode === "live" && compact
          ? Math.min(Number(line.fontSize || 13), index <= 1 ? 11 : 12)
          : line.fontSize;

      return (
        <Text
          key={`table-line-${index}`}
          text={line.text}
          width={boxWidth}
          x={-boxWidth / 2}
          y={startY + index * lineHeight}
          align="center"
          verticalAlign="middle"
          fill={line.fill}
          fontSize={safeFontSize}
          fontStyle={line.fontStyle}
          listening={false}
          perfectDrawEnabled={false}
        />
      );
    });
  };

  const handleDrop = (e) => {
    e.cancelBubble = true;

    if (draggingGuest) {
      assignGuestBlock({
        guestId: draggingGuest._id || draggingGuest.id,
        tableId: table.id,
      });
    }
  };

  const handleClick = (e) => {
    e.cancelBubble = true;

    useSeatingStore.setState({ selectedTableId: table.id });

    if (draggingGuest) return;

    if (typeof table.openAddGuestModal !== "function") return;

    table.openAddGuestModal();
  };

  const updatePositionInStore = () => {
    if (!tableRef.current) return;

    const pos = tableRef.current.position();
    const rotation = tableRef.current.rotation();

    useSeatingStore.setState((state) => ({
      tables: state.tables.map((t) =>
        t.id === table.id
          ? {
              ...t,
              x: pos.x,
              y: pos.y,
              rotation,
            }
          : t
      ),
    }));
  };

  /* ====== סיבוב ====== */
  const startRotate = (e) => {
    e.cancelBubble = true;
    if (!tableRef.current) return;

    const stage = e.target.getStage();
    const pointer = stage.getPointerPosition();
    const center = tableRef.current.getAbsolutePosition();

    const dx = pointer.x - center.x;
    const dy = pointer.y - center.y;

    startAngleRef.current = Math.atan2(dy, dx);
    startRotationRadRef.current =
      (tableRef.current.rotation() * Math.PI) / 180;

    rotateActiveRef.current = true;
    setRotating(true);

    const move = () => {
      if (!rotateActiveRef.current || !tableRef.current) return;

      const p = stage.getPointerPosition();
      const c = tableRef.current.getAbsolutePosition();

      const ang = Math.atan2(p.y - c.y, p.x - c.x);
      const newRot = ang - startAngleRef.current + startRotationRadRef.current;

      tableRef.current.rotation((newRot * 180) / Math.PI);
      tableRef.current.getLayer()?.batchDraw();
    };

    const end = () => {
      rotateActiveRef.current = false;
      setRotating(false);
      updatePositionInStore();

      stage.off("mousemove.tableRotate", move);
      stage.off("mouseup.tableRotate", end);
    };

    stage.on("mousemove.tableRotate", move);
    stage.on("mouseup.tableRotate", end);
  };

  const { size, width, height, radius } = layout;

  return (
    <Group
      ref={tableRef}
      x={table.x}
      y={table.y}
      rotation={table.rotation || 0}
      draggable={!rotating}
      onDragEnd={updatePositionInStore}
      onMouseUp={handleDrop}
      onClick={handleClick}
      onTap={handleClick}
    >
      {/* ============================================================
          כסאות בסגנון הסקיצה:
          גב עליון רחב + מושב גדול + עומק תחתון + הצללה.
      ============================================================ */}
      {seatsCoords.map((c, i) => {
        const seatSource =
          seatingMode === "live" ? currentSeatedGuests : plannedSeatedGuests;

        const seat = findSeatForRenderedIndex(
          seatSource,
          i,
          Number(table.seats || 0)
        );

        const rotation = getSeatRotation(layout, c);

        let chairX = c.x;
        let chairY = c.y;

        if (layout.type === "banquet") {
          const tableEdgeY = layout.height / 2;
          const outsideOffset = 6;

          chairY =
            c.y > 0
              ? tableEdgeY + outsideOffset
              : -tableEdgeY - outsideOffset;
        } else {
          const dist = Math.hypot(c.x, c.y) || 1;
          const inset = 4;

          chairX = c.x - (c.x / dist) * inset;
          chairY = c.y - (c.y / dist) * inset;
        }

        const {
          chairFill,
          chairStroke,
          chairHighlight,
          chairDepth,
          chairShadow,
        } = getSeatVisual(seat, i);

        return (
          <Group key={i} x={chairX} y={chairY} rotation={rotation}>
            <Rect
              x={-17}
              y={-13}
              width={34}
              height={26}
              cornerRadius={5}
              fill={chairShadow}
              opacity={0.32}
              listening={false}
              perfectDrawEnabled={false}
            />

            <Rect
              x={-15}
              y={-20}
              width={30}
              height={11}
              cornerRadius={5}
              fill={chairHighlight}
              stroke={chairStroke}
              strokeWidth={1.3}
              shadowColor="rgba(0,0,0,0.16)"
              shadowBlur={2}
              shadowOffset={{ x: 0, y: 1 }}
              shadowOpacity={0.4}
              perfectDrawEnabled={false}
            />

            <Rect
              x={-17}
              y={-11}
              width={34}
              height={25}
              cornerRadius={6}
              fill={chairFill}
              stroke={chairStroke}
              strokeWidth={1.5}
              shadowColor="rgba(0,0,0,0.18)"
              shadowBlur={2}
              shadowOffset={{ x: 0, y: 1 }}
              shadowOpacity={0.5}
              perfectDrawEnabled={false}
            />

            <Rect
              x={-13}
              y={-8}
              width={26}
              height={10}
              cornerRadius={4}
              fill={chairHighlight}
              opacity={0.25}
              listening={false}
              perfectDrawEnabled={false}
            />

            <Rect
              x={-14}
              y={9}
              width={28}
              height={5}
              cornerRadius={3}
              fill={chairDepth}
              opacity={0.55}
              listening={false}
              perfectDrawEnabled={false}
            />
          </Group>
        );
      })}

      {/* שולחן עגול */}
      {layout.type === "round" && (
        <>
          <Circle
            radius={radius}
            fill={tableFill}
            stroke={tableStroke}
            strokeWidth={1.4}
            perfectDrawEnabled={false}
          />

          {renderTableCenterLines(radius * 2)}
        </>
      )}

      {/* שולחן מרובע */}
      {layout.type === "square" && (
        <>
          <Rect
            width={size}
            height={size}
            offsetX={size / 2}
            offsetY={size / 2}
            fill={tableFill}
            stroke={tableStroke}
            strokeWidth={1.4}
            cornerRadius={10}
            perfectDrawEnabled={false}
          />

          {renderTableCenterLines(size)}
        </>
      )}

      {/* שולחן אבירים / מלבני */}
      {layout.type === "banquet" && (
        <>
          <Rect
            width={width}
            height={height}
            offsetX={width / 2}
            offsetY={height / 2}
            fill={tableFill}
            stroke={tableStroke}
            strokeWidth={1.4}
            cornerRadius={12}
            perfectDrawEnabled={false}
          />

          {renderTableCenterLines(width, true)}
        </>
      )}

      {/* כפתור סיבוב */}
      {!hideSeats && (
        <Group
          y={
            layout.type === "round"
              ? -radius - 42
              : layout.type === "square"
                ? -size / 2 - 42
                : -height / 2 - 42
          }
          onMouseDown={startRotate}
        >
          <Circle
            radius={12}
            fill="#FFF9ED"
            stroke="#CBA56C"
            strokeWidth={1}
            perfectDrawEnabled={false}
          />

          <Text
            text="↻"
            width={24}
            height={24}
            offsetX={12}
            offsetY={12}
            align="center"
            verticalAlign="middle"
            fill="#9A6A2F"
            fontSize={14}
            listening={false}
            perfectDrawEnabled={false}
          />
        </Group>
      )}
    </Group>
  );
}

export default TableRenderer;