"use client";

import { useMemo, useState } from "react";

type SeatingGuest = {
  guestId: string;
  seatIndex?: number;
  arrived?: boolean;
};

type SeatingTable = {
  _id?: string;
  id?: string;
  name?: string;
  number?: number;
  tableNumber?: number;
  seats?: number;
  capacity?: number;
  seatedGuests?: SeatingGuest[];
};

type Guest = {
  id?: string;
  _id: string;
  name?: string;
  tableId?: string | null;
  tableName?: string;
  tableNumber?: number;
  guestsCount?: number;
  arrivedCount?: number;
  actualArrivedCount?: number;
};

type Props = {
  guest: Guest;
  tables: SeatingTable[];
  onUpdated: (updatedGuest: Partial<Guest>) => void;
  onTablesUpdated?: (tables: SeatingTable[]) => void;
  onRefresh?: () => Promise<void> | void;
};

function getTableId(table: SeatingTable) {
  return String(table.id || table._id || "");
}

function getTableNumber(table: SeatingTable) {
  return table.tableNumber || table.number || undefined;
}

function getTableLabel(table: SeatingTable) {
  const raw = table.name || table.tableNumber || table.number;

  if (!raw) return "שולחן ללא שם";

  const text = String(raw).trim();

  if (text.includes("שולחן")) return text;

  return `שולחן ${text}`;
}

function getGuestId(guest: Guest) {
  return String(guest.id || guest._id || "");
}

function findGuestCurrentTable(guest: Guest, tables: SeatingTable[]) {
  const guestId = getGuestId(guest);

  const tableFromSeating = tables.find((table) =>
    (table.seatedGuests || []).some(
      (sg) => String(sg.guestId) === String(guestId)
    )
  );

  if (tableFromSeating) return tableFromSeating;

  if (guest.tableId) {
    return (
      tables.find((table) => getTableId(table) === String(guest.tableId)) ||
      null
    );
  }

  const guestTableText =
    guest.tableName || guest.tableNumber
      ? String(guest.tableName || guest.tableNumber)
          .replace("שולחן", "")
          .trim()
      : "";

  if (!guestTableText) return null;

  return (
    tables.find((table) => {
      const tableNumber = String(getTableNumber(table) || "").trim();
      const tableName = String(table.name || "")
        .replace("שולחן", "")
        .trim();

      return tableNumber === guestTableText || tableName === guestTableText;
    }) || null
  );
}

function getGuestSeatCount(guest: Guest) {
  const actual = Number(guest.actualArrivedCount || 0);
  const arrived = Number(guest.arrivedCount || 0);
  const planned = Number(guest.guestsCount || 0);

  if (actual > 0) return actual;
  if (arrived > 0) return arrived;
  if (planned > 0) return planned;

  return 1;
}

function findFreeSeatIndexes(
  table: SeatingTable,
  count: number,
  guestId: string
) {
  const capacity = Number(table.capacity || table.seats || 12);

  const occupied = new Set(
    (table.seatedGuests || [])
      .filter((sg) => String(sg.guestId) !== String(guestId))
      .map((sg) => Number(sg.seatIndex))
      .filter((n) => Number.isFinite(n))
  );

  const free: number[] = [];

  for (let i = 0; i < capacity; i++) {
    if (!occupied.has(i)) {
      free.push(i);
    }

    if (free.length >= count) {
      return free;
    }
  }

  return free;
}

export default function LiveGuestTableSelect({
  guest,
  tables,
  onUpdated,
  onTablesUpdated,
  onRefresh,
}: Props) {
  const [saving, setSaving] = useState(false);

  const guestId = getGuestId(guest);

  const sortedTables = useMemo(() => {
    return [...(tables || [])].sort((a, b) => {
      const aNumber = Number(getTableNumber(a) || 0);
      const bNumber = Number(getTableNumber(b) || 0);

      if (aNumber && bNumber) return aNumber - bNumber;

      return getTableLabel(a).localeCompare(getTableLabel(b), "he", {
        sensitivity: "base",
      });
    });
  }, [tables]);

  const currentTable = useMemo(() => {
    return findGuestCurrentTable(guest, sortedTables);
  }, [guest, sortedTables]);

  const currentValue = currentTable ? getTableId(currentTable) : "";

  async function handleChange(nextTableId: string) {
    if (saving) return;

    const targetTable =
      sortedTables.find((table) => getTableId(table) === nextTableId) || null;

    const nextTableName = targetTable ? getTableLabel(targetTable) : "";
    const nextTableNumber = targetTable ? getTableNumber(targetTable) : undefined;

    const seatsToMove = getGuestSeatCount(guest);

    if (targetTable) {
      const freeSeats = findFreeSeatIndexes(targetTable, seatsToMove, guestId);

      if (freeSeats.length < seatsToMove) {
        alert("אין מספיק מקומות פנויים בשולחן הזה");
        return;
      }
    }

    setSaving(true);

    const previousTables = tables;
    const previousGuest = {
      tableId: guest.tableId,
      tableName: guest.tableName,
      tableNumber: guest.tableNumber,
    };

    const updatedTables = sortedTables.map((table) => {
      const tableId = getTableId(table);

      const cleanedGuests = (table.seatedGuests || []).filter(
        (sg) => String(sg.guestId) !== String(guestId)
      );

      if (!targetTable || tableId !== nextTableId) {
        return {
          ...table,
          seatedGuests: cleanedGuests,
        };
      }

      const freeSeats = findFreeSeatIndexes(
        {
          ...table,
          seatedGuests: cleanedGuests,
        },
        seatsToMove,
        guestId
      );

      return {
        ...table,
        seatedGuests: [
          ...cleanedGuests,
          ...freeSeats.slice(0, seatsToMove).map((seatIndex) => ({
            guestId,
            seatIndex,
            arrived: Number(guest.actualArrivedCount || 0) > 0,
          })),
        ],
      };
    });

    onTablesUpdated?.(updatedTables);

    onUpdated({
  tableId: nextTableId || null,
  tableName: nextTableName || "",
  tableNumber: nextTableNumber,
});

    try {
      const res = await fetch(`/api/guests/${guest._id}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tableId: nextTableId || null,
          tableName: nextTableName || "",
          tableNumber: nextTableNumber,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || "Failed to update guest table");
      }

      await onRefresh?.();
    } catch (error) {
      console.error("Live table update error:", error);

      onTablesUpdated?.(previousTables);
      onUpdated(previousGuest);

      alert("לא הצלחנו לעדכן שולחן לאורח");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="relative min-w-[170px]">
      <select
        value={currentValue}
        disabled={saving}
        onChange={(e) => handleChange(e.target.value)}
        className="
          h-11
          w-full
          rounded-2xl
          border
          border-[#D8C6A8]
          bg-white
          px-3
          text-sm
          font-black
          text-[#4A3524]
          shadow-sm
          outline-none
          transition
          hover:border-[#C49A55]
          focus:border-[#C49A55]
          focus:ring-2
          focus:ring-[#C49A55]/25
          disabled:cursor-not-allowed
          disabled:bg-[#F5F1EA]
          disabled:text-[#A99B8A]
        "
      >
        <option value="">ללא שולחן</option>

        {sortedTables.map((table) => {
          const tableId = getTableId(table);
          if (!tableId) return null;

          const seatedCount = (table.seatedGuests || []).length;
          const capacity = Number(table.capacity || table.seats || 12);

          return (
            <option key={tableId} value={tableId}>
              {getTableLabel(table)} ({seatedCount}/{capacity})
            </option>
          );
        })}
      </select>

      {saving && (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-[#B8844F]">
          שומר...
        </span>
      )}
    </div>
  );
}