"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

/* ===============================
   TYPES
=============================== */
type Guest = {
  id?: string;
  _id?: string;
  name: string;
  arrivedCount?: number;
};

type SeatedGuest = {
  guestId: string;
};

type Table = {
  id: string;
  name?: string;          // legacy – לא בשימוש
  number?: number | null; // ✅ מקור האמת
  seats?: number;
  seatedGuests: SeatedGuest[];
};


export default function SeatingPrintPage() {
  const params = useSearchParams();
  const eventId = params.get("eventId");

  const [tables, setTables] = useState<Table[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);

  /* ===============================
     LOAD DATA
  =============================== */
  useEffect(() => {
    if (!eventId) return;

    async function load() {
    const [tRes, gRes] = await Promise.all([
  fetch(`/api/seating/tables/${eventId}`, {
    credentials: "include",
  }),
  fetch(`/api/seating/guests/${eventId}`, {
    credentials: "include",
  }),
]);



      const tData = await tRes.json();
      const gData = await gRes.json();

      setTables(tData.tables || []);
      setGuests(gData.guests || []);
      setLoading(false);

      setTimeout(() => window.print(), 400);
    }

    load();
  }, [eventId]);

  /* ===============================
     MAP guestId → guest
  =============================== */
  const guestMap = useMemo(() => {
    const map = new Map<string, Guest>();
    guests.forEach((g) =>
      map.set(String(g.id ?? g._id), g)
    );
    return map;
  }, [guests]);

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center text-gray-500">
        טוען סידור הושבה…
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-white px-8 py-6 text-right">
      <h1 className="text-2xl font-bold text-center mb-8">
        סידור הושבה
      </h1>

      <div className="grid grid-cols-3 print:grid-cols-2 gap-6">

        {tables.map((table) => {
          const rows = table.seatedGuests
            .map((sg) => {
              const guest = guestMap.get(String(sg.guestId));
              if (!guest) return null;

              return {
  name: guest.name,
  arrived: 1, // ✅ כל כיסא נספר פעם אחת
};
            })
            .filter(Boolean) as { name: string; arrived: number }[];

          const arrivedTotal = rows.length;


          const capacity = table.seats ?? arrivedTotal;

          const titleColor =
            arrivedTotal === 0
              ? "text-green-600"
              : arrivedTotal < capacity
              ? "text-red-600"
              : "text-black";

          return (
            <div
              key={table.id}
              className="border border-black p-3 break-inside-avoid"
            >
              {/* כותרת שולחן */}
              <div
                className={`text-center font-bold mb-2 ${titleColor}`}
              >
                שולחן {table.number} ({arrivedTotal}/{capacity})

              </div>

              {/* טבלה */}
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="border border-black px-2 py-1">
                      שם
                    </th>
                    <th className="border border-black px-2 py-1 w-16">
                      הגיעו
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i}>
                      <td className="border border-black px-2 py-1">
                        {r.name}
                      </td>
                      <td className="border border-black px-2 py-1 text-center">
                        {r.arrived}
                      </td>
                    </tr>
                  ))}
                </tbody>

                <tfoot>
                  <tr className="font-bold">
                    <td className="border border-black px-2 py-1">
                      סה״כ
                    </td>
                    <td className="border border-black px-2 py-1 text-center">
                      {arrivedTotal}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          );
        })}
      </div>
    </div>
  );
}
