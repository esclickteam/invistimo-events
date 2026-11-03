"use client";

import React from "react";
import { useRef, useMemo, useState, useEffect } from "react";
import { Group, Circle, Rect, Text } from "react-konva";
import { useSeatingStore } from "@/store/seatingStore";
import { useSearchParams } from "next/navigation";
import { useGroupStore } from "@/store/groupStore";
import { SEATING_EXPORT_HIDE_NAME } from "@/app/dashboard/seating/seatingExport";
import { clampLayoutScale, controlCounterScale } from "@/lib/seating/canvasLayout";
import { legacyTableLayout } from "@/lib/seating/legacyTableLayout";
import {
  clampTableVisualSize,
  displayedOuter,
  explicitVisualSize,
  fitTableLayout,
  sketchProportionalSize,
} from "@/lib/seating/tableVisual";

/* ============================================================
   חישוב דינמי של צורת השולחן + כסאות
============================================================ */
function getTableLayout(rawTable) {
  const explicit = explicitVisualSize(rawTable);
  if (explicit) return fitTableLayout(rawTable, explicit);
  return legacyTableLayout(rawTable);
}

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
   TableRenderer
============================================================ */
function TableRenderer({ table, hideSeats = false, cameraScale = 1 }) {
  const tableRef = useRef(null);

  const [rotating, setRotating] = useState(false);
  const [resizing, setResizing] = useState(false);

  const rotateActiveRef = useRef(false);
  const startAngleRef = useRef(0);
  const startRotationRadRef = useRef(0);

  const resizeActiveRef = useRef(false);
  const resizeStartDistRef = useRef(1);
  const resizeStartScaleRef = useRef(1);

  const demoMode = useSeatingStore((s) => s.demoMode);
  const highlightedTable = useSeatingStore((s) => s.highlightedTable);
  const selectedGuestId = useSeatingStore((s) => s.selectedGuestId);
  const draggingGuest = useSeatingStore((s) => s.draggingGuest);
  const guests = useSeatingStore((s) => s.guests);
  const assignGuestBlock = useSeatingStore((s) => s.assignGuestBlock);
  const selectedTableId = useSeatingStore((s) => s.selectedTableId);
  const selectedTableIds = useSeatingStore((s) => s.selectedTableIds);
  const liveArrivals = useSeatingStore((s) => s.liveArrivals);
  const seatingMode = useSeatingStore((s) => s.seatingMode);

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
      .map((seat) => ({
        ...seat,
        guestId: String(seat.guestId || seat._id || seat.id || ""),
        seatIndex: Number(seat.seatIndex ?? 0),
      }))
      .filter((seat) => seat.guestId);
  };

  const liveSnapshotKey = tableId ? `invistimo:planned-seating:${tableId}` : "";

  /*
    מקור אמת להושבה המקורית (התוכנית שהזוג שמר):
    1. snapshot מהשרת אם קיים
    2. table.seatedGuests מהשרת — הבסיס להושבה בלייב
    3. localStorage רק אם השרת ריק (שחזור מקומי אחרי שחרור מפורש)
    אסור להעדיף localStorage על נתוני השרת — זה הסתיר שיבוצים במכשירים אחרים.
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

    const fromServer = normalizeSeatedGuests(table.seatedGuests || []);
    if (fromServer.length) {
      return fromServer;
    }

    if (seatingMode === "live" && typeof window !== "undefined" && liveSnapshotKey) {
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

    return fromServer;
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
    LIVE display contract (couple plan is the base):
    - משובצים = chairs assigned on the map (seatedGuests), even if nobody arrived
    - בפועל = sum of actualArrivedCount / liveArrivals for those guests
    - טרם הגיעו = max(0, משובצים - בפועל)
    Regular mode still uses RSVP arrivedCount for the single occupancy line.
  */
  const assignedSeatsCount = useMemo(() => {
    if (plannedSeatedGuests.length) return plannedSeatedGuests.length;
    if (currentSeatedGuests.length) return currentSeatedGuests.length;
    return Math.max(0, Number(table.arrivedCount ?? 0));
  }, [plannedSeatedGuests, currentSeatedGuests, table.arrivedCount]);

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

      if (!g) {
        // Guest missing from list but still assigned — count their chairs.
        return (
          sum +
          plannedSeatedGuests.filter((seat) => String(seat.guestId) === guestId)
            .length
        );
      }

      const fromArrived = Number(g.arrivedCount);
      if (Number.isFinite(fromArrived) && fromArrived > 0) {
        return sum + fromArrived;
      }

      const fromGuests = Number(g.guestsCount);
      if (g.rsvp === "yes" && Number.isFinite(fromGuests) && fromGuests > 0) {
        return sum + fromGuests;
      }

      return (
        sum +
        plannedSeatedGuests.filter((seat) => String(seat.guestId) === guestId)
          .length
      );
    }, 0);
  }, [plannedSeatedGuests, guests, table.arrivedCount]);

  const actualArrivedCount = useMemo(() => {
    const seatSource = plannedSeatedGuests.length
      ? plannedSeatedGuests
      : currentSeatedGuests;

    if (!seatSource.length) {
      return Math.max(0, Number(table.actualArrivedCount ?? 0));
    }

    const counted = new Set();

    return seatSource.reduce((sum, s) => {
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
  }, [
    plannedSeatedGuests,
    currentSeatedGuests,
    guests,
    liveArrivals,
    table.actualArrivedCount,
  ]);

  const displayAssignedCount = assignedSeatsCount;
  const displayPlannedCount =
    seatingMode === "live" ? assignedSeatsCount : plannedArrivedCount;
  const displayActualCount = actualArrivedCount;
  const displayRemainingCount = Math.max(
    0,
    displayAssignedCount - displayActualCount
  );

  const isHighlighted =
    highlightedTable === table.id ||
    assigned.some((s) => String(s.guestId) === String(selectedGuestId)) ||
    (from === "personal" &&
      guestIdFromUrl &&
      assigned.some((s) => String(s.guestId) === String(guestIdFromUrl)));

  const hasArrived = seatingMode === "live" ? displayActualCount > 0 : displayPlannedCount > 0;

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
        text: `משובצים: ${displayAssignedCount}`,
        fill: "#B98A45",
        fontSize: 14,
        fontStyle: "bold",
      });

      lines.push({
        text: `בפועל: ${displayActualCount}`,
        fill: "#DC2626",
        fontSize: 14,
        fontStyle: "bold",
      });

      lines.push({
        text: `טרם הגיעו: ${displayRemainingCount}`,
        fill: "#8B6F5A",
        fontSize: 13,
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
    displayAssignedCount,
    displayPlannedCount,
    displayActualCount,
    displayRemainingCount,
    seatsTotal,
  ]);

  const explicitSize = explicitVisualSize(table);
  const layout = useMemo(
    () => getTableLayout(table),
    [table.type, table.seats, table.capacity, explicitSize]
  );

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

    const sorted = [...seatSource].sort(
      (a, b) => Number(a.seatIndex ?? 0) - Number(b.seatIndex ?? 0)
    );

    for (const seated of sorted) {
      const guestId = String(seated.guestId);
      const remaining = Number(guestActualMap.get(guestId) || 0);

      if (remaining <= 0) continue;

      arrived.add(Number(seated.seatIndex));
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
            .map((s) => Number(s.seatIndex ?? 0))
            .filter((idx) => idx >= 0 && idx < maxSeats),
          ...Array.from({ length: maxSeats }, (_, idx) => idx),
        ];

        for (const idx of preferredIndexes) {
          if (arrived.size >= target) break;
          arrived.add(idx);
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
      (seatingMode === "live"
        ? compact
          ? 15
          : 22
        : compact
          ? 21
          : 26) * textScale;

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
          fontSize={safeFontSize * textScale}
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
    const additive = Boolean(e.evt?.shiftKey);
    useSeatingStore.getState().selectTable(table.id, { additive });
  };

  const handleDblClick = (e) => {
    e.cancelBubble = true;
    if (draggingGuest) return;
    if (typeof table.openAddGuestModal !== "function") return;
    table.openAddGuestModal();
  };

  const handleDelete = (e) => {
    e.cancelBubble = true;
    if (!confirm("למחוק את השולחן?")) return;
    deleteTable(table.id);
  };

  const layoutScale = clampLayoutScale(table.layoutScale, 1);

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
              layoutScale: clampLayoutScale(
                t.layoutScale ?? table.layoutScale,
                1
              ),
            }
          : t
      ),
    }));
  };

  const updateLayoutScaleInStore = (nextScale) => {
    const safeScale = clampLayoutScale(nextScale, 1);

    useSeatingStore.setState((state) => ({
      tables: state.tables.map((t) =>
        t.id === table.id
          ? {
              ...t,
              // Visual size only — never touch seats / seatedGuests.
              layoutScale: safeScale,
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
      stage.off("touchmove.tableRotate", move);
      stage.off("touchend.tableRotate", end);
    };

    stage.on("mousemove.tableRotate", move);
    stage.on("mouseup.tableRotate", end);
    stage.on("touchmove.tableRotate", move);
    stage.on("touchend.tableRotate", end);
  };

  const startResize = (e) => {
    e.cancelBubble = true;
    if (!tableRef.current) return;

    const stage = e.target.getStage();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const center = tableRef.current.getAbsolutePosition();
    const dist = Math.max(
      8,
      Math.hypot(pointer.x - center.x, pointer.y - center.y)
    );

    const state = useSeatingStore.getState();
    const selectedIds = (state.selectedTableIds || []).map(String);
    const activeIds = selectedIds.includes(String(table.id))
      ? selectedIds
      : [String(table.id)];
    const startSizes = {};
    for (const item of state.tables || []) {
      const key = String(item.id);
      if (activeIds.includes(key)) {
        startSizes[key] = displayedOuter(item);
      }
    }

    resizeStartDistRef.current = dist;
    resizeActiveRef.current = true;
    setResizing(true);

    const move = () => {
      if (!resizeActiveRef.current || !tableRef.current) return;

      const p = stage.getPointerPosition();
      if (!p) return;

      const c = tableRef.current.getAbsolutePosition();
      const nextDist = Math.max(8, Math.hypot(p.x - c.x, p.y - c.y));
      const ratio = nextDist / resizeStartDistRef.current;
      const base = sketchProportionalSize(
        useSeatingStore.getState().background
      );

      useSeatingStore.setState((current) => ({
        tables: (current.tables || []).map((item) => {
          const key = String(item.id);
          if (!(key in startSizes)) return item;
          const nextSize = clampTableVisualSize(startSizes[key] * ratio, base);
          return {
            ...item,
            x: item.x,
            y: item.y,
            rotation: item.rotation,
            seats: item.seats,
            seatedGuests: item.seatedGuests,
            visualSize: nextSize,
          };
        }),
      }));
    };

    const end = () => {
      resizeActiveRef.current = false;
      setResizing(false);
      stage.off("mousemove.tableResize", move);
      stage.off("mouseup.tableResize", end);
      stage.off("touchmove.tableResize", move);
      stage.off("touchend.tableResize", end);
    };

    stage.on("mousemove.tableResize", move);
    stage.on("mouseup.tableResize", end);
    stage.on("touchmove.tableResize", move);
    stage.on("touchend.tableResize", end);
  };

  const { size, width, height, radius } = layout;
  const isSelected =
    (selectedTableIds || []).map(String).includes(String(table.id)) ||
    String(selectedTableId || "") === String(table.id);
  const visualScale = explicitSize ? 1 : layoutScale;
  const textScale = explicitSize
    ? Math.min(1, Math.max(0.42, explicitSize / 260))
    : 1;
  const counter = controlCounterScale(cameraScale);
  const edgeX = ((layout.outerWidth || size) / 2) * visualScale;
  const edgeY = ((layout.outerHeight || height) / 2) * visualScale;

  return (
    <Group
      ref={tableRef}
      x={table.x}
      y={table.y}
      rotation={table.rotation || 0}
      draggable={!rotating && !resizing}
      onDragEnd={updatePositionInStore}
      onMouseUp={handleDrop}
      onClick={handleClick}
      onTap={handleClick}
      onDblClick={handleDblClick}
      onDblTap={handleDblClick}
    >
      <Group scaleX={visualScale} scaleY={visualScale}>
      {/* ============================================================
          כסאות בסגנון הסקיצה:
          גב עליון רחב + מושב גדול + עומק תחתון + הצללה.
      ============================================================ */}
      {seatsCoords.map((c, i) => {
        const seatSource =
          seatingMode === "live" ? currentSeatedGuests : plannedSeatedGuests;

        const seat = seatSource.find(
          (s) => Number(s.seatIndex) === i
        );

        const rotation = getSeatRotation(layout, c);
        const chairX = c.x;
        const chairY = c.y;

        const {
          chairFill,
          chairStroke,
          chairHighlight,
          chairDepth,
          chairShadow,
        } = getSeatVisual(seat, i);

        return (
          <Group
            key={i}
            x={chairX}
            y={chairY}
            rotation={rotation}
            scaleX={layout.chairScale || 1}
            scaleY={layout.chairScale || 1}
          >
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

          {renderTableCenterLines(radius * 2, Boolean(layout.compact))}
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

          {renderTableCenterLines(size, Boolean(layout.compact))}
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
      </Group>

      {/* פקדים בגודל מסך קבוע — לא גדלים עם השולחן או עם הזום */}
      {!hideSeats && isSelected && (
        <Group
          name={SEATING_EXPORT_HIDE_NAME}
          x={edgeX}
          y={-edgeY}
          scaleX={counter}
          scaleY={counter}
          onMouseDown={handleDelete}
          onTouchStart={handleDelete}
          onClick={(e) => {
            e.cancelBubble = true;
          }}
        >
          <Circle radius={13} fill="#ef4444" perfectDrawEnabled={false} />
          <Text
            text="✕"
            width={26}
            height={26}
            offsetX={13}
            offsetY={13}
            align="center"
            verticalAlign="middle"
            fill="white"
            fontSize={14}
            fontStyle="bold"
            listening={false}
            perfectDrawEnabled={false}
          />
        </Group>
      )}

      {!hideSeats && isSelected && (
        <Group
          name={SEATING_EXPORT_HIDE_NAME}
          x={0}
          y={-edgeY - 18 * counter}
          scaleX={counter}
          scaleY={counter}
          onMouseDown={startRotate}
          onTouchStart={startRotate}
        >
          <Circle
            radius={13}
            fill="#FFF9ED"
            stroke="#CBA56C"
            strokeWidth={1}
            perfectDrawEnabled={false}
          />
          <Text
            text="↻"
            width={26}
            height={26}
            offsetX={13}
            offsetY={13}
            align="center"
            verticalAlign="middle"
            fill="#9A6A2F"
            fontSize={14}
            listening={false}
            perfectDrawEnabled={false}
          />
        </Group>
      )}

      {!hideSeats && isSelected && (
        <Group
          name={SEATING_EXPORT_HIDE_NAME}
          x={edgeX + 8 * counter}
          y={edgeY + 8 * counter}
          scaleX={counter}
          scaleY={counter}
          onMouseDown={startResize}
          onTouchStart={startResize}
        >
          <Circle
            radius={13}
            fill="#17203A"
            stroke="#FFF9ED"
            strokeWidth={1.5}
            perfectDrawEnabled={false}
          />
          <Text
            text="⤡"
            width={26}
            height={26}
            offsetX={13}
            offsetY={13}
            align="center"
            verticalAlign="middle"
            fill="#FFF9ED"
            fontSize={13}
            listening={false}
            perfectDrawEnabled={false}
          />
        </Group>
      )}
    </Group>
  );
}

export default TableRenderer;