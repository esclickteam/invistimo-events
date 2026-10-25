"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { computeRecordsQuota } from "./calcLogic";

const inputClass =
  "min-h-12 w-full rounded-2xl border border-[#E6D2AA] bg-white px-4 text-base font-semibold text-[#2C241C] tabular-nums";

function parseNum(raw: string) {
  const n = Number(String(raw).replace(/[^\d]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export default function RecordsCalculator() {
  const [withPhoneRecords, setWithPhoneRecords] = useState("250");
  const [withoutPhoneRecords, setWithoutPhoneRecords] = useState("30");
  const [peopleWithPhone, setPeopleWithPhone] = useState("320");
  const [peopleWithoutPhone, setPeopleWithoutPhone] = useState("45");

  const result = useMemo(
    () =>
      computeRecordsQuota({
        withPhoneRecords: parseNum(withPhoneRecords),
        withoutPhoneRecords: parseNum(withoutPhoneRecords),
        peopleWithPhone: parseNum(peopleWithPhone),
        peopleWithoutPhone: parseNum(peopleWithoutPhone),
      }),
    [withPhoneRecords, withoutPhoneRecords, peopleWithPhone, peopleWithoutPhone]
  );

  return (
    <div
      id="records-calculator"
      className="scroll-mt-24 rounded-[32px] border border-[#E6D2AA] bg-[#FFFDF8] p-5 shadow-[0_22px_50px_rgba(95,68,34,0.08)] md:p-8"
    >
      <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-bold text-[#5E4735]">
            רשומות עם מספר טלפון
            <input
              inputMode="numeric"
              className={inputClass}
              value={withPhoneRecords}
              onChange={(e) => setWithPhoneRecords(e.target.value)}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-bold text-[#5E4735]">
            רשומות ללא מספר טלפון
            <input
              inputMode="numeric"
              className={inputClass}
              value={withoutPhoneRecords}
              onChange={(e) => setWithoutPhoneRecords(e.target.value)}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-bold text-[#5E4735]">
            אנשים ברשומות עם טלפון
            <input
              inputMode="numeric"
              className={inputClass}
              value={peopleWithPhone}
              onChange={(e) => setPeopleWithPhone(e.target.value)}
            />
            <span className="text-xs font-semibold text-[#8A6B45]">
              סכום האנשים בכל הרשומות עם טלפון — לא מספר הרשומות
            </span>
          </label>
          <label className="grid gap-1.5 text-sm font-bold text-[#5E4735]">
            אנשים ברשומות בלי טלפון
            <input
              inputMode="numeric"
              className={inputClass}
              value={peopleWithoutPhone}
              onChange={(e) => setPeopleWithoutPhone(e.target.value)}
            />
          </label>
        </div>

        <div className="rounded-[28px] border border-[#E6D2AA] bg-white p-5 md:p-6">
          <p className="text-sm font-black tracking-[0.12em] text-[#7A5530]">תוצאות ספירה</p>
          <dl className="mt-4 space-y-3">
            {[
              ["סך הרשומות ברשימה", result.totalRecords],
              ["מספר הרשומות המחויבות", result.billableRecords],
              ["רשומות שלא נגרעות מהמכסה", result.nonBillableRecords],
              ["מספר האורחים הכולל", result.totalPeople],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="flex items-baseline justify-between gap-3 border-b border-[#EFE2CC] pb-3 last:border-0"
              >
                <dt className="text-sm font-bold text-[#5E4735]">{label}</dt>
                <dd className="text-xl font-black tabular-nums text-[#2C241C]">{value}</dd>
              </div>
            ))}
          </dl>

          <p className="mt-5 rounded-2xl border border-[#E7D3B0] bg-[#FBF6EE] px-4 py-3 text-sm font-bold leading-6 text-[#2C241C]">
            מכסת חבילה נדרשת: {result.billableRecords} רשומות
          </p>

          {result.warnings.length > 0 ? (
            <ul className="mt-4 space-y-2 text-sm leading-6 text-[#7A3535]">
              {result.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          ) : null}

          <ul className="mt-4 space-y-1.5 text-xs leading-5 text-[#8A6B45]">
            {result.assumptions.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>

          <p className="mt-5 text-sm leading-6 text-[#5C4A3A]">
            רוצים לראות מחיר לפי המכסה הזו?{" "}
            <Link href="/pricing" className="font-black text-[#8A642E] underline-offset-4 hover:underline">
              למחשבון החבילות החי
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
