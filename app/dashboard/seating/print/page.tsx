"use client";

import "./print.css";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type Guest = {
  guestId: string;
  name: string;
};

type Table = {
  id: string;
  name: string;
  seatedGuests: Guest[];
};

export default function SeatingPrintPage() {
  const params = useSearchParams();
  const eventId = params.get("eventId");

  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId) return;

    async function load() {
      const res = await fetch(`/api/seating/tables/${eventId}`);
      const data = await res.json();

      setTables(data.tables || []);
      setLoading(false);

      setTimeout(() => window.print(), 500);
    }

    load();
  }, [eventId]);

  if (loading) {
    return <div className="print-root">טוען הושבה…</div>;
  }

  return (
    <div className="print-root">
      <h1 className="title">סידור הושבה</h1>

      <div className="grid">
        {tables.map((table) => (
          <div key={table.id} className="table-box">
            <h3>{table.name}</h3>

            <ul>
              {table.seatedGuests.map((sg, i) => (
                <li key={i}>{sg.guestId}</li>
              ))}
            </ul>

            <div className="count">
              סה״כ: {table.seatedGuests.length}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
