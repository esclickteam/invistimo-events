"use client";

import { useMemo, useState } from "react";
import { computeGuarantee, type GuaranteeInputs } from "./calcLogic";

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
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div
      className={`flex items-baseline justify-between gap-4 border-b border-[#EFE2CC] py-3 last:border-0 ${
        emphasize ? "rounded-2xl bg-[#FBF6EE] px-3" : ""
      }`}
    >
      <span className="text-sm font-bold text-[#5E4735]">{label}</span>
      <span className={`text-lg font-black tabular-nums ${emphasize ? "text-[#2C241C]" : "text-[#35281F]"}`}>
        {value}
      </span>
    </div>
  );
}

function parseNum(raw: string) {
  const n = Number(String(raw).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export default function VenueGuaranteeCalculator() {
  const [totalInvited, setTotalInvited] = useState("400");
  const [almostCertain, setAlmostCertain] = useState("40");
  const [otherArrivalRatePct, setOtherArrivalRatePct] = useState("70");
  const [confirmed, setConfirmed] = useState("0");
  const [confirmedArrivalRatePct, setConfirmedArrivalRatePct] = useState("90");
  const [pending, setPending] = useState("0");
  const [venueMinCommitment, setVenueMinCommitment] = useState("240");
  const [reserveMeals, setReserveMeals] = useState("10");
  const [venueCapacity, setVenueCapacity] = useState("");
  const [mealPrice, setMealPrice] = useState("");

  const inputs: GuaranteeInputs = useMemo(
    () => ({
      totalInvited: parseNum(totalInvited),
      almostCertain: parseNum(almostCertain),
      otherArrivalRatePct: parseNum(otherArrivalRatePct),
      confirmed: parseNum(confirmed),
      confirmedArrivalRatePct: parseNum(confirmedArrivalRatePct),
      pending: parseNum(pending),
      venueMinCommitment: parseNum(venueMinCommitment),
      reserveMeals: parseNum(reserveMeals),
      venueCapacity: parseNum(venueCapacity),
      mealPrice: parseNum(mealPrice),
    }),
    [
      totalInvited,
      almostCertain,
      otherArrivalRatePct,
      confirmed,
      confirmedArrivalRatePct,
      pending,
      venueMinCommitment,
      reserveMeals,
      venueCapacity,
      mealPrice,
    ]
  );

  const result = useMemo(() => computeGuarantee(inputs), [inputs]);

  const formatIls = (n: number) =>
    new Intl.NumberFormat("he-IL", {
      style: "currency",
      currency: "ILS",
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <div
      id="venue-calculator"
      className="scroll-mt-24 rounded-[32px] border border-[#E6D2AA] bg-[#FFFDF8] p-5 shadow-[0_22px_50px_rgba(95,68,34,0.08)] md:p-8"
    >
      <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="מספר המוזמנים הכולל">
            <input
              inputMode="numeric"
              className={inputClass}
              value={totalInvited}
              onChange={(e) => setTotalInvited(e.target.value)}
            />
          </Field>
          <Field
            label="אורחים שהגעתם כמעט ודאית"
            hint="לפי היכרות אישית — נספרים במלואם בהערכה הראשונית"
          >
            <input
              inputMode="numeric"
              className={inputClass}
              value={almostCertain}
              onChange={(e) => setAlmostCertain(e.target.value)}
            />
          </Field>
          <Field
            label="שיעור הגעה ליתר המוזמנים (%)"
            hint="ברירת מחדל 70% — ניתן לשינוי. הנחת תכנון, לא הבטחה."
          >
            <input
              inputMode="decimal"
              className={inputClass}
              value={otherArrivalRatePct}
              onChange={(e) => setOtherArrivalRatePct(e.target.value)}
            />
          </Field>
          <Field
            label="אורחים שכבר אישרו הגעה"
            hint="אם עדיין לא התחילו אישורים — השאירו 0"
          >
            <input
              inputMode="numeric"
              className={inputClass}
              value={confirmed}
              onChange={(e) => setConfirmed(e.target.value)}
            />
          </Field>
          <Field
            label="שיעור הגעה צפוי מתוך המאשרים (%)"
            hint="ברירת מחדל 90% — מוחל רק על מאשרים, לא על אותה קבוצה פעמיים."
          >
            <input
              inputMode="decimal"
              className={inputClass}
              value={confirmedArrivalRatePct}
              onChange={(e) => setConfirmedArrivalRatePct(e.target.value)}
            />
          </Field>
          <Field label="אורחים שלא השיבו" hint="לא נספרים כמי שלא יגיעו">
            <input
              inputMode="numeric"
              className={inputClass}
              value={pending}
              onChange={(e) => setPending(e.target.value)}
            />
          </Field>
          <Field label="התחייבות מינימלית שהאולם מציע">
            <input
              inputMode="numeric"
              className={inputClass}
              value={venueMinCommitment}
              onChange={(e) => setVenueMinCommitment(e.target.value)}
            />
          </Field>
          <Field label="מנות רזרבה לתכנון">
            <input
              inputMode="numeric"
              className={inputClass}
              value={reserveMeals}
              onChange={(e) => setReserveMeals(e.target.value)}
            />
          </Field>
          <Field label="קיבולת מקסימלית של האולם" hint="אופציונלי">
            <input
              inputMode="numeric"
              className={inputClass}
              value={venueCapacity}
              onChange={(e) => setVenueCapacity(e.target.value)}
              placeholder="לא ידוע"
            />
          </Field>
          <Field label="מחיר מנה (₪)" hint="אופציונלי — לחישוב עלות מנות שלא נוצלו">
            <input
              inputMode="decimal"
              className={inputClass}
              value={mealPrice}
              onChange={(e) => setMealPrice(e.target.value)}
              placeholder="לדוגמה 320"
            />
          </Field>
        </div>

        <div className="flex flex-col rounded-[28px] border border-[#E6D2AA] bg-white p-5 md:p-6">
          <p className="text-sm font-black tracking-[0.12em] text-[#7A5530]">תוצאות תכנון</p>
          <p className="mt-2 text-sm leading-6 text-[#7A6042]">
            אין כאן המלצת התחייבות אוטומטית לפי אחוז בלבד — רק פירוק שקוף של ההערכות.
          </p>

          <div className="mt-4">
            <ResultRow label="הערכת הגעה ראשונית" value={`${result.initialEstimate}`} emphasize />
            <ResultRow
              label="הערכת הגעה מעודכנת (טווח)"
              value={`${result.updatedEstimateLow}–${result.updatedEstimateHigh}`}
            />
            <ResultRow label="נקודת אמצע לתכנון אחרי אישורים" value={`${result.updatedEstimateMid}`} />
            <ResultRow label="התחייבות מינימלית של האולם" value={`${result.venueMin}`} />
            <ResultRow label="תכנון כולל רזרבה" value={`${result.withReserve}`} emphasize />
            <ResultRow
              label="פער התחייבות מול צפי ראשוני"
              value={
                result.gapVenueVsInitial > 0
                  ? `+${result.gapVenueVsInitial} מנות מעל הצפי`
                  : result.gapVenueVsInitial < 0
                    ? `${Math.abs(result.gapVenueVsInitial)} מנות מתחת לצפי`
                    : "ללא פער"
              }
            />
            <ResultRow
              label="פער התחייבות מול צפי מעודכן"
              value={
                result.gapVenueVsUpdated > 0
                  ? `+${result.gapVenueVsUpdated} מנות מעל הצפי`
                  : result.gapVenueVsUpdated < 0
                    ? `${Math.abs(result.gapVenueVsUpdated)} מנות מתחת לצפי`
                    : "ללא פער"
              }
            />
            {result.unusedMealCostVsInitial != null ? (
              <ResultRow
                label="עלות פוטנציאלית מול צפי ראשוני"
                value={formatIls(result.unusedMealCostVsInitial)}
              />
            ) : null}
            {result.unusedMealCostVsUpdated != null ? (
              <ResultRow
                label="עלות פוטנציאלית מול צפי מעודכן"
                value={formatIls(result.unusedMealCostVsUpdated)}
              />
            ) : null}
            <ResultRow
              label="דוגמת פתיחה למשא ומתן (~40% מתחת למוזמנים)"
              value={`${result.negotiationExample}`}
            />
          </div>

          {result.warnings.length > 0 ? (
            <ul className="mt-5 space-y-2 rounded-2xl border border-[#E2B8B8] bg-[#F8EAEA] px-4 py-3 text-sm leading-6 text-[#7A3535]">
              {result.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          ) : null}

          <details className="mt-5 rounded-2xl border border-[#E7D3B0] bg-[#FBF6EE] px-4 py-3">
            <summary className="cursor-pointer text-sm font-black text-[#2C241C]">
              הנחות החישוב הגלויות
            </summary>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-[#5C4A3A]">
              {result.assumptions.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </details>

          <p className="mt-5 text-xs leading-5 text-[#8A6B45]">
            המחשבון מספק הערכת תכנון בלבד. ההתחייבות בפועל צריכה להתבסס על תנאי ההסכם, יכולת האולם
            ונתוני האירוע.
          </p>
        </div>
      </div>
    </div>
  );
}
