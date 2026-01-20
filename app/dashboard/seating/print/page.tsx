"use client";

import "./print.css";
import { useEffect, useState, useMemo } from "react";
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
  seatIndex: number;
  arrived?: boolean;
};

type Table = {
  id: string;
  name: string;
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
      try {
        const [tablesRes, guestsRes] = await Promise.all([
          fetch(`/api/seating/tables/${eventId}`),
          fetch(`/api/seating/guests/${eventId}`),
        ]);

        const tablesData = await tablesRes.json();
        const guestsData = await guestsRes.json();

        setTables(tablesData.tables || []);
        setGuests(guestsData.guests || []);
        setLoading(false);

        setTimeout(() => window.print(), 500);
      } catch (err) {
        console.error("❌ Print load error:", err);
      }
    }

    load();
  }, [eventId]);

  /* ===============================
     GUEST MAP (id → guest)
  =============================== */
  const guestMap = useMemo(() => {
    const map = new Map<string, Guest>();
    guests.forEach((g) => {
      const id = String(g.id ?? g._id);
      map.set(id, g);
    });
    return map;
  }, [guests]);

  if (loading) {
    return <div className="print-root">טוען סידור הושבה…</div>;
  }

  return (
    <div className="print-root">
      <h1 className="title">סידור הושבה</h1>

      <div className="grid">
        {tables.map((table) => {
          const rows = table.seatedGuests.map((sg) => {
            const guest = guestMap.get(String(sg.guestId));
            return {
              name: guest?.name || "אורח לא מזוהה",
              arrived: sg.arrived ? 1 : 1,
            };
          });

          return (
            <div key={table.id} className="table-box">
              <h3>{table.name}</h3>

              <table className="print-table">
                <thead>
                  <tr>
                    <th>שם</th>
                    <th>הגיעו</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i}>
                      <td>{r.name}</td>
                      <td>{r.arrived}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td>סה״כ</td>
                    <td>
                      {rows.reduce((sum, r) => sum + r.arrived, 0)}
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
