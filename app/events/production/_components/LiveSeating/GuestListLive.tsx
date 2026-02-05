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
  name?: string;          // legacy – לא נוגעים
  number?: number | null; // ✅ מקור האמת
  seatedGuests?: SeatedGuest[];
};


export default function GuestListLive() {
  const guests = useSeatingStore((s) => s.guests) as LiveGuest[];
  const tables = useSeatingStore((s) => s.tables) as SeatingTable[];
  const updateGuestArrived = useSeatingStore(
    (s) => s.updateGuestArrived
  );

  /* =====================================================
     🔑 MAP: guestId -> table (מקור אמת)
  ===================================================== */
  const guestToTableMap = useMemo(() => {
    const map = new Map<
      string,
      { tableId: string; tableName?: string }
    >();

    tables.forEach((table: SeatingTable) => {
      table.seatedGuests?.forEach((sg: SeatedGuest) => {
        map.set(String(sg.guestId), {
          tableId: table.id,
          tableName:
  typeof table.number === "number"
    ? `שולחן ${table.number}`
    : "",

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
          /* ===============================
             🔑 מזהה אורח אחיד
          =============================== */
          const guestId =
            (g as any)._id ??
            (g as any).id ??
            (g as any).guestId;

          /* ===============================
             🧾 שם
          =============================== */
          const name =
            (g as any).fullName ??
            (g as any).name ??
            "אורח";

          /* ===============================
             👥 מאושרים / הגיעו
          =============================== */
          const approved =
            (g as any).approvedCount ??
            (g as any).approved ??
            1;

          const arrived = (g as any).arrived ?? 0;

          /* ===============================
             🪑 שיבוץ לשולחן
          =============================== */
          const tableInfo = guestToTableMap.get(
            String(guestId)
          );
          const isSeated = !!tableInfo;

          return (
            <div
              key={guestId}
              className={`p-3 mb-2 rounded-lg transition ${
                arrived > 0
                  ? "bg-green-100"
                  : "bg-gray-100"
              }`}
            >
              {/* שם */}
              <div className="font-medium mb-1">
                {name}
              </div>

              {/* שיבוץ */}
              <div className="text-xs mb-2">
                {isSeated ? (
                  <span className="text-green-700">
                    משויך לשולחן{" "}
                    {tableInfo?.tableName ??
                      tableInfo?.tableId}
                  </span>
                ) : (
                  <span className="text-gray-400">
                    לא שובץ לשולחן
                  </span>
                )}
              </div>

              {/* הגיעו */}
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={approved}
                  value={arrived}
                  onChange={(e) =>
                    updateGuestArrived(
                      guestId,
                      Number(e.target.value)
                    )
                  }
                  className="w-20 rounded border px-2 py-1 text-sm"
                />
                <span className="text-sm text-gray-600">
                  / {approved}
                </span>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
