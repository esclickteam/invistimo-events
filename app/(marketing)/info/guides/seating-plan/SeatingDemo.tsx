"use client";

import { useCallback, useMemo, useState } from "react";

type Guest = {
  id: string;
  name: string;
  count: number;
  group: string;
};

type Table = {
  id: string;
  name: string;
  capacity: number;
};

const INITIAL_TABLES: Table[] = [
  { id: "t1", name: "שולחן 1", capacity: 10 },
  { id: "t2", name: "שולחן 2", capacity: 10 },
  { id: "t3", name: "שולחן 3", capacity: 12 },
  { id: "t4", name: "שולחן 4", capacity: 8 },
  { id: "t5", name: "שולחן 5", capacity: 10 },
];

const INITIAL_GUESTS: Guest[] = [
  { id: "g1", name: "משפחת כהן", count: 4, group: "משפחת הכלה" },
  { id: "g2", name: "דנה ויוסי", count: 2, group: "חברי החתן" },
  { id: "g3", name: "רונית לוי", count: 1, group: "משפחת הכלה" },
  { id: "g4", name: "משפחת ישראלי", count: 5, group: "משפחת החתן" },
  { id: "g5", name: "חברי צבא א׳", count: 4, group: "חברים" },
  { id: "g6", name: "חברי צבא ב׳", count: 3, group: "חברים" },
  { id: "g7", name: "צוות עבודה", count: 4, group: "עבודה" },
  { id: "g8", name: "משפחת אברהם", count: 3, group: "משפחת החתן" },
  { id: "g9", name: "נועה ואיתי", count: 2, group: "חברים" },
  { id: "g10", name: "סבתא רחל", count: 1, group: "משפחת הכלה" },
];

/** Local-only seating sandbox for the public guide — not event data. */
export default function SeatingDemo() {
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [dragOverTable, setDragOverTable] = useState<string | null>(null);

  const seatedCount = useMemo(() => {
    return INITIAL_GUESTS.reduce(
      (sum, g) => sum + (assignments[g.id] ? g.count : 0),
      0
    );
  }, [assignments]);

  const totalPeople = useMemo(
    () => INITIAL_GUESTS.reduce((sum, g) => sum + g.count, 0),
    []
  );

  const totalCapacity = useMemo(
    () => INITIAL_TABLES.reduce((sum, t) => sum + t.capacity, 0),
    []
  );

  const usedAtTable = useCallback(
    (tableId: string) =>
      INITIAL_GUESTS.reduce(
        (sum, g) => sum + (assignments[g.id] === tableId ? g.count : 0),
        0
      ),
    [assignments]
  );

  const unassigned = useMemo(
    () => INITIAL_GUESTS.filter((g) => !assignments[g.id]),
    [assignments]
  );

  const flash = (text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage(null), 2800);
  };

  const tryAssign = useCallback(
    (guestId: string, tableId: string) => {
      const guest = INITIAL_GUESTS.find((g) => g.id === guestId);
      if (!guest) return;
      const table = INITIAL_TABLES.find((t) => t.id === tableId);
      if (!table) return;

      const othersUsed = INITIAL_GUESTS.reduce((sum, g) => {
        if (g.id === guestId) return sum;
        return sum + (assignments[g.id] === tableId ? g.count : 0);
      }, 0);

      if (othersUsed + guest.count > table.capacity) {
        flash(
          `אין מקום ב${table.name}: נשארו ${table.capacity - othersUsed} מקומות, והרשומה כוללת ${guest.count}.`
        );
        return;
      }

      setAssignments((prev) => ({ ...prev, [guestId]: tableId }));
      setSelectedGuestId(null);
      flash(`${guest.name} שובצו ל${table.name}`);
    },
    [assignments]
  );

  const unassign = (guestId: string) => {
    setAssignments((prev) => {
      const next = { ...prev };
      delete next[guestId];
      return next;
    });
  };

  const reset = () => {
    setAssignments({});
    setSelectedGuestId(null);
    flash("ההדגמה אופסה");
  };

  return (
    <div
      id="seating-demo"
      className="scroll-mt-24 rounded-[32px] border border-[#E6D2AA] bg-[#FFFDF8] p-5 shadow-[0_22px_50px_rgba(95,68,34,0.08)] md:p-8"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl">
          <p className="text-xs font-black tracking-[0.12em] text-[#8A642E]">
            הדגמה מקומית
          </p>
          <h3 className="mt-2 text-2xl font-black text-[#2C241C] md:text-3xl">
            בונים מפת הושבה לדוגמה
          </h3>
          <p className="mt-2 text-sm leading-7 text-[#5C4A3A] md:text-base">
            בחרו אורח ולחצו על שולחן, או גררו בדסקטופ. ההדגמה לא שומרת נתונים בשרת
            ואינה קשורה לאירוע אמיתי.
          </p>
        </div>
        <button
          type="button"
          onClick={reset}
          className="rounded-full border border-[#DCC7A6] bg-white px-5 py-2.5 text-sm font-bold text-[#5E4735] print:hidden"
        >
          איפוס ההדגמה
        </button>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "משובצים", value: seatedCount },
          { label: "סה״כ בהדגמה", value: totalPeople },
          { label: "קיבולת שולחנות", value: totalCapacity },
          { label: "פנויים בקיבולת", value: totalCapacity - seatedCount },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-[#EADDC8] bg-white px-3 py-3 text-center"
          >
            <dt className="text-[11px] font-bold text-[#8A642E]">{item.label}</dt>
            <dd className="mt-1 text-xl font-black tabular-nums text-[#2C241C]">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>

      {message ? (
        <p
          role="status"
          className="mt-4 rounded-2xl border border-[#E7D3B0] bg-[#FFF8EA] px-4 py-2.5 text-sm font-semibold text-[#5E4735]"
        >
          {message}
        </p>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div>
          <h4 className="text-sm font-black text-[#2C241C]">
            אורחים שטרם שובצו ({unassigned.length})
          </h4>
          <p className="mt-1 text-xs font-semibold text-[#7A6042]">
            לחצו לבחירה, ואז בחרו שולחן · או גררו לשולחן בדסקטופ
          </p>
          <ul className="mt-3 space-y-2">
            {unassigned.length === 0 ? (
              <li className="rounded-2xl border border-dashed border-[#DCC7A6] bg-white px-4 py-3 text-sm font-semibold text-[#7A6042]">
                כולם שובצו — אפשר לאפס ולהתחיל מחדש
              </li>
            ) : (
              unassigned.map((g) => (
                <li key={g.id}>
                  <button
                    type="button"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/guest-id", g.id);
                      e.dataTransfer.effectAllowed = "move";
                      setSelectedGuestId(g.id);
                    }}
                    onClick={() =>
                      setSelectedGuestId((cur) => (cur === g.id ? null : g.id))
                    }
                    className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-right transition ${
                      selectedGuestId === g.id
                        ? "border-[#C7A56B] bg-[#FFF8EA] shadow-sm"
                        : "border-[#EADDC8] bg-white hover:border-[#C7A56B]"
                    }`}
                  >
                    <span>
                      <span className="block text-sm font-black text-[#2C241C]">
                        {g.name}
                      </span>
                      <span className="text-xs font-semibold text-[#7A6042]">
                        {g.group}
                      </span>
                    </span>
                    <span className="rounded-full bg-[#F7EFE0] px-2.5 py-1 text-xs font-black tabular-nums text-[#5E4735]">
                      {g.count}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>

          {selectedGuestId ? (
            <div className="mt-4 rounded-2xl border border-[#E7D3B0] bg-[#FFF8EA] p-3 print:hidden">
              <p className="text-xs font-bold text-[#7A6042]">
                נבחר:{" "}
                {INITIAL_GUESTS.find((g) => g.id === selectedGuestId)?.name}
              </p>
              <label className="mt-2 block text-xs font-bold text-[#5E4735]">
                שיבוץ מהיר (מובייל)
                <select
                  className="mt-1 min-h-11 w-full rounded-xl border border-[#E6D2AA] bg-white px-3 text-sm font-semibold"
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) tryAssign(selectedGuestId, e.target.value);
                    e.target.value = "";
                  }}
                >
                  <option value="" disabled>
                    בחרו שולחן…
                  </option>
                  {INITIAL_TABLES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} · פנויים {t.capacity - usedAtTable(t.id)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}
        </div>

        <div>
          <h4 className="text-sm font-black text-[#2C241C]">שולחנות</h4>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {INITIAL_TABLES.map((t) => {
              const used = usedAtTable(t.id);
              const guestsHere = INITIAL_GUESTS.filter(
                (g) => assignments[g.id] === t.id
              );
              const full = used >= t.capacity;
              return (
                <li
                  key={t.id}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverTable(t.id);
                  }}
                  onDragLeave={() => setDragOverTable((cur) => (cur === t.id ? null : cur))}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOverTable(null);
                    const id = e.dataTransfer.getData("text/guest-id");
                    if (id) tryAssign(id, t.id);
                  }}
                  className={`rounded-2xl border p-4 transition ${
                    dragOverTable === t.id
                      ? "border-[#C7A56B] bg-[#FFF8EA]"
                      : full
                        ? "border-[#C7A56B] bg-[#FFF8EA]/70"
                        : "border-[#EADDC8] bg-white"
                  }`}
                >
                  <button
                    type="button"
                    className="flex w-full items-baseline justify-between gap-2 text-right"
                    onClick={() => {
                      if (selectedGuestId) tryAssign(selectedGuestId, t.id);
                    }}
                    aria-label={`${t.name}, ${used} מתוך ${t.capacity}`}
                  >
                    <span className="text-sm font-black text-[#2C241C]">{t.name}</span>
                    <span className="text-sm font-black tabular-nums text-[#35281F]">
                      {used}
                      <span className="text-xs font-bold text-[#8A642E]">
                        {" "}
                        / {t.capacity}
                      </span>
                    </span>
                  </button>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#EFE2CC]">
                    <div
                      className={`h-full rounded-full ${full ? "bg-[#5A4333]" : "bg-[#C7A56B]"}`}
                      style={{
                        width: `${Math.min(100, Math.round((used / t.capacity) * 100))}%`,
                      }}
                    />
                  </div>
                  <ul className="mt-3 space-y-1.5">
                    {guestsHere.length === 0 ? (
                      <li className="text-xs font-semibold text-[#9A8060]">
                        ריק — לחצו כשאורח נבחר או גררו לכאן
                      </li>
                    ) : (
                      guestsHere.map((g) => (
                        <li
                          key={g.id}
                          className="flex items-center justify-between gap-2 rounded-xl bg-[#FBF6EE] px-2.5 py-1.5 text-xs"
                        >
                          <span className="font-bold text-[#3F3025]">
                            {g.name}{" "}
                            <span className="tabular-nums text-[#8A642E]">
                              ({g.count})
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={() => unassign(g.id)}
                            className="font-bold text-[#8A642E] underline-offset-2 hover:underline print:hidden"
                          >
                            הסרה
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
