"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

type TabId = "cards" | "team" | "qr";

type DemoGuest = {
  id: string;
  name: string;
  confirmed: number;
  arrived: number;
  table: string;
};

const DEMO_GUESTS: DemoGuest[] = [
  { id: "cohen", name: "משפחת כהן", confirmed: 4, arrived: 0, table: "שולחן 12" },
  { id: "hadar", name: "הדר לוי", confirmed: 2, arrived: 0, table: "שולחן 8" },
  { id: "avraham", name: "משפחת אברהם", confirmed: 2, arrived: 0, table: "שולחן 3" },
];

const TABS: { id: TabId; label: string; note: string }[] = [
  {
    id: "cards",
    label: "פתקיות הושבה",
    note: "המחשה להשוואה בלבד — לא שיטת העבודה של Invistimo",
  },
  {
    id: "team",
    label: "הושבה עם צוות",
    note: "הדגמה לפי מסך קבלת פנים: חיפוש → סימון הגעה → מסירת שולחן בעל פה",
  },
  {
    id: "qr",
    label: "QR אישי",
    note: "מספר השולחן מופיע בטלפון רק אחרי שהצוות מאשר הגעה",
  },
];

function DemoQrPattern({ label }: { label: string }) {
  // Decorative QR-like grid for marketing demo only (fictitious token pattern).
  const cells = useMemo(() => {
    const out: boolean[] = [];
    let seed = 17;
    for (let i = 0; i < 121; i += 1) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      out.push(seed % 3 !== 0);
    }
    return out;
  }, []);

  return (
    <div
      className="mx-auto grid h-[200px] w-[200px] grid-cols-11 gap-[3px] rounded-2xl border border-[#E8DCCB] bg-white p-3"
      role="img"
      aria-label={`קוד QR להדגמה עבור ${label}`}
    >
      {cells.map((on, i) => (
        <span
          key={i}
          className={`rounded-[2px] ${on ? "bg-[#2C241C]" : "bg-transparent"}`}
          aria-hidden
        />
      ))}
    </div>
  );
}

function PrintedCardsPanel() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div>
        <p className="text-sm font-black tracking-[0.12em] text-[#8A642E]">המחשה להשוואה</p>
        <h3 className="mt-2 text-2xl font-black text-[#2C241C]">פתקיות הושבה מודפסות</h3>
        <p className="mt-4 text-base leading-8 text-[#5C4A3A]">
          בשיטה המסורתית מדפיסים כרטיס לכל אורח או משפחה עם מספר השולחן. צוות הקבלה מאתר את
          הפתקית ומוסר אותה בכניסה.
        </p>
        <aside className="mt-5 rounded-[22px] border border-[#E6D2AA] bg-[#FFF8EA] px-4 py-3 text-sm leading-7 text-[#5C4A3A]">
          <p className="font-black text-[#2C241C]">חשוב לדעת</p>
          <p className="mt-1">
            Invistimo אינה מחלקת פתקיות הושבה. הלשונית הזו קיימת רק כדי להשוות מול המסלולים
            הדיגיטליים.
          </p>
        </aside>
        <ul className="mt-5 space-y-2 text-sm leading-7 text-[#5C4A3A] md:text-base">
          <li>• דורש הדפסה והכנה מראש</li>
          <li>• שינויים מחייבים תיקון ידני</li>
          <li>• פתקיות עלולות ללכת לאיבוד</li>
          <li>• מעקב הגעה בפועל דורש רישום נפרד</li>
        </ul>
      </div>
      <div className="relative mx-auto w-full max-w-[340px]">
        <div className="absolute inset-0 translate-x-2 translate-y-2 rounded-[28px] bg-[#E8D1A5]/35" aria-hidden />
        <div className="relative space-y-3 rounded-[28px] border border-[#E6D2AA] bg-[#FFFDF8] p-5 shadow-[0_18px_40px_rgba(58,39,20,0.08)]">
          <p className="text-center text-xs font-black tracking-[0.14em] text-[#8A642E]">
            דוגמאות פתקיות · נתונים פיקטיביים
          </p>
          {[
            { name: "משפחת כהן", table: "12" },
            { name: "הדר לוי", table: "8" },
            { name: "משפחת אברהם", table: "3" },
          ].map((card) => (
            <div
              key={card.name}
              className="rounded-2xl border border-dashed border-[#DCC7A6] bg-[#FCFAF6] px-4 py-3"
            >
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold text-[#9A8775]">שולחן</p>
                  <p className="text-3xl font-black text-[#2C241C]">{card.table}</p>
                </div>
                <p className="text-sm font-black text-[#5C4A3A]">{card.name}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TeamReceptionPanel() {
  const reduce = useReducedMotion();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<DemoGuest | null>(null);
  const [arrivedMap, setArrivedMap] = useState<Record<string, number>>({});
  const [toast, setToast] = useState<string | null>(null);

  const results = useMemo(() => {
    const q = query.trim();
    if (q.length < 2) return [];
    return DEMO_GUESTS.filter((g) => g.name.includes(q));
  }, [query]);

  function markArrival(guest: DemoGuest, qty: number) {
    const prev = arrivedMap[guest.id] || 0;
    const next = Math.min(guest.confirmed, prev + qty);
    setArrivedMap((m) => ({ ...m, [guest.id]: next }));
    setToast(`הכניסה נרשמה · ${qty} · ${guest.table}`);
    window.setTimeout(() => setToast(null), 3200);
  }

  const selectedArrived = selected ? arrivedMap[selected.id] || 0 : 0;
  const remaining = selected ? Math.max(0, selected.confirmed - selectedArrived) : 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.05fr]">
      <div>
        <p className="text-sm font-black tracking-[0.12em] text-[#8A642E]">מסלול Invistimo</p>
        <h3 className="mt-2 text-2xl font-black text-[#2C241C]">הושבה עם צוות קבלת פנים</h3>
        <p className="mt-4 text-base leading-8 text-[#5C4A3A]">
          הנציג מחפש את האורח במערכת, מסמן כמה הגיעו בפועל, רואה את מספר השולחן ומוסר אותו לאורח
          בעל פה. אין חלוקת פתקית.
        </p>
        <ol className="mt-5 space-y-2 text-sm leading-7 text-[#5C4A3A] md:text-base">
          <li>1. האורח מגיע לעמדה</li>
          <li>2. הנציג שואל לשם ומחפש במערכת</li>
          <li>3. מסמנים הגעה בפועל</li>
          <li>4. מספר השולחן מופיע לנציג</li>
          <li>5. הנציג מוסר את המספר ומכוון את האורח</li>
        </ol>
        <p className="mt-4 text-xs font-semibold text-[#8A7458]">
          נתוני ההדגמה פיקטיביים · אינם לקוחות אמיתיים
        </p>
      </div>

      <div className="overflow-hidden rounded-[28px] border border-[#E6D2AA] bg-[#FFFDF8] shadow-[0_18px_40px_rgba(58,39,20,0.08)]">
        <div className="border-b border-[#EADDC8] bg-[#FCFAF6] px-4 py-3 text-sm font-black text-[#6B5B4A]">
          קבלת פנים · חיפוש אורח
        </div>
        <div className="space-y-4 p-4">
          <label className="block">
            <span className="sr-only">חיפוש אורח</span>
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelected(null);
              }}
              placeholder="חיפוש לפי שם (למשל: כהן)"
              className="w-full rounded-2xl border border-[#E3D6C3] bg-white px-4 py-3 text-sm font-semibold text-[#2C241C] outline-none ring-[#C7A56B] focus:ring-2"
            />
          </label>

          {results.length > 0 && !selected ? (
            <ul className="space-y-2">
              {results.map((guest) => (
                <li key={guest.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(guest)}
                    className="flex w-full items-center justify-between rounded-2xl border border-[#EADDC8] bg-white px-4 py-3 text-right transition hover:border-[#C7A56B]"
                  >
                    <span className="font-black text-[#2C241C]">{guest.name}</span>
                    <span className="text-xs font-bold text-[#8A642E]">{guest.table}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {query.trim().length >= 2 && results.length === 0 ? (
            <p className="text-sm font-semibold text-[#8A7458]">לא נמצאו תוצאות בהדגמה.</p>
          ) : null}

          {selected ? (
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-[24px] border border-[#E6D2AA] bg-[#FFF8EA] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-black text-[#2C241C]">{selected.name}</p>
                  <p className="mt-1 text-sm font-semibold text-[#5C4A3A]">
                    אישרו {selected.confirmed} · הגיעו {selectedArrived}
                  </p>
                </div>
                <div className="rounded-2xl bg-[#2C241C] px-3 py-2 text-center text-[#FFF8EA]">
                  <p className="text-[10px] font-bold tracking-wide text-[#E8C57A]">שולחן</p>
                  <p className="text-xl font-black">{selected.table.replace("שולחן ", "")}</p>
                </div>
              </div>
              <p className="mt-3 text-xs font-semibold text-[#7A6042]">
                מספר השולחן נמסר לאורח בעל פה — לא כפתקית.
              </p>
              {remaining > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {Array.from({ length: remaining }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => markArrival(selected, n)}
                      className="min-h-11 min-w-11 rounded-full border border-[#3A2B22] bg-[#3A2B22] px-3 text-sm font-black text-white"
                    >
                      {n}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm font-black text-[#2C241C]">כל המוזמנים ברשומה סומנו כהגיעו.</p>
              )}
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="mt-3 text-xs font-bold text-[#8A642E] underline-offset-4 hover:underline"
              >
                חזרה לחיפוש
              </button>
            </motion.div>
          ) : null}

          {toast ? (
            <div
              role="status"
              className="rounded-2xl border border-[#C7A56B] bg-[#2C241C] px-4 py-3 text-sm font-bold text-[#FFF8EA]"
            >
              {toast}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function QrPersonalPanel() {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<"qr" | "scanning" | "welcome">("qr");

  useEffect(() => {
    if (phase !== "scanning") return;
    const t = window.setTimeout(() => setPhase("welcome"), reduce ? 0 : 1100);
    return () => window.clearTimeout(t);
  }, [phase, reduce]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div>
        <p className="text-sm font-black tracking-[0.12em] text-[#8A642E]">מסלול Check-in</p>
        <h3 className="mt-2 text-2xl font-black text-[#2C241C]">QR אישי להושבה בכניסה</h3>
        <p className="mt-4 text-base leading-8 text-[#5C4A3A]">
          האורח מציג קוד אישי. הצוות מאשר את ההגעה במערכת. רק אחרי האישור עובר הטלפון למסך תודה —
          ואז מוצג מספר השולחן, אם האורח שובץ.
        </p>
        <ul className="mt-5 space-y-2 text-sm leading-7 text-[#5C4A3A] md:text-base">
          <li>• פתיחת הקישור לבד אינה מסמנת הגעה</li>
          <li>• ב־QR עצמו אין מספר שולחן</li>
          <li>• מומלץ תמיד מסלול חלופי של חיפוש ידני</li>
        </ul>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setPhase("qr")}
            className="rounded-full border border-[#DCC7A6] bg-white px-4 py-2 text-sm font-bold text-[#5E4735]"
          >
            איפוס להדגמה
          </button>
          {phase === "qr" ? (
            <button
              type="button"
              onClick={() => setPhase("scanning")}
              className="rounded-full border border-[#3A2B22] bg-[#3A2B22] px-4 py-2 text-sm font-bold text-white"
            >
              הדמיית סריקה ואישור צוות
            </button>
          ) : null}
        </div>
        <p className="mt-4 text-xs font-semibold text-[#8A7458]">
          הדגמה עם נתונים פיקטיביים · משפחת כהן · שולחן 12
        </p>
      </div>

      <div className="mx-auto w-full max-w-[300px]">
        <div className="overflow-hidden rounded-[2rem] border-[10px] border-[#1C1612] bg-[#1C1612] shadow-[0_28px_60px_rgba(40,28,16,0.28)]">
          <div className="relative min-h-[520px] bg-[#F6EFE6] px-4 pb-5 pt-3 text-[#2F2924]">
            <div className="mx-auto mb-3 h-1.5 w-16 rounded-full bg-[#D9CBB5]" aria-hidden />

            {phase === "qr" || phase === "scanning" ? (
              <div className="rounded-[24px] border border-[#E3D6C3] bg-[#FFFDF8] px-4 py-6 text-center">
                <p className="text-[15px] font-medium text-[#8B6B50]">נועה ויואב</p>
                <p className="mt-2 text-[12px] font-semibold text-[#9A8775]">
                  קוד הכניסה האישי שלכם
                </p>
                <div className="mt-5">
                  <DemoQrPattern label="משפחת כהן" />
                </div>
                <p className="mt-5 text-[13px] font-medium text-[#8A7A68]">
                  הציגו את הקוד בכניסה לאירוע
                </p>
                {phase === "scanning" ? (
                  <p className="mt-4 text-sm font-black text-[#8A642E]" role="status">
                    הצוות מאשר הגעה…
                  </p>
                ) : null}
              </div>
            ) : (
              <motion.div
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex min-h-[480px] flex-col items-center justify-center rounded-[24px] bg-[#241A14] px-4 py-8 text-center text-[#FFFDF8]"
              >
                <p className="text-[11px] font-black tracking-[0.22em] text-[#E8C57A]">
                  נועה ויואב
                </p>
                <h4 className="mt-6 text-[1.6rem] font-black leading-tight">
                  תודה שהגעתם לשמוח איתנו
                </h4>
                <div className="mt-8 w-full rounded-[28px] border border-[#E8C57A]/40 bg-[#2C2119] px-6 py-7">
                  <p className="text-xs font-bold tracking-wide text-[#E8C57A]">השולחן שלכם</p>
                  <p className="mt-2 text-4xl font-black">שולחן 12</p>
                </div>
                <p className="mt-6 text-sm font-bold text-[#EADBC4]">מאחלים לכם ערב מהנה</p>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReceptionMethodsDemo() {
  const [tab, setTab] = useState<TabId>("team");
  const active = TABS.find((t) => t.id === tab)!;

  return (
    <div className="rounded-[32px] border border-[#E6D2AA] bg-gradient-to-b from-[#FFFDF8] to-[#F7F0E4] p-5 shadow-[0_20px_50px_rgba(58,39,20,0.08)] md:p-8">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="השוואת שיטות קבלת פנים">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={`rounded-full border px-4 py-2.5 text-sm font-bold transition ${
              tab === item.id
                ? "border-[#3A2B22] bg-[#3A2B22] text-white"
                : "border-[#DCC7A6] bg-white/80 text-[#5E4735] hover:bg-white"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <p className="mt-4 text-sm font-semibold leading-7 text-[#7A6042]">{active.note}</p>
      <div role="tabpanel" className="mt-6">
        {tab === "cards" ? <PrintedCardsPanel /> : null}
        {tab === "team" ? <TeamReceptionPanel /> : null}
        {tab === "qr" ? <QrPersonalPanel /> : null}
      </div>
    </div>
  );
}
