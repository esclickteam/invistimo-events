"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { computeRecordsQuota } from "./calcLogic";

const inputClass =
  "min-h-11 w-full rounded-xl border border-[#E6D2AA] bg-white px-3.5 text-base font-semibold tabular-nums text-[#2C241C] outline-none transition focus:border-[#C9A45C] focus:ring-2 focus:ring-[#C9A45C]/25";

/** Keep empty while typing; strip non-digits; never force "0". */
function sanitizeDigits(raw: string) {
  return raw.replace(/[^\d]/g, "");
}

function parseOptional(raw: string): number | null {
  if (raw.trim() === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.floor(n);
}

function parseRequired(raw: string): number {
  if (raw.trim() === "") return 0;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

function Field({
  label,
  hint,
  value,
  onChange,
  optional,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (next: string) => void;
  optional?: boolean;
}) {
  return (
    <label className="grid gap-1">
      <span className="text-sm font-black text-[#3F3025]">
        {label}
        {optional ? (
          <span className="mr-1.5 text-xs font-bold text-[#8A6B45]">(לא חובה)</span>
        ) : null}
      </span>
      <input
        inputMode="numeric"
        className={inputClass}
        value={value}
        onChange={(e) => onChange(sanitizeDigits(e.target.value))}
        placeholder={optional ? "לדוגמה 450" : undefined}
        aria-describedby={undefined}
      />
      <span className="text-xs font-semibold leading-5 text-[#8A6B45]">{hint}</span>
    </label>
  );
}

export default function RecordsCalculator() {
  const [withPhoneRecords, setWithPhoneRecords] = useState("300");
  const [withoutPhoneRecords, setWithoutPhoneRecords] = useState("50");
  const [totalGuests, setTotalGuests] = useState("450");

  const result = useMemo(
    () =>
      computeRecordsQuota({
        withPhoneRecords: parseRequired(withPhoneRecords),
        withoutPhoneRecords: parseRequired(withoutPhoneRecords),
        totalGuests: parseOptional(totalGuests),
      }),
    [withPhoneRecords, withoutPhoneRecords, totalGuests]
  );

  return (
    <div
      id="records-calculator"
      className="scroll-mt-24 mx-auto max-w-xl rounded-[28px] border border-[#E6D2AA] bg-[#FFFDF8] p-5 shadow-[0_18px_40px_rgba(95,68,34,0.08)] md:p-6"
    >
      <div className="text-center md:text-right">
        <p className="text-xs font-black tracking-[0.14em] text-[#7A5530]">מחשבון המחשה</p>
        <h3 className="mt-1.5 text-xl font-black text-[#2C241C] md:text-2xl">
          כמה רשומות צריך בחבילה?
        </h3>
        <p className="mt-2 text-sm leading-6 text-[#5C4A3A]">
          ספירת רשומות בלבד — בלי מחיר כספי. המכסה נקבעת לפי רשומות עם מספר טלפון.
        </p>
      </div>

      <div className="mt-5 grid gap-4">
        <Field
          label="רשומות עם מספר טלפון"
          hint="אלה הרשומות שנגרעות ממכסת חבילת אישורי ההגעה."
          value={withPhoneRecords}
          onChange={setWithPhoneRecords}
        />
        <Field
          label="רשומות ללא מספר טלפון"
          hint="נשארות ברשימה לניהול ולהושבה, ואינן נגרעות מהמכסה."
          value={withoutPhoneRecords}
          onChange={setWithoutPhoneRecords}
        />
        <Field
          label="מספר המוזמנים הכולל"
          hint="אופציונלי להמחשה בלבד — לא משמש לחישוב מכסת הרשומות."
          value={totalGuests}
          onChange={setTotalGuests}
          optional
        />
      </div>

      <div className="mt-5 rounded-2xl border border-[#E7D3B0] bg-white p-4 md:p-5">
        <p className="text-center">
          <span className="block text-xs font-black tracking-[0.12em] text-[#7A5530]">
            מכסת החבילה הנדרשת
          </span>
          <span className="mt-1 block text-4xl font-black tabular-nums text-[#2C241C] md:text-5xl">
            {result.billableRecords}
          </span>
          <span className="mt-1 block text-sm font-bold text-[#5E4735]">רשומות מחויבות</span>
        </p>

        <dl className="mt-5 grid gap-2.5 border-t border-[#EFE2CC] pt-4 text-sm">
          <div className="flex items-baseline justify-between gap-3">
            <dt className="font-bold text-[#5E4735]">רשומות שלא מנצלות את המכסה</dt>
            <dd className="font-black tabular-nums text-[#2C241C]">{result.nonBillableRecords}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="font-bold text-[#5E4735]">סך הרשומות ברשימה</dt>
            <dd className="font-black tabular-nums text-[#2C241C]">{result.totalRecords}</dd>
          </div>
          {result.totalGuests != null ? (
            <div className="flex items-baseline justify-between gap-3">
              <dt className="font-bold text-[#5E4735]">מספר המוזמנים הכולל</dt>
              <dd className="font-black tabular-nums text-[#2C241C]">{result.totalGuests}</dd>
            </div>
          ) : null}
        </dl>

        <p className="mt-4 rounded-xl bg-[#FBF6EE] px-3 py-2.5 text-xs font-semibold leading-5 text-[#5C4A3A]">
          לדוגמה: {result.billableRecords} עם טלפון + {result.nonBillableRecords} בלי טלפון ={" "}
          {result.totalRecords} ברשימה, אבל רק {result.billableRecords} במכסת החבילה.
        </p>

        {result.warnings.length > 0 ? (
          <ul className="mt-3 space-y-1.5 rounded-xl border border-[#E2B8B8] bg-[#F8EAEA] px-3 py-2.5 text-xs font-semibold leading-5 text-[#7A3535]">
            {result.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        ) : null}
      </div>

      <p className="mt-4 text-center text-sm leading-6 text-[#5C4A3A]">
        רוצים לראות מחיר לפי המכסה?{" "}
        <Link href="/pricing" className="font-black text-[#8A642E] underline-offset-4 hover:underline">
          למחשבון החבילות
        </Link>
      </p>
    </div>
  );
}
