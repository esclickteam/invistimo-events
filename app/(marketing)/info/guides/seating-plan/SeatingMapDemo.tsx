"use client";

import { useCallback, useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";

type Guest = {
  id: string;
  name: string;
  count: number;
  group: string;
};

type Table = {
  id: string;
  label: string;
  capacity: number;
};

const TABLES: Table[] = [
  { id: "t1", label: "שולחן 1", capacity: 10 },
  { id: "t2", label: "שולחן 2", capacity: 10 },
  { id: "t3", label: "שולחן 3", capacity: 12 },
  { id: "t4", label: "שולחן 4", capacity: 8 },
  { id: "t5", label: "שולחן 5", capacity: 10 },
];

const INITIAL_GUESTS: Guest[] = [
  { id: "g1", name: "משפחת כהן", count: 4, group: "משפחת הכלה" },
  { id: "g2", name: "משפחת לוי", count: 3, group: "משפחת הכלה" },
  { id: "g3", name: "דנה ויוסי", count: 2, group: "חברי החתן" },
  { id: "g4", name: "רונית לוי", count: 1, group: "משפחת הכלה" },
  { id: "g5", name: "משפחת ישראלי", count: 5, group: "משפחת החתן" },
  { id: "g6", name: "חברי הצבא א׳", count: 4, group: "חברים" },
  { id: "g7", name: "חברי הצבא ב׳", count: 3, group: "חברים" },
  { id: "g8", name: "צוות העבודה", count: 4, group: "עבודה" },
  { id: "g9", name: "משפחת אברהם", count: 3, group: "משפחת החתן" },
  { id: "g10", name: "נועה ועידן", count: 2, group: "חברים משותפים" },
];

type Assignments = Record<string, string | null>;

function emptyAssignments(): Assignments {
  return Object.fromEntries(INITIAL_GUESTS.map((g) => [g.id, null]));
}

export default function SeatingMapDemo() {
  const [assignments, setAssignments] = useState<Assignments>(emptyAssignments);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const seatedByTable = useMemo(() => {
    const map: Record<string, Guest[]> = Object.fromEntries(TABLES.map((t) => [t.id, []]));
    for (const guest of INITIAL_GUESTS) {
      const tableId = assignments[guest.id];
      if (tableId && map[tableId]) map[tableId].push(guest);
    }
    return map;
  }, [assignments]);

  const tableUsed = useCallback(
    (tableId: string) => seatedByTable[tableId]?.reduce((sum, g) => sum + g.count, 0) ?? 0,
    [seatedByTable]
  );

  const unassigned = useMemo(
    () => INITIAL_GUESTS.filter((g) => !assignments[g.id]),
    [assignments]
  );

  const totalSeats = TABLES.reduce((sum, t) => sum + t.capacity, 0);
  const totalPeople = INITIAL_GUESTS.reduce((sum, g) => sum + g.count, 0);
  const seatedPeople = INITIAL_GUESTS.reduce(
    (sum, g) => sum + (assignments[g.id] ? g.count : 0),
    0
  );
  const freeSeats = totalSeats - seatedPeople;

  const flash = (text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage(null), 2800);
  };

  const assignToTable = useCallback(
    (guestId: string, tableId: string) => {
      const guest = INITIAL_GUESTS.find((g) => g.id === guestId);
      const table = TABLES.find((t) => t.id === tableId);
      if (!guest || !table) return;

      const othersOnTable = INITIAL_GUESTS.filter(
        (g) => g.id !== guestId && assignments[g.id] === tableId
      );
      const usedByOthers = othersOnTable.reduce((sum, g) => sum + g.count, 0);
      if (usedByOthers + guest.count > table.capacity) {
        flash(
          `אין מקום ב${table.label}: נותרו ${table.capacity - usedByOthers} מקומות, והרשומה כוללת ${guest.count}.`
        );
        return;
      }

      setAssignments((prev) => ({ ...prev, [guestId]: tableId }));
      setSelectedId(null);
      flash(`${guest.name} שובצו ל${table.label} (${usedByOthers + guest.count}/${table.capacity}).`);
    },
    [assignments]
  );

  const unassign = (guestId: string) => {
    const guest = INITIAL_GUESTS.find((g) => g.id === guestId);
    setAssignments((prev) => ({ ...prev, [guestId]: null }));
    setSelectedId(null);
    if (guest) flash(`${guest.name} הוחזרו לרשימת מי שטרם שובץ.`);
  };

  const onTableActivate = (tableId: string) => {
    if (selectedId) {
      assignToTable(selectedId, tableId);
      return;
    }
    flash("בחרו אורח מהרשימה או מהשולחן, ואז לחצו על שולחן יעד.");
  };

  const reset = () => {
    setAssignments(emptyAssignments());
    setSelectedId(null);
    flash("ההדגמה אופסה — אפשר להתחיל שיבוץ מחדש.");
  };

  return (
    <div
      id="seating-demo"
      className="rounded-[28px] border border-[#E6D2AA] bg-[#FFFDF8] p-4 shadow-[0_14px_36px_rgba(58,39,20,0.06)] md:p-6"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-xl font-black text-[#2C241C] md:text-2xl">הדגמת שיבוץ מקומית</h3>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[#7A6042]">
            נתוני דמו בלבד — בלי חשבון ובלי שמירה בשרת. בחרו אורח ולחצו על שולחן, או גררו במחשב.
            המערכת חוסמת חריגה מקיבולת.
          </p>
        </div>
        <button
          type="button"
          onClick={reset}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-[#DCC7A6] bg-white px-4 py-2 text-xs font-bold text-[#5E4735] print:hidden"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden />
          איפוס ההדגמה
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Stat label="אנשים בדמו" value={`${totalPeople}`} />
        <Stat label="משובצים" value={`${seatedPeople}`} />
        <Stat label="מקומות פנויים במפה" value={`${freeSeats} / ${totalSeats}`} />
      </div>

      <p
        role="status"
        aria-live="polite"
        className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-semibold ${
          message
            ? "border-[#E6D2AA] bg-[#FFF8EA] text-[#5E4735]"
            : "border-transparent bg-transparent text-transparent"
        }`}
      >
        {message || "\u00a0"}
      </p>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div>
          <p className="text-xs font-black tracking-[0.12em] text-[#8A642E]">טרם שובצו</p>
          <ul className="mt-3 space-y-2">
            {unassigned.length === 0 ? (
              <li className="rounded-2xl border border-[#B7D4BC] bg-[#F3FAF4] px-4 py-3 text-sm font-semibold text-[#2F5A38]">
                כל הרשומות שובצו. אפשר להעביר בין שולחנות או לאפס.
              </li>
            ) : (
              unassigned.map((guest) => (
                <GuestChip
                  key={guest.id}
                  guest={guest}
                  selected={selectedId === guest.id}
                  onSelect={() => setSelectedId(guest.id === selectedId ? null : guest.id)}
                  onDragStart={() => setDraggingId(guest.id)}
                  onDragEnd={() => setDraggingId(null)}
                />
              ))
            )}
          </ul>
          {selectedId ? (
            <p className="mt-3 text-sm font-semibold text-[#8A642E]">
              נבחר: {INITIAL_GUESTS.find((g) => g.id === selectedId)?.name} — לחצו על שולחן לשיבוץ
            </p>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {TABLES.map((table) => {
            const used = tableUsed(table.id);
            const guests = seatedByTable[table.id] ?? [];
            const full = used >= table.capacity;
            const overHint = draggingId
              ? (() => {
                  const g = INITIAL_GUESTS.find((x) => x.id === draggingId);
                  return g ? used + g.count > table.capacity : false;
                })()
              : false;

            return (
              <div
                key={table.id}
                onDragOver={(e) => {
                  e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = draggingId || e.dataTransfer.getData("text/guest-id");
                  if (id) assignToTable(id, table.id);
                  setDraggingId(null);
                }}
                className={`rounded-[22px] border bg-white p-4 text-right transition ${
                  overHint
                    ? "border-[#D9A0A0] bg-[#FFF8F8]"
                    : full
                      ? "border-[#C7A56B] shadow-[0_10px_24px_rgba(58,39,20,0.06)]"
                      : "border-[#EADDC8] hover:border-[#C7A56B]"
                }`}
                aria-label={`${table.label}, ${used} מתוך ${table.capacity} מקומות`}
              >
                <button
                  type="button"
                  onClick={() => onTableActivate(table.id)}
                  className="flex w-full items-start justify-between gap-2 rounded-xl text-right"
                  aria-label={`שבצו לשולחן ${table.label.replace("שולחן ", "")}, ${used} מתוך ${table.capacity}`}
                >
                  <div>
                    <p className="text-base font-black text-[#2C241C]">{table.label}</p>
                    <p className="mt-0.5 text-xs font-bold text-[#8A642E]">
                      {used}/{table.capacity} מקומות
                      {full ? " · מלא" : ""}
                    </p>
                  </div>
                  <div
                    className="h-2 w-16 overflow-hidden rounded-full bg-[#EADDC8]"
                    aria-hidden
                  >
                    <div
                      className="h-full rounded-full bg-[#C7A56B]"
                      style={{ width: `${Math.min(100, (used / table.capacity) * 100)}%` }}
                    />
                  </div>
                </button>
                <ul className="mt-3 space-y-1.5">
                  {guests.length === 0 ? (
                    <li className="text-xs font-semibold text-[#A0896C]">ריק — אפשר לשבץ לכאן</li>
                  ) : (
                    guests.map((guest) => (
                      <li
                        key={guest.id}
                        className="flex items-center justify-between gap-2 rounded-xl border border-[#F0E4D2] bg-[#FBF6EE] px-2.5 py-1.5"
                      >
                        <button
                          type="button"
                          className={`min-w-0 flex-1 text-right text-xs font-bold ${
                            selectedId === guest.id ? "text-[#8A642E]" : "text-[#3F3025]"
                          }`}
                          onClick={() => setSelectedId(guest.id === selectedId ? null : guest.id)}
                        >
                          {guest.name} · {guest.count}
                        </button>
                        <button
                          type="button"
                          className="shrink-0 text-[11px] font-bold text-[#7A5530] underline print:hidden"
                          onClick={() => unassign(guest.id)}
                        >
                          הסרה
                        </button>
                      </li>
                    ))
                  )}
                </ul>
                <label className="mt-3 block print:hidden">
                  <span className="sr-only">שיבוץ מהיר ל{table.label}</span>
                  <select
                    className="w-full rounded-xl border border-[#EADDC8] bg-[#FFFDF8] px-2 py-2 text-xs font-bold text-[#5E4735]"
                    aria-label={`שיבוץ מהיר ל${table.label}`}
                    value=""
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value) assignToTable(value, table.id);
                    }}
                  >
                    <option value="" disabled>
                      שיבוץ מתפריט…
                    </option>
                    {INITIAL_GUESTS.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.count})
                        {assignments[g.id] ? " — כבר משובץ" : ""}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#EADDC8] bg-white px-4 py-3">
      <p className="text-[11px] font-black tracking-[0.08em] text-[#8A642E]">{label}</p>
      <p className="mt-1 text-lg font-black text-[#2C241C]" dir="ltr">
        {value}
      </p>
    </div>
  );
}

function GuestChip({
  guest,
  selected,
  onSelect,
  onDragStart,
  onDragEnd,
}: {
  guest: Guest;
  selected: boolean;
  onSelect: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("text/guest-id", guest.id);
          e.dataTransfer.effectAllowed = "move";
          onDragStart();
        }}
        onDragEnd={onDragEnd}
        onClick={onSelect}
        className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-3.5 py-3 text-right transition ${
          selected
            ? "border-[#C7A56B] bg-[#FFF8EA] shadow-[0_8px_20px_rgba(58,39,20,0.08)]"
            : "border-[#EADDC8] bg-white hover:border-[#C7A56B]"
        }`}
      >
        <span>
          <span className="block text-sm font-black text-[#2C241C]">{guest.name}</span>
          <span className="mt-0.5 block text-xs font-semibold text-[#7A6042]">{guest.group}</span>
        </span>
        <span className="rounded-full bg-[#F7EDDF] px-2.5 py-1 text-xs font-black text-[#8A642E]">
          {guest.count}
        </span>
      </button>
    </li>
  );
}
