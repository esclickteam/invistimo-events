"use client";

import { useMemo, useState } from "react";
import RoundTableMark from "./RoundTableMark";

const GUESTS = [
  { id: "n", name: "נועה כהן", party: 2, status: "מגיעה" },
  { id: "y", name: "יוסי לוי", party: 1, status: "מגיע" },
  { id: "m", name: "מיכל אברהם", party: 2, status: "ממתינה" },
  { id: "d", name: "דניאל שמש", party: 3, status: "מגיע" },
  { id: "s", name: "שירה גולן", party: 2, status: "מגיעה" },
  { id: "a", name: "איתי ברק", party: 4, status: "מגיע" },
] as const;

const TABLES = [
  { id: "t1", label: "1", seats: 10, filled: 4, x: 16, y: 32 },
  { id: "t2", label: "2", seats: 10, filled: 6, x: 50, y: 28 },
  { id: "t3", label: "3", seats: 8, filled: 2, x: 84, y: 32 },
  { id: "t4", label: "4", seats: 8, filled: 0, x: 32, y: 74 },
  { id: "t5", label: "5", seats: 8, filled: 0, x: 68, y: 74 },
] as const;

export default function EventHallDemo() {
  const [selected, setSelected] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [hint, setHint] = useState("שלב 1: בחרו אורח מהרשימה.");
  const [flash, setFlash] = useState<string | null>(null);
  const [pulse, setPulse] = useState(false);

  const seated = useMemo(() => {
    const base = TABLES.reduce((sum, table) => sum + table.filled, 0);
    const extra = Object.entries(assignments).reduce((sum, [guestId]) => {
      const guest = GUESTS.find((item) => item.id === guestId);
      return sum + (guest?.party ?? 0);
    }, 0);
    return base + extra;
  }, [assignments]);

  const capacity = TABLES.reduce((sum, table) => sum + table.seats, 0);

  const assign = (tableId: string) => {
    if (!selected) {
      setHint("בחרו קודם אורח מהרשימה.");
      return;
    }
    const guest = GUESTS.find((item) => item.id === selected);
    const table = TABLES.find((item) => item.id === tableId);
    if (!guest || !table) return;
    const used = Object.entries(assignments).reduce((sum, [guestId, assigned]) => {
      if (assigned !== tableId || guestId === guest.id) return sum;
      return sum + (GUESTS.find((item) => item.id === guestId)?.party ?? 0);
    }, 0);
    if (table.filled + used + guest.party > table.seats) {
      setHint(`שולחן ${table.label} מלא מדי לקבוצה הזו.`);
      setFlash(tableId);
      window.setTimeout(() => setFlash((current) => (current === tableId ? null : current)), 700);
      return;
    }
    setAssignments((prev) => ({ ...prev, [guest.id]: tableId }));
    setHint(`${guest.name} שובץ בשולחן ${table.label}. אפשר לבחור אורח נוסף.`);
    setFlash(tableId);
    setPulse(true);
    window.setTimeout(() => setFlash((current) => (current === tableId ? null : current)), 700);
    window.setTimeout(() => setPulse(false), 700);
  };

  const resetDemo = () => {
    setSelected(null);
    setAssignments({});
    setHint("שלב 1: בחרו אורח מהרשימה.");
    setFlash(null);
    setPulse(false);
  };

  return (
    <div className="border border-[#C5A582]/45 bg-[#FFF8F0] shadow-[0_24px_60px_rgba(66,24,47,0.12)]">
      <div className="flex items-center justify-between gap-3 border-b border-[#C5A582]/30 px-4 py-3">
        <div>
          <p className="text-[11px] font-bold tracking-[0.18em] text-[#842B4C]">אולם לדוגמה</p>
          <p className="text-sm font-extrabold text-[#42182F]">החתונה של מיה ואלון</p>
        </div>
        <div className="flex items-center gap-3">
          <p
            className={`text-left text-sm font-black tabular-nums text-[#42182F] ${pulse ? "hall-seat-flash" : ""}`}
            aria-live="polite"
          >
            {seated}/{capacity}
            <span className="mt-0.5 block text-[10px] font-bold text-[#6B5360]">משובצים מתוך המקומות</span>
          </p>
          <button
            type="button"
            onClick={resetDemo}
            className="border border-[#C5A582] bg-[#F5EEE8] px-3 py-2 text-xs font-black text-[#42182F] hover:bg-[#FFF8F0]"
          >
            איפוס
          </button>
        </div>
      </div>
      <p className="border-b border-[#C5A582]/25 px-4 py-2 text-xs font-bold text-[#42182F]">
        {selected ? "שלב 2: לחצו על שולחן כדי לשבץ את האורח." : "שלב 1: בחרו אורח מהרשימה, ואז שולחן."}
      </p>

      <div className="grid xl:grid-cols-[11.5rem_1fr]">
        <ul className="border-b border-[#C5A582]/25 xl:border-b-0 xl:border-l">
          {GUESTS.map((guest) => {
            const table = TABLES.find((item) => item.id === assignments[guest.id]);
            const on = selected === guest.id;
            return (
              <li key={guest.id} className="border-b border-[#C5A582]/15 last:border-b-0">
                <button
                  type="button"
                  onClick={() => {
                    setSelected(guest.id);
                    setHint(
                      table
                        ? `${guest.name} בשולחן ${table.label}. אפשר להעביר.`
                        : `${guest.name} סומן. בחרו שולחן.`
                    );
                  }}
                  aria-pressed={on}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-right text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C5A582] ${
                    on ? "bg-[#E8CFD8]" : "hover:bg-[#F5EEE8]"
                  }`}
                >
                  <span className="font-bold text-[#42182F]">{guest.name}</span>
                  <span className="shrink-0 text-[11px] font-semibold text-[#6B5360]">
                    {guest.party} · {table ? `שולחן ${table.label}` : guest.status}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="relative overflow-hidden bg-[#F5EEE8] xl:min-h-[540px]">
          <div
            className="pointer-events-none absolute inset-0"
            aria-hidden
            style={{
              background:
                "radial-gradient(ellipse at 50% 46%, rgba(197,165,130,0.35), transparent 42%), linear-gradient(180deg, #FFF8F0 0%, #E8D9C8 100%)",
            }}
          />
          <div
            className="pointer-events-none absolute left-1/2 top-[48%] hidden h-[46%] w-[62%] -translate-x-1/2 -translate-y-1/2 border border-[#C5A582]/50 xl:block"
            style={{ borderRadius: "50%" }}
            aria-hidden
          />
          <p className="pointer-events-none absolute left-1/2 top-[48%] hidden -translate-x-1/2 -translate-y-1/2 text-[10px] font-bold tracking-[0.2em] text-[#842B4C]/70 xl:block">
            רחבה
          </p>
          <div className="relative grid grid-cols-2 justify-items-center gap-x-2 gap-y-3 px-2 py-3 xl:hidden">
            {TABLES.map((table) => {
              const extra = Object.entries(assignments).reduce((sum, [guestId, assigned]) => {
                if (assigned !== table.id) return sum;
                return sum + (GUESTS.find((item) => item.id === guestId)?.party ?? 0);
              }, 0);
              return (
                <div key={table.id} className="w-[7.6rem] max-w-full sm:w-[9.4rem]">
                  <RoundTableMark
                    label={table.label}
                    seats={table.seats}
                    filled={Math.min(table.seats, table.filled + extra)}
                    tone="light"
                    flash={flash === table.id}
                    onClick={() => assign(table.id)}
                  />
                </div>
              );
            })}
          </div>
          <div className="absolute inset-0 hidden xl:block">
            {TABLES.map((table) => {
              const extra = Object.entries(assignments).reduce((sum, [guestId, assigned]) => {
                if (assigned !== table.id) return sum;
                return sum + (GUESTS.find((item) => item.id === guestId)?.party ?? 0);
              }, 0);
              return (
                <div
                  key={table.id}
                  className="absolute w-[7.75rem] -translate-x-1/2 -translate-y-1/2 min-[1440px]:w-[9.25rem]"
                  style={{ left: `${table.x}%`, top: `${table.y}%` }}
                >
                  <RoundTableMark
                    label={table.label}
                    seats={table.seats}
                    filled={Math.min(table.seats, table.filled + extra)}
                    tone="light"
                    flash={flash === table.id}
                    onClick={() => assign(table.id)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <p className="border-t border-[#C5A582]/30 px-4 py-3 text-sm font-bold text-[#42182F]" role="status">
        {hint}
      </p>
      <div className="grid border-t border-[#C5A582]/30 sm:grid-cols-2">
        <p className="px-4 py-3 text-xs leading-5 text-[#6B5360]">
          <span className="font-black text-[#42182F]">תכנון הושבה: </span>
          זו ההדגמה. בוחרים אורח ומשבצים אותו לשולחן מראש.
        </p>
        <p className="border-t border-[#C5A582]/25 px-4 py-3 text-xs leading-5 text-[#6B5360] sm:border-t-0 sm:border-r">
          <span className="font-black text-[#42182F]">ניהול LIVE: </span>
          ביום האירוע עוקבים אחרי מי שהגיע בפועל. זה שירות נפרד, לא חלק מההדגמה הזו.
        </p>
      </div>
    </div>
  );
}
