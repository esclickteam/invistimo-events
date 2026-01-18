"use client";

import { useLiveSeating } from "./LiveSeatingProvider";
import type { LiveGuest, LiveTable } from "./types";

export default function SeatingMapLive() {
  const { state } = useLiveSeating();

  const tables = state?.tables ?? [];
  const guests = state?.guests ?? [];

  return (
    <div className="flex-1 p-4">
      <h3 className="font-bold mb-2">מפת הושבה</h3>

      {tables.length === 0 ? (
        <div className="text-sm text-gray-500">
          אין עדיין מפת הושבה. יש לייבא הושבה מהלקוח.
        </div>
      ) : (
        tables.map((t: LiveTable) => {
          // ✅ תמיכה גם ב-id ישן וגם ב-_id החדש
          const tableId = (t as any)._id ?? (t as any).id;

          const tableName =
            (t as any).label ?? (t as any).name ?? "שולחן";

          const capacity = (t as any).capacity ?? 0;

          const tableGuests = guests.filter(
            (g: LiveGuest) =>
              ((g as any).tableId ?? null) === tableId
          );

          const arrived = tableGuests.reduce(
            (sum, g: LiveGuest) => sum + ((g as any).arrived ?? 0),
            0
          );

          const approved = tableGuests.reduce(
            (sum, g: LiveGuest) =>
              sum +
              ((g as any).approvedCount ??
                (g as any).approved ??
                0),
            0
          );

          return (
            <div
              key={tableId}
              className={`p-4 mb-4 rounded transition ${
                arrived > 0 ? "bg-green-200" : "bg-gray-200"
              }`}
            >
              <div className="font-medium">
                {tableName}
              </div>
              <div className="text-sm text-gray-700 mt-1">
                הגיעו: {arrived} / {approved || capacity}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
