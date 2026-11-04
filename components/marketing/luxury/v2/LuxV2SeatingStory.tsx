"use client";

import { useCallback, useMemo, useState } from "react";
import TrackedCtaLink from "@/components/seo/TrackedCtaLink";
import { luxBtnPlum, luxBtnSecondary } from "@/lib/ui/luxuryButtonClasses";
import { cn } from "@/lib/utils";

type Guest = {
  id: string;
  name: string;
  party: number;
  status: string;
  tableId: string | null;
};

const INITIAL_GUESTS: Guest[] = [
  { id: "g1", name: "נועה כהן", party: 2, status: "מגיעה", tableId: "t1" },
  { id: "g2", name: "יוסי לוי", party: 1, status: "מגיע", tableId: "t1" },
  { id: "g3", name: "מיכל אברהם", party: 2, status: "ממתינה", tableId: null },
  { id: "g4", name: "דניאל שמש", party: 3, status: "מגיע", tableId: "t2" },
  { id: "g5", name: "שירה גולן", party: 2, status: "מגיעה", tableId: null },
];

const TABLES = [
  { id: "t1", label: "1", x: 28, y: 34, seats: 10 },
  { id: "t2", label: "2", x: 64, y: 30, seats: 10 },
  { id: "t3", label: "3", x: 46, y: 66, seats: 8 },
] as const;

/**
 * Interactive seating demo — tap-to-assign first (mobile-friendly),
 * drag still works on desktop. Links to real try seating.
 */
export default function LuxV2SeatingStory() {
  const [guests, setGuests] = useState(INITIAL_GUESTS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverTable, setHoverTable] = useState<string | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const filledByTable = useMemo(() => {
    const map: Record<string, number> = { t1: 0, t2: 0, t3: 0 };
    for (const g of guests) {
      if (g.tableId) map[g.tableId] = (map[g.tableId] || 0) + g.party;
    }
    return map;
  }, [guests]);

  const seatedTotal = useMemo(
    () => guests.filter((g) => g.tableId).reduce((s, g) => s + g.party, 0),
    [guests],
  );

  const selected = guests.find((g) => g.id === selectedId) || null;

  const assign = useCallback((guestId: string, tableId: string) => {
    const table = TABLES.find((t) => t.id === tableId);
    const guest = guests.find((g) => g.id === guestId);
    if (!guest || !table) return false;
    const others = guests
      .filter((g) => g.tableId === tableId && g.id !== guestId)
      .reduce((s, g) => s + g.party, 0);
    if (others + guest.party > table.seats) {
      setToast("אין מקום בשולחן הזה");
      window.setTimeout(() => setToast(null), 1600);
      return false;
    }

    setGuests((prev) =>
      prev.map((g) => (g.id === guestId ? { ...g, tableId, status: "משובצ/ת" } : g)),
    );
    setFlashId(guestId);
    setToast(`${guest.name} → שולחן ${table.label}`);
    window.setTimeout(() => setFlashId((cur) => (cur === guestId ? null : cur)), 900);
    window.setTimeout(() => setToast(null), 1800);
    setSelectedId(null);
    setHoverTable(null);
    return true;
  }, [guests]);

  const onTableActivate = (tableId: string) => {
    if (!selectedId) return;
    assign(selectedId, tableId);
  };

  return (
    <section
      dir="rtl"
      aria-labelledby="lux-v2-seating"
      className="relative overflow-hidden bg-[#F5EEE8] px-4 py-16 sm:px-6 md:px-10 md:py-24"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse at 80% 20%, rgba(181,117,145,0.18), transparent 40%), radial-gradient(ellipse at 10% 90%, rgba(197,165,130,0.25), transparent 42%)",
        }}
      />

      <div className="relative z-10 mx-auto grid w-full max-w-[1280px] items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="text-xs font-bold tracking-[0.28em] text-[#842B4C]">
            סידורי הושבה · הדגמה אינטראקטיבית
          </p>
          <h2
            id="lux-v2-seating"
            className="mt-4 text-[34px] font-black leading-[1.08] tracking-[-0.035em] text-[#42182F] sm:text-[48px]"
          >
            בחרו אורח ולחצו על שולחן
            <span className="mt-1 block text-[#842B4C]">וראו את התפוסה מתעדכנת</span>
          </h2>
          <p className="mt-4 max-w-md text-lg leading-8 text-[#6B5360]">
            במובייל: Tap על אורח ואז על שולחן. במחשב אפשר גם לגרור. אחר כך אפשר לפתוח את דמו
            ההושבה האמיתי.
          </p>

          <div
            className="mt-8 inline-flex items-baseline gap-3 border border-[#C5A582]/50 bg-white/70 px-4 py-3 text-[#42182F]"
            aria-live="polite"
          >
            <span className="text-3xl font-black tabular-nums">{seatedTotal}</span>
            <span className="text-sm font-bold">אורחים משובצים על המפה</span>
          </div>

          {selected ? (
            <p className="mt-4 text-sm font-bold text-[#842B4C]" aria-live="polite">
              נבחר/ה: {selected.name} · לחצו על שולחן לשיבוץ
            </p>
          ) : null}
          {toast ? (
            <p className="mt-2 text-sm font-extrabold text-[#42182F]" aria-live="assertive">
              {toast}
            </p>
          ) : null}

          <div className="mt-8 flex flex-wrap gap-3">
            <TrackedCtaLink href="/seating-explained" location="lux_v2_seating" className={luxBtnPlum}>
              סידורי הושבה לחתונה
            </TrackedCtaLink>
            <TrackedCtaLink
              href="/try/dashboard/seating"
              location="lux_v2_seating_demo"
              className={luxBtnSecondary}
            >
              לפתוח דמו הושבה
            </TrackedCtaLink>
          </div>
          <p className="mt-4 text-[11px] font-medium text-[#6B5360]">
            הדגמה ויזואלית בלבד · לא שומרת נתונים
          </p>
        </div>

        <div className="relative mx-auto grid w-full max-w-[680px] gap-4 md:grid-cols-[0.42fr_0.58fr]">
          <div className="overflow-hidden border border-[#C5A582]/40 bg-[#FFFBFA]/95 shadow-[0_24px_60px_rgba(66,24,47,0.1)]">
            <div className="border-b border-[#C5A582]/30 px-4 py-3">
              <p className="text-xs font-bold tracking-[0.16em] text-[#842B4C]">מוזמנים</p>
              <p className="text-sm font-extrabold text-[#42182F]">החתונה של מאיה ואיתי</p>
            </div>
            <ul>
              {guests.map((g) => {
                const selectedGuest = selectedId === g.id;
                return (
                  <li key={g.id}>
                    <button
                      type="button"
                      draggable
                      onDragStart={() => setSelectedId(g.id)}
                      onDragEnd={() => {
                        setHoverTable(null);
                      }}
                      onClick={() => setSelectedId((cur) => (cur === g.id ? null : g.id))}
                      className={cn(
                        "flex w-full touch-manipulation items-center justify-between border-b border-[#C5A582]/20 px-4 py-3 text-sm transition md:py-2.5",
                        selectedGuest && "bg-[#E8CFD8]/70 ring-2 ring-inset ring-[#842B4C]",
                        flashId === g.id && "bg-[#C5A582]/40",
                        g.tableId && !selectedGuest ? "opacity-80" : "opacity-100",
                      )}
                      aria-pressed={selectedGuest}
                    >
                      <span className="font-bold text-[#42182F]">{g.name}</span>
                      <span className="text-xs text-[#6B5360]">
                        {g.party}
                        {g.tableId
                          ? ` · שולחן ${TABLES.find((t) => t.id === g.tableId)?.label}`
                          : " · ממתין"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="px-4 py-2 text-[11px] font-medium text-[#842B4C]">
              {selectedId ? "עכשיו בחרו שולחן על המפה" : "לחצו על אורח כדי לבחור"}
            </p>
          </div>

          <div className="relative aspect-[5/4] overflow-hidden border border-[#C5A582]/35 bg-[#2A1A22]">
            <img
              src="/images/seating/seating-map.webp"
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-35"
              loading="lazy"
              decoding="async"
              draggable={false}
            />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(197,165,130,0.2),transparent_55%)]" />

            {TABLES.map((t) => {
              const filled = filledByTable[t.id] || 0;
              const active = hoverTable === t.id || (selectedId != null && hoverTable === t.id);
              const awaiting = selectedId != null;
              return (
                <button
                  key={t.id}
                  type="button"
                  onDragOver={(e) => {
                    e.preventDefault();
                    setHoverTable(t.id);
                  }}
                  onDragLeave={() => setHoverTable((cur) => (cur === t.id ? null : cur))}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (selectedId) assign(selectedId, t.id);
                  }}
                  onClick={() => onTableActivate(t.id)}
                  className={cn(
                    "absolute flex h-[72px] w-[72px] -translate-x-1/2 -translate-y-1/2 touch-manipulation flex-col items-center justify-center rounded-full border-2 transition md:h-[88px] md:w-[88px]",
                    awaiting && "animate-pulse",
                  )}
                  style={{
                    left: `${t.x}%`,
                    top: `${t.y}%`,
                    borderColor: active || awaiting ? "#C5A582" : "rgba(197,165,130,0.45)",
                    background: active ? "rgba(132,43,76,0.95)" : "rgba(66,24,47,0.78)",
                    boxShadow:
                      active || awaiting ? "0 0 0 6px rgba(197,165,130,0.28)" : undefined,
                  }}
                  aria-label={`שולחן ${t.label}, ${Math.min(filled, t.seats)} מתוך ${t.seats}`}
                >
                  <span className="text-lg font-black text-[#F5EEE8]">{t.label}</span>
                  <span className="text-[10px] font-bold text-[#C5A582]">
                    {Math.min(filled, t.seats)}/{t.seats}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
