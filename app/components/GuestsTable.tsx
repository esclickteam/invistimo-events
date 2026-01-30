"use client";

import { useMemo, useState } from "react";
import GuestsMobileList from "@/app/dashboard/components/GuestsMobileList";
import { RSVP_LABELS } from "@/lib/rsvp";

/* ============================================================
   Types
============================================================ */
export type Guest = {
  _id: string;
  name: string;
  phone: string;
  token: string;

  relation?: string;
  tableName?: string;
  tableNumber?: number;

  rsvp: "yes" | "no" | "pending";
  guestsCount: number;
  arrivedCount?: number;
  notes?: string;
};

type QuickFilter = "all" | "yes" | "no" | "pending" | "noTable";
type SortKey = "name" | "rsvp" | "table" | "coming" | "invited";
type SortDir = "asc" | "desc";

type Props = {
  guests: Guest[];

  isDemo?: boolean;
  readonly?: boolean;

  onEdit: (g: Guest) => void;
  onDelete: (g: Guest) => void;
  onMessage: (g: Guest) => void;
  onSeat: (g: Guest) => void;
};

/* ============================================================
   Helpers
============================================================ */
function formatPhone(phone?: string) {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) return digits;
  if (digits.length === 9 && digits.startsWith("5")) return "0" + digits;
  return digits;
}

/* ============================================================
   Component
============================================================ */
export default function GuestsTable({
  guests,
  isDemo,
  readonly,
  onEdit,
  onDelete,
  onMessage,
  onSeat,
}: Props) {
  const [search, setSearch] = useState("");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  /* =========================
     Filter + Sort
  ========================= */
  const displayGuests = useMemo(() => {
    let list = [...guests];

    if (quickFilter === "yes") list = list.filter((g) => g.rsvp === "yes");
    if (quickFilter === "no") list = list.filter((g) => g.rsvp === "no");
    if (quickFilter === "pending") list = list.filter((g) => g.rsvp === "pending");
    if (quickFilter === "noTable")
      list = list.filter((g) => !(g.tableName && g.tableName.trim()));

    const q = search.trim().toLowerCase();
    if (q) {
      const qDigits = q.replace(/\D/g, "");
      list = list.filter((g) => {
        const name = g.name?.toLowerCase() || "";
        const phone = g.phone?.replace(/\D/g, "") || "";
        return name.includes(q) || (qDigits && phone.includes(qDigits));
      });
    }

    const rsvpOrder = { yes: 0, pending: 1, no: 2 } as const;

    const getValue = (g: Guest) => {
      if (sortKey === "name") return g.name?.toLowerCase() || "";
      if (sortKey === "table") return g.tableName || "";
      if (sortKey === "rsvp") return rsvpOrder[g.rsvp];
      if (sortKey === "invited") return g.guestsCount || 0;
      return g.arrivedCount || 0;
    };

    list.sort((a, b) => {
      const va: any = getValue(a);
      const vb: any = getValue(b);

      if (typeof va === "number" && typeof vb === "number") {
        return sortDir === "asc" ? va - vb : vb - va;
      }

      return sortDir === "asc"
        ? String(va).localeCompare(String(vb), "he")
        : String(vb).localeCompare(String(va), "he");
    });

    return list;
  }, [guests, quickFilter, search, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("asc");
    } else {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    }
  };

  const sortArrow = (key: SortKey) =>
    sortKey === key ? (sortDir === "asc" ? " ▲" : " ▼") : "";

  /* ============================================================
     Render
  ============================================================ */
  return (
    <>
      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="חיפוש לפי שם או טלפון…"
          className="w-full md:max-w-[420px] border rounded-full px-5 py-3"
        />

        <div className="flex flex-wrap gap-2">
          {[
            ["all", "הכל"],
            ["yes", "מגיעים"],
            ["pending", "ממתינים"],
            ["no", "לא מגיעים"],
            ["noTable", "בלי שולחן"],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setQuickFilter(key as QuickFilter)}
              className={`px-4 py-2 rounded-full border text-sm ${
                quickFilter === key
                  ? "bg-[#c9b48f] text-white border-[#c9b48f]"
                  : "bg-white border-gray-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-[900px] w-full border rounded-xl bg-white">
          <thead className="bg-gray-100">
            <tr>
              <th onClick={() => toggleSort("name")} className="p-3 cursor-pointer">שם{sortArrow("name")}</th>
              <th className="p-3">טלפון</th>
              <th className="p-3">קרבה</th>
              <th onClick={() => toggleSort("rsvp")} className="p-3 cursor-pointer">סטטוס{sortArrow("rsvp")}</th>
              <th onClick={() => toggleSort("invited")} className="p-3 cursor-pointer">מוזמנים{sortArrow("invited")}</th>
              <th onClick={() => toggleSort("coming")} className="p-3 cursor-pointer">מגיעים{sortArrow("coming")}</th>
              <th onClick={() => toggleSort("table")} className="p-3 cursor-pointer">שולחן{sortArrow("table")}</th>
              <th className="p-3">הערות</th>
              <th className="p-3">פעולות</th>
            </tr>
          </thead>

          <tbody>
            {displayGuests.map((g) => (
              <tr key={g._id} className="border-b">
                <td className="p-3">{g.name}</td>
                <td className="p-3">{formatPhone(g.phone)}</td>
                <td className="p-3">{g.relation || "-"}</td>
                <td className="p-3">{RSVP_LABELS[g.rsvp]}</td>
                <td className="p-3">{g.guestsCount}</td>
                <td className="p-3 font-semibold">{g.arrivedCount || 0}</td>
                <td className="p-3">{g.tableName || "-"}</td>
                <td className="p-3">{g.notes || "-"}</td>
                <td className="p-3 flex gap-3">
                  <button onClick={() => onMessage(g)}>💬</button>
                  <button onClick={() => onSeat(g)}>🪑</button>
                  {!readonly && (
                    <>
                      <button onClick={() => onEdit(g)}>✏️</button>
                      <button onClick={() => onDelete(g)} className="text-red-600">🗑️</button>
                    </>
                  )}
                </td>
              </tr>
            ))}

            {displayGuests.length === 0 && (
              <tr>
                <td colSpan={9} className="p-8 text-center text-gray-500">
                  לא נמצאו תוצאות
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="md:hidden">
        <GuestsMobileList
          guests={displayGuests}
          onEdit={onEdit}
          onDelete={onDelete}
          onMessage={onMessage}
          onSeat={onSeat}
        />
      </div>
    </>
  );
}
