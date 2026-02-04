"use client";

import React, { useMemo, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSeatingStore } from "@/store/seatingStore";
import GuestSeatingPanel from "@/app/components/seating/GuestSeatingPanel";

export default function GuestSidebar({ variant = "desktop" }) {
  /* ===============================
     Zustand
  =============================== */
  const guests = useSeatingStore((s) => s.guests);
  const tables = useSeatingStore((s) => s.tables);

  /* ===============================
     UI state
  =============================== */
  const [selectedGuestId, setSelectedGuestId] = useState(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all"); // all | seated | unseated

  /* ===============================
     Highlight from URL
  =============================== */
  const searchParams = useSearchParams();
  const highlightedGuestIdRaw = searchParams.get("guestId");
  const from = searchParams.get("from");

  const highlightedGuestId = highlightedGuestIdRaw
    ? String(highlightedGuestIdRaw)
    : "";

  const shouldHighlightFromUrl =
    (from === "dashboard" || from === "personal") && !!highlightedGuestId;

  /* ===============================
     Guards
  =============================== */
  if (!Array.isArray(guests) || !Array.isArray(tables)) {
    return null;
  }

  /* ===============================
     ⭐ מיפוי אורח → שולחן
  =============================== */
  const guestTableMap = useMemo(() => {
    const map = new Map();

    tables.forEach((table) => {
      table.seatedGuests?.forEach((sg) => {
        if (sg?.guestId != null) {
          map.set(String(sg.guestId), table);
        }
      });
    });

    return map;
  }, [tables]);

  /* ===============================
     פילטר + חיפוש
  =============================== */
  const filteredGuests = useMemo(() => {
    return guests.filter((g) => {
      const id = String(g.id ?? g._id ?? "");
      const seated = guestTableMap.has(id);

      if (filter === "seated" && !seated) return false;
      if (filter === "unseated" && seated) return false;

      if (query) {
        return g.name?.toLowerCase().includes(query.toLowerCase());
      }

      return true;
    });
  }, [guests, guestTableMap, filter, query]);

  /* ===============================
     LOGS – דיאגנוסטיקה בלבד
  =============================== */
  useEffect(() => {
    const seated = guests.filter((g) =>
      guestTableMap.has(String(g.id ?? g._id))
    ).length;

    console.log("🟦 [GuestSidebar] stats", {
      guestsTotal: guests.length,
      seated,
    });
  }, [guests, guestTableMap]);

  return (
    <>
      <div
        className={
          "bg-white flex flex-col " +
          (variant === "desktop"
            ? "hidden md:flex w-72 h-full border-l shadow-xl"
            : "flex md:hidden w-full h-full")
        }
      >
        {/* ===== Header ===== */}
        <div className="sticky top-0 bg-white z-10 border-b">
          <h2 className="text-lg font-bold px-4 pt-4 pb-2 text-gray-800">
            🧾 אורחים ({filteredGuests.length})
          </h2>

          {/* חיפוש */}
          <div className="px-4 pb-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="חיפוש אורח..."
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring"
            />
          </div>

          {/* פילטרים */}
          <div className="flex gap-2 px-4 pb-3">
            {[
              { key: "all", label: "הכל" },
              { key: "seated", label: "משובצים" },
              { key: "unseated", label: "לא משובצים" },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={
                  "px-3 py-1 text-xs rounded-full border transition " +
                  (filter === f.key
                    ? "bg-black text-white border-black"
                    : "bg-white text-gray-600 hover:bg-gray-100")
                }
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* ===== List ===== */}
        <div className="flex-1 overflow-y-auto">
          <ul>
            {filteredGuests.map((guest) => {
              const guestId = String(guest.id ?? guest._id ?? "");
              const tableFromStore = guestTableMap.get(guestId) || null;

              const tableLabel =
                (tableFromStore && tableFromStore.name) ||
                (tableFromStore
                  ? `שולחן ${tableFromStore.number ?? tableFromStore.id}`
                  : null);

              const isHighlighted =
                shouldHighlightFromUrl &&
                [guest.id, guest._id].map(String).includes(highlightedGuestId);

              const isSelected = selectedGuestId === guestId;

              return (
                <li
                  key={guestId}
                  className={
                    "p-3 border-b cursor-pointer transition " +
                    (isSelected
                      ? "bg-blue-50 ring-2 ring-blue-400 "
                      : isHighlighted
                      ? "bg-yellow-200 ring-2 ring-yellow-400 "
                      : "hover:bg-gray-100")
                  }
                  onClick={() => setSelectedGuestId(guestId)}
                >
                  <div className="font-medium text-gray-800">
                    {guest.name}
                  </div>

                  <div className="text-xs text-gray-500 mt-1">
                    {guest.groupId ? "חלק מקבוצה" : "ללא קבוצה"}
                  </div>

                  <div className="mt-1 text-xs">
                    {tableLabel ? (
                      <span className="text-green-600">
                        משובץ · {tableLabel}
                      </span>
                    ) : (
                      <span className="text-gray-400">לא משובץ</span>
                    )}
                  </div>
                </li>
              );
            })}

            {filteredGuests.length === 0 && (
              <li className="p-6 text-center text-sm text-gray-400">
                לא נמצאו אורחים
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* ===== Guest Panel ===== */}
      {selectedGuestId && (
        <GuestSeatingPanel
          guestId={selectedGuestId}
          onClose={() => setSelectedGuestId(null)}
        />
      )}
    </>
  );
}
