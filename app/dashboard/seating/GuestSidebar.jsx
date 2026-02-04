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
    console.log("🟠 [GuestSidebar] guards failed", {
      guests,
      tables,
    });
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
          "bg-white overflow-y-auto " +
          (variant === "desktop"
            ? "hidden md:block w-72 h-full border-l shadow-xl"
            : "") +
          (variant === "mobile" ? "block md:hidden w-full h-full" : "")
        }
      >
        {/* כותרת */}
        <h2 className="text-lg font-bold p-4 border-b text-gray-800">
          🧾 אורחים
        </h2>

        {/* רשימה */}
        <ul>
          {guests.map((guest) => {
            const guestId = String(guest.id ?? guest._id ?? "");
            const tableFromStore = guestTableMap.get(guestId) || null;

            const tableLabel =
  (tableFromStore && (tableFromStore.displayName || tableFromStore.name)) ||
  (tableFromStore
    ? `שולחן ${tableFromStore.number ?? tableFromStore.id}`
    : null);

            const isHighlighted =
              shouldHighlightFromUrl &&
              [guest.id, guest._id].map(String).includes(highlightedGuestId);

            return (
              <li
                key={guestId}
                className={
                  "p-3 border-b cursor-pointer transition " +
                  (isHighlighted
                    ? "bg-yellow-200 border-yellow-400 ring-2 ring-yellow-400 "
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
                    <span className="text-gray-400">
                      לא משובץ
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* פאנל ניהול אורח – כמו plandinga */}
      {selectedGuestId && (
        <GuestSeatingPanel
          guestId={selectedGuestId}
          onClose={() => setSelectedGuestId(null)}
        />
      )}
    </>
  );
}
