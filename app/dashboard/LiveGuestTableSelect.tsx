"use client";

import { useMemo, useState } from "react";

type SeatingGuest = {
  guestId?: string | { _id?: string; id?: string };
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
  seatCount?: number;
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
  eventId: string;
  guest: Guest;
  tables: SeatingTable[];
  onUpdated: (updatedGuest: Partial<Guest>) => void;
  onTablesUpdated?: (tables: SeatingTable[]) => void;
  onRefresh?: () => Promise<void> | void;
};

function normalizeId(value: any) {
  if (!value) return "";

  if (typeof value === "string") return value;

  if (typeof value === "object") {
    return String(value._id || value.id || "");
  }

  return String(value);
}

function getTableId(table: SeatingTable) {
  return String(table._id || table.id || "");
}

function getGuestId(guest: Guest) {
  return String(guest._id || guest.id || "");
}

function getTableNumber(table: SeatingTable) {
  return table.tableNumber || table.number || undefined;
}

function getTableCapacity(table: SeatingTable) {
  return Number(table.capacity || table.seats || table.seatCount || 12);
}

function getTableLabel(table: SeatingTable) {
  const raw = table.name || table.tableNumber || table.number;

  if (!raw) return "שולחן ללא שם";

  const text = String(raw).trim();

  if (text.includes("שולחן")) return text;

  return `שולחן ${text}`;
}

function cleanTableText(value?: string | number | null) {
  if (!value) return "";

  return String(value)
    .replace("שולחן", "")
    .trim();
}

function findGuestCurrentTable(guest: Guest, tables: SeatingTable[]) {
  const guestId = getGuestId(guest);

  // 1. קודם כל מזהים לפי ההושבה האמיתית: seatedGuests
  const tableFromSeating = tables.find((table) =>
    (table.seatedGuests || []).some((sg) => {
      const seatedGuestId = normalizeId(sg.guestId);
      return seatedGuestId === guestId;
    })
  );

  if (tableFromSeating) return tableFromSeating;

  // 2. אם יש tableId על האורח
  if (guest.tableId) {
    const tableById =
      tables.find((table) => getTableId(table) === String(guest.tableId)) ||
      null;

    if (tableById) return tableById;
  }

  // 3. fallback לפי tableName / tableNumber
  const guestTableText =
    cleanTableText(guest.tableName) || cleanTableText(guest.tableNumber);

  if (!guestTableText) return null;

  return (
    tables.find((table) => {
      const tableName = cleanTableText(table.name);
      const tableNumber = cleanTableText(getTableNumber(table));
      const tableLabel = cleanTableText(getTableLabel(table));

      return (
        tableName === guestTableText ||
        tableNumber === guestTableText ||
        tableLabel === guestTableText
      );
    }) || null
  );
}

export default function LiveGuestTableSelect({
  eventId,
  guest,
  tables,
  onUpdated,
  onTablesUpdated,
  onRefresh,
}: Props) {
  const [saving, setSaving] = useState(false);

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

    if (!eventId) {
      alert("לא נמצא מזהה אירוע לעדכון ההושבה");
      return;
    }

    if (nextTableId === currentValue) return;

    const selectedTable =
      sortedTables.find((table) => getTableId(table) === nextTableId) || null;

    const fallbackTableName = selectedTable ? getTableLabel(selectedTable) : "";
    const fallbackTableNumber = selectedTable
      ? getTableNumber(selectedTable)
      : undefined;

    const previousGuest = {
      tableId: guest.tableId,
      tableName: guest.tableName,
      tableNumber: guest.tableNumber,
    };

    setSaving(true);

    // עדכון אופטימי קטן בדשבורד כדי שהמשתמש יראה בחירה מיידית
    onUpdated({
      tableId: nextTableId || null,
      tableName: fallbackTableName || "",
      tableNumber: fallbackTableNumber,
    });

    try {
      const res = await fetch("/api/seating/live/move-guest-table", {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventId,
          guestId: guest._id,
          toTableId: nextTableId || null,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || "Failed to update guest table");
      }

      if (data?.guest) {
        onUpdated({
          tableId: data.guest.tableId ?? nextTableId ?? null,
          tableName: data.guest.tableName ?? fallbackTableName ?? "",
          tableNumber: data.guest.tableNumber ?? fallbackTableNumber,
        });
      } else {
        onUpdated({
          tableId: nextTableId || null,
          tableName: fallbackTableName || "",
          tableNumber: fallbackTableNumber,
        });
      }

      if (Array.isArray(data?.tables)) {
        onTablesUpdated?.(data.tables);
      }

      await onRefresh?.();
    } catch (error: any) {
      console.error("Live table update error:", error);

      onUpdated(previousGuest);

      alert(error?.message || "לא הצלחנו לעדכן שולחן לאורח");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="relative min-w-[175px]">
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
          const capacity = getTableCapacity(table);

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