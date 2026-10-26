"use client";

import { useMemo, useState } from "react";
import { computeSeatingCapacity, type SeatingCalcInputs } from "./calcLogic";

const inputClass =
  "min-h-12 w-full rounded-2xl border border-[#E6D2AA] bg-white px-4 text-base font-semibold text-[#2C241C] tabular-nums";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-bold text-[#5E4735]">
      <span>{label}</span>
      {children}
      {hint ? <span className="text-xs font-semibold leading-5 text-[#8A6B45]">{hint}</span> : null}
    </label>
  );
}

function ResultRow({
  label,
  value,
  emphasize,
  tone,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
  tone?: "ok" | "warn" | "neutral";
}) {
  const valueClass =
    tone === "warn"
      ? "text-[#8B3A2A]"
      : tone === "ok"
        ? "text-[#2F4428]"
        : emphasize
          ? "text-[#2C241C]"
          : "text-[#35281F]";
  return (
    <div
      className={`flex items-baseline justify-between gap-4 border-b border-[#EFE2CC] py-3 last:border-0 ${
        emphasize ? "rounded-2xl bg-[#FBF6EE] px-3" : ""
      }`}
    >
      <span className="text-sm font-bold text-[#5E4735]">{label}</span>
      <span className={`text-lg font-black tabular-nums ${valueClass}`}>{value}</span>
    </div>
  );
}

function parseNum(raw: string) {
  const n = Number(String(raw).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export default function SeatingCalculator() {
  const [confirmed, setConfirmed] = useState("300");
  const [tables, setTables] = useState("30");
  const [seatsPerTable, setSeatsPerTable] = useState("10");
  const [reserves, setReserves] = useState("0");
  const [noShowPct, setNoShowPct] = useState("10");

  const inputs: SeatingCalcInputs = useMemo(
    () => ({
      confirmedGuests: parseNum(confirmed),
      tablesCount: parseNum(tables),
      seatsPerTable: parseNum(seatsPerTable),
      approvedReserves: parseNum(reserves),
      noShowPct: parseNum(noShowPct),
    }),
    [confirmed, tables, seatsPerTable, reserves, noShowPct]
  );

  const result = useMemo(() => computeSeatingCapacity(inputs), [inputs]);

  const gapLabel =
    result.shortfall > 0
      ? `חסרים ${result.shortfall} מקומות`
      : result.spare > 0
        ? `${result.spare} מקומות פנויים`
        : "מדויק מול המאשרים";

  return (
    <div
      id="seating-calculator"
      className="scroll-mt-24 rounded-[32px] border border-[#E6D2AA] bg-[#FFFDF8] p-5 shadow-[0_22px_50px_rgba(95,68,34,0.08)] md:p-8"
    >
      <div className="mb-6 max-w-2xl">
        <p className="text-xs font-black tracking-[0.12em] text-[#8A642E]">מחשבון הושבה</p>
        <h3 className="mt-2 text-2xl font-black text-[#2C241C] md:text-3xl">
          כמה מקומות יש מול מאשרי ההגעה?
        </h3>
        <p className="mt-2 text-sm leading-7 text-[#5C4A3A] md:text-base">
          הזינו את מספר המאשרים, השולחנות והרזרבות שאושרו. אחוז אי־ההגעה הוא תרחיש בלבד — לא
          הצדקה לשיבוץ מעבר לקיבולת.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="מספר מאשרי הגעה">
            <input
              inputMode="numeric"
              className={inputClass}
              value={confirmed}
              onChange={(e) => setConfirmed(e.target.value)}
              aria-label="מספר מאשרי הגעה"
            />
          </Field>
          <Field label="מספר שולחנות">
            <input
              inputMode="numeric"
              className={inputClass}
              value={tables}
              onChange={(e) => setTables(e.target.value)}
              aria-label="מספר שולחנות"
            />
          </Field>
          <Field label="קיבולת לכל שולחן" hint="כפי שאושר מול האולם">
            <input
              inputMode="numeric"
              className={inputClass}
              value={seatsPerTable}
              onChange={(e) => setSeatsPerTable(e.target.value)}
              aria-label="קיבולת לכל שולחן"
            />
          </Field>
          <Field
            label="מקומות רזרבה שאושרו"
            hint="רק רזרבות שהאולם התחייב להפעיל — לא «מקום פנוי» כללי"
          >
            <input
              inputMode="numeric"
              className={inputClass}
              value={reserves}
              onChange={(e) => setReserves(e.target.value)}
              aria-label="מקומות רזרבה שאושרו"
            />
          </Field>
          <Field
            label="אחוז אי־הגעה משוער (%)"
            hint="ברירת מחדל 10% — ניתן לשינוי. תרחיש תכנון, לא הבטחה."
          >
            <input
              inputMode="decimal"
              className={inputClass}
              value={noShowPct}
              onChange={(e) => setNoShowPct(e.target.value)}
              aria-label="אחוז אי־הגעה משוער"
            />
          </Field>
        </div>

        <div className="rounded-[24px] border border-[#E7D3B0] bg-white p-5 md:p-6">
          <p className="text-xs font-black tracking-[0.12em] text-[#8A642E]">תוצאות</p>
          <div className="mt-2">
            <ResultRow label="מקומות רגילים" value={String(result.regularSeats)} />
            <ResultRow
              label="מקומות כולל רזרבות מאושרות"
              value={String(result.totalWithReserves)}
              emphasize
            />
            <ResultRow
              label="מול מאשרי ההגעה"
              value={gapLabel}
              tone={result.shortfall > 0 ? "warn" : "ok"}
              emphasize
            />
            <ResultRow
              label={`מגיעים צפויים לפי ${Math.round(result.confirmed ? inputs.noShowPct : 0)}% אי־הגעה`}
              value={String(result.expectedArrivals)}
            />
            <ResultRow
              label="תרחיש: כל המאשרים מגיעים"
              value={String(result.fullArrival)}
              tone={result.canSeatAllConfirmers ? "ok" : "warn"}
            />
          </div>

          {result.warnings.length ? (
            <ul className="mt-4 space-y-2" role="status">
              {result.warnings.map((w) => (
                <li
                  key={w}
                  className="rounded-2xl border border-[#E8C4B4] bg-[#FBF1EC] px-3 py-2.5 text-sm font-semibold leading-6 text-[#6B3428]"
                >
                  {w}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 rounded-2xl border border-[#D5E0D0] bg-[#F3F7F1] px-3 py-2.5 text-sm font-semibold leading-6 text-[#2F4428]">
              הקיבולת המאושרת (כולל רזרבות) מספיקה לכל מאשרי ההגעה בתרחיש המלא.
            </p>
          )}

          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-bold text-[#8A642E]">
              הנחות החישוב
            </summary>
            <ul className="mt-2 space-y-1.5 text-xs leading-5 text-[#7A6042]">
              {result.assumptions.map((a) => (
                <li key={a}>• {a}</li>
              ))}
            </ul>
          </details>
        </div>
      </div>
    </div>
  );
}
