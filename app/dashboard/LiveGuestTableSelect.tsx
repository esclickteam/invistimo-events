"use client";

import { useMemo, useState } from "react";

type SeatingTable = {
  _id?: string;
  id?: string;
  name?: string;
  number?: number;
  tableNumber?: number;
  seats?: number;
  capacity?: number;
  seatedGuests?: any[];
};

type Guest = {
  id?: string;
  _id: string;
  name?: string;
  tableId?: string | null;
  tableName?: string;
  tableNumber?: number;
  actualArrivedCount?: number;
};

type Props = {
  guest: Guest;
  tables: SeatingTable[];
  currentTableFromStore?: SeatingTable | null;
  disabled?: boolean;
  onUpdated: (updatedGuest: Partial<Guest>) => void;
  onRefresh?: () => Promise<void> | void;
};

function getTableId(table: SeatingTable) {
  return String(table._id || table.id || "");
}

function getTableLabel(table: SeatingTable) {
  const rawName = table.name || table.tableNumber || table.number;

  if (!rawName) return "שולחן ללא שם";

  const text = String(rawName);

  if (text.includes("שולחן")) return text;

  return `שולחן ${text}`;
}

function getCurrentTableId(
  guest: Guest,
  tables: SeatingTable[],
  currentTableFromStore?: SeatingTable | null
) {
  if (guest.tableId) return String(guest.tableId);

  if (currentTableFromStore) {
    return getTableId(currentTableFromStore);
  }

  const guestTableText =
    guest.tableName || guest.tableNumber
      ? String(guest.tableName || guest.tableNumber)
      : "";

  if (!guestTableText) return "";

  const normalizedGuestTable = guestTableText.replace("שולחן", "").trim();

  const matched = tables.find((table) => {
    const label = getTableLabel(table).replace("שולחן", "").trim();
    const name = String(table.name || "").replace("שולחן", "").trim();
    const number = String(table.tableNumber || table.number || "").trim();

    return (
      label === normalizedGuestTable ||
      name === normalizedGuestTable ||
      number === normalizedGuestTable
    );
  });

  return matched ? getTableId(matched) : "";
}

export default function LiveGuestTableSelect({
  guest,
  tables,
  currentTableFromStore,
  disabled,
  onUpdated,
  onRefresh,
}: Props) {
  const [saving, setSaving] = useState(false);

  const sortedTables = useMemo(() => {
    return [...(tables || [])].sort((a, b) => {
      const aNumber = Number(a.tableNumber || a.number || 0);
      const bNumber = Number(b.tableNumber || b.number || 0);

      if (aNumber && bNumber) return aNumber - bNumber;

      return getTableLabel(a).localeCompare(getTableLabel(b), "he", {
        sensitivity: "base",
      });
    });
  }, [tables]);

  const currentValue = getCurrentTableId(
    guest,
    sortedTables,
    currentTableFromStore
  );

  async function handleChange(nextTableId: string) {
    if (saving) return;

    const selectedTable =
      sortedTables.find((table) => getTableId(table) === nextTableId) || null;

    const nextTableName = selectedTable ? getTableLabel(selectedTable) : "";
    const nextTableNumber =
      selectedTable?.tableNumber || selectedTable?.number || undefined;

    setSaving(true);

    const previousGuest = {
      tableId: guest.tableId,
      tableName: guest.tableName,
      tableNumber: guest.tableNumber,
    };

    onUpdated({
      tableId: nextTableId || null,
      tableName: nextTableName,
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

      if (data?.guest) {
        onUpdated({
          tableId: data.guest.tableId ?? nextTableId ?? null,
          tableName: data.guest.tableName ?? nextTableName,
          tableNumber: data.guest.tableNumber ?? nextTableNumber,
        });
      }

      await onRefresh?.();
    } catch (error) {
      console.error("Live table update error:", error);

      onUpdated(previousGuest);

      alert("לא הצלחנו לעדכן שולחן לאורח");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="relative min-w-[150px]">
      <select
        value={currentValue}
        disabled={disabled || saving}
        onChange={(e) => handleChange(e.target.value)}
        className={`
          h-10
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
        `}
      >
        <option value="">ללא שולחן</option>

        {sortedTables.map((table) => {
          const tableId = getTableId(table);
          if (!tableId) return null;

          return (
            <option key={tableId} value={tableId}>
              {getTableLabel(table)}
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