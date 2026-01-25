"use client";

import { useMemo } from "react";
import { useSeatingStore } from "@/store/seatingStore";
import type { LiveGuest } from "./types";

/* =========================
   TYPES
========================= */
type SeatedGuest = {
  guestId: string;
};

type SeatingTable = {
  id: string;
  name?: string;
  seatedGuests?: SeatedGuest[];
};

export default function GuestListLive() {
  const guests = useSeatingStore((s) => s.guests) as LiveGuest[];
  const tables = useSeatingStore((s) => s.tables) as SeatingTable[];
  const updateGuestArrived = useSeatingStore(
    (s) => s.updateGuestArrived
  );

  /* =========================
     MAP guestId -> table
  ========================= */
  const guestToTableMap = useMemo(() => {
    const map = new Map<
      string,
      { tableId: string; tableName?: string }
    >();

    tables.forEach((table) => {
      table.seatedGuests?.forEach((sg) => {
        map.set(String(sg.guestId), {
          tableId: table.id,
          tableName: table.name,
        });
      });
    });

    return map;
  }, [tables]);

  return (
    <div className="w-80 border-r p-4 overflow-y-auto">
      <h3 className="font-bold mb-3">אורחים</h3>

      {guests.length === 0 ? (
        <div className="text-sm text-gray-500">
          אין עדיין אורחים בלייב. ייבאי מוזמנים + הושבה כדי להתחיל.
        </div>
      ) : (
        guests.map((g) => {
          const guestId =
            (g as any)._id ??
            (g as any).id ??
            (g as any).guestId;

          const name =
            (g as any).fullName ??
            (g as any).name ??
            "אורח";

          const approved =
            (g as any).approvedCount ??
            (g as any).approved ??
            1;

          const arrived = (g as any).arrived ?? 0;

          const tableInfo = guestToTableMap.get(
            String(guestId)
          );

          const canDecrease = arrived > 0;
          const canIncrease = arrived < approved;

          return (
            <div
              key={guestId}
              className={`p-3 mb-2 rounded-lg transition ${
                arrived === approved && approved > 0
                  ? "bg-green-200"
                  : arrived > 0
                  ? "bg-green-100"
                  : "bg-gray-100"
              }`}
            >
              <div className="font-medium mb-1">
                {name}
              </div>

              <div className="text-xs mb-2">
                {tableInfo ? (
                  <span className="text-green-700">
                    משויך לשולחן{" "}
                    {tableInfo.tableName ??
                      tableInfo.tableId}
                  </span>
                ) : (
                  <span className="text-gray-400">
                    לא שובץ לשולחן
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  disabled={!canDecrease}
                  onClick={() =>
                    updateGuestArrived(
                      guestId,
                      arrived - 1
                    )
                  }
                  className="w-7 h-7 rounded border text-sm disabled:opacity-40"
                >
                  −
                </button>

                <span className="w-6 text-center font-semibold">
                  {arrived}
                </span>

                <button
                  disabled={!canIncrease}
                  onClick={() =>
                    updateGuestArrived(
                      guestId,
                      arrived + 1
                    )
                  }
                  className="w-7 h-7 rounded border text-sm disabled:opacity-40"
                >
                  +
                </button>

                <span className="text-xs text-gray-500">
                  / {approved} אישרו
                </span>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
