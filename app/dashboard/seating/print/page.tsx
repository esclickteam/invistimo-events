"use client";

import "./print.css"; // ✅ ייבוא CSS מקומי

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useSeatingStore } from "@/store/seatingStore";

/* ============================================================
   Types (Print only)
============================================================ */
type PrintGuest = {
  id: string;
  name: string;
};

type PrintTable = {
  id: string;
  label: string;
  guests: PrintGuest[];
};

/* ============================================================
   Component
============================================================ */
export default function SeatingPrintPage() {
  const params = useSearchParams();
  const invitationId = params.get("invitationId");

  const tables = useSeatingStore(
    (s) => s.tables as PrintTable[]
  );

  useEffect(() => {
    // נותן לדפדפן לטעון ואז פותח Print
    const t = setTimeout(() => window.print(), 500);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="print-root">
      <h1 className="title">סידור הושבה – קרן וניקיטה</h1>

      <div className="grid">
        {tables.map((table) => (
          <div key={table.id} className="table-box">
            <h3>שולחן {table.label}</h3>

            <ul>
              {table.guests.map((g) => (
                <li key={g.id}>{g.name}</li>
              ))}
            </ul>

            <div className="count">
              סה״כ: {table.guests.length}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
