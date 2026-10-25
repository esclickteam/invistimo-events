"use client";

import Image from "next/image";
import { findBottle, PACKAGE_SIZE_OPTIONS } from "./bottleCatalog";
import type { DrinkPlanRow, SelectedDrink } from "./calcLogic";

const fieldClass =
  "min-h-12 w-full rounded-2xl border border-[#E6D2AA] bg-white px-3 text-base font-semibold tabular-nums text-[#2C241C] outline-none transition focus:border-[#C9A45C] focus:ring-2 focus:ring-[#C9A45C]/30";

function formatIls(n: number) {
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  }).format(n);
}

function parseNum(raw: string) {
  if (raw.trim() === "") return 0;
  const n = Number(String(raw).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function QtyStepper({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (n: number) => void;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2" role="group" aria-label={label}>
      <button
        type="button"
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#E6D2AA] bg-[#FFF8EA] text-xl font-black text-[#5E4735] transition hover:bg-white"
        aria-label="הקטנה"
        onClick={() => onChange(Math.max(0, value - 1))}
      >
        −
      </button>
      <input
        inputMode="numeric"
        className={`${fieldClass} max-w-[7rem] text-center`}
        value={value}
        onChange={(e) => onChange(Math.max(0, parseNum(e.target.value)))}
        aria-label={label}
      />
      <button
        type="button"
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#E6D2AA] bg-[#FFF8EA] text-xl font-black text-[#5E4735] transition hover:bg-white"
        aria-label="הגדלה"
        onClick={() => onChange(value + 1)}
      >
        +
      </button>
    </div>
  );
}

function RecommendInfo({ row }: { row: DrinkPlanRow }) {
  const text = [
    row.plannedUnitsLow === row.plannedUnitsHigh
      ? `המלצת תכנון: ${row.plannedUnitsMid} יחידות.`
      : `המלצת תכנון: ${row.plannedUnitsLow}–${row.plannedUnitsHigh} יחידות.`,
    row.venueIncludedUnits > 0 ? `כלול באולם: ${row.venueIncludedUnits}.` : null,
    ...row.notes,
    "ההערכה משתנה לפי קהל, גילאים, משך האירוע וסוגי המשקאות.",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <details className="relative inline-block print:hidden">
      <summary
        className="flex h-7 w-7 cursor-pointer list-none items-center justify-center rounded-full border border-[#E6D2AA] bg-white text-xs font-black text-[#8A642E]"
        aria-label="מידע על ההמלצה"
      >
        i
      </summary>
      <p className="absolute z-20 mt-2 w-64 rounded-2xl border border-[#E6D2AA] bg-white p-3 text-xs leading-5 text-[#5C4A3A] shadow-lg">
        {text}
      </p>
    </details>
  );
}

function DrinkThumb({ drink }: { drink: SelectedDrink }) {
  const cat = drink.catalogId ? findBottle(drink.catalogId) : null;
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="relative flex h-16 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-b from-[#FFFDF8] to-[#F7EFE0]">
        {cat ? (
          <Image
            src={cat.imageSrc}
            alt={cat.imageAlt}
            width={56}
            height={72}
            className="max-h-14 w-auto object-contain"
          />
        ) : (
          <span className="text-[10px] font-bold text-[#C9A45C]">בקבוק</span>
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-base font-black text-[#2C241C]">{drink.label}</p>
        {cat ? (
          <p className="truncate text-xs font-semibold text-[#8A6B45]">{cat.styleHe}</p>
        ) : null}
      </div>
    </div>
  );
}

export default function DrinkResults({
  rows,
  drinks,
  onUpdate,
  onRemove,
}: {
  rows: DrinkPlanRow[];
  drinks: SelectedDrink[];
  onUpdate: (id: string, patch: Partial<SelectedDrink>) => void;
  onRemove: (id: string) => void;
}) {
  if (!rows.length) {
    return (
      <p className="text-sm text-[#7A6042]">
        בחרו משקאות בשלב «משקאות» כדי לראות כמויות ותכנון רכישה.
      </p>
    );
  }

  const priced = rows.filter((r) => r.costMid != null);
  const total = priced.length ? priced.reduce((s, r) => s + (r.costMid || 0), 0) : null;
  const missing = rows.some((r) => r.toPurchaseMid > 0 && r.unitPrice == null);

  return (
    <div className="grid gap-5">
      <p className="rounded-2xl border border-[#EAD9B8] bg-[#FFF8EA]/70 px-4 py-3 text-sm leading-6 text-[#5C4A3A]">
        הכמויות הן הערכה לתכנון רכישה בלבד. הצריכה בפועל משתנה לפי סוג הקהל, מספר המשתתפים,
        גילאים, שעות האירוע, משך האירוע וסוגי המשקאות. אין כאן מחירי שוק מוכנים מראש.
      </p>

      {/* Desktop table */}
      <div className="hidden lg:block">
        <div className="overflow-hidden rounded-[28px] border border-[#E6D2AA] bg-white">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-[#FFF8EA] text-right text-xs font-black tracking-wide text-[#8A6B45]">
                <th className="px-5 py-4 font-black">משקה</th>
                <th className="px-4 py-4 font-black">נפח</th>
                <th className="px-4 py-4 font-black">כמות מומלצת</th>
                <th className="px-4 py-4 font-black">כמות לרכישה</th>
                <th className="px-4 py-4 font-black">מחיר לבקבוק</th>
                <th className="px-5 py-4 font-black">עלות כוללת</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const drink = drinks.find((d) => d.id === row.drinkId);
                if (!drink) return null;
                const purchase = row.toPurchaseMid;
                const sizeOptions = PACKAGE_SIZE_OPTIONS.includes(
                  drink.packageMl as (typeof PACKAGE_SIZE_OPTIONS)[number]
                )
                  ? PACKAGE_SIZE_OPTIONS
                  : ([drink.packageMl, ...PACKAGE_SIZE_OPTIONS] as number[]);

                return (
                  <tr key={row.drinkId} className="border-t border-[#F0E2C8] align-middle">
                    <td className="px-5 py-5">
                      <DrinkThumb drink={drink} />
                      <button
                        type="button"
                        className="mt-2 text-xs font-bold text-[#8A642E] underline-offset-2 hover:underline"
                        onClick={() => onRemove(row.drinkId)}
                      >
                        הסרה
                      </button>
                    </td>
                    <td className="px-4 py-5">
                      <select
                        className={`${fieldClass} min-w-[7.5rem]`}
                        value={drink.packageMl}
                        onChange={(e) =>
                          onUpdate(row.drinkId, { packageMl: parseNum(e.target.value) })
                        }
                      >
                        {sizeOptions.map((ml) => (
                          <option key={ml} value={ml}>
                            {ml >= 1000 ? `${ml / 1000} ל׳` : `${ml} מ״ל`}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-5">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black tabular-nums text-[#35281F]">
                          {row.plannedUnitsLow === row.plannedUnitsHigh
                            ? row.plannedUnitsMid
                            : `${row.plannedUnitsLow}–${row.plannedUnitsHigh}`}
                        </span>
                        <RecommendInfo row={row} />
                      </div>
                    </td>
                    <td className="px-4 py-5">
                      <input
                        inputMode="numeric"
                        className={`${fieldClass} max-w-[8rem]`}
                        value={
                          drink.manualPurchaseUnits != null
                            ? drink.manualPurchaseUnits
                            : purchase
                        }
                        onChange={(e) => {
                          const raw = e.target.value;
                          onUpdate(row.drinkId, {
                            manualPurchaseUnits:
                              raw.trim() === "" ? null : Math.max(0, parseNum(raw)),
                          });
                        }}
                        aria-label={`כמות לרכישה ל${row.label}`}
                      />
                    </td>
                    <td className="px-4 py-5">
                      <div className="relative max-w-[9rem]">
                        <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-sm font-bold text-[#8A6B45]">
                          ₪
                        </span>
                        <input
                          inputMode="decimal"
                          className={`${fieldClass} pe-8`}
                          placeholder="הזינו מחיר"
                          value={drink.unitPrice ?? ""}
                          onChange={(e) => {
                            const raw = e.target.value;
                            onUpdate(row.drinkId, {
                              unitPrice: raw.trim() === "" ? null : parseNum(raw),
                            });
                          }}
                          aria-label={`מחיר לבקבוק ל${row.label}`}
                        />
                      </div>
                    </td>
                    <td className="px-5 py-5 text-lg font-black tabular-nums text-[#2C241C]">
                      {row.costMid != null ? formatIls(row.costMid) : (
                        <span className="text-sm font-semibold text-[#8A6B45]">לא הוזן מחיר</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <ul className="grid gap-4 lg:hidden">
        {rows.map((row) => {
          const drink = drinks.find((d) => d.id === row.drinkId);
          if (!drink) return null;
          const purchase =
            drink.manualPurchaseUnits != null ? drink.manualPurchaseUnits : row.toPurchaseMid;
          const sizeOptions = PACKAGE_SIZE_OPTIONS.includes(
            drink.packageMl as (typeof PACKAGE_SIZE_OPTIONS)[number]
          )
            ? PACKAGE_SIZE_OPTIONS
            : ([drink.packageMl, ...PACKAGE_SIZE_OPTIONS] as number[]);

          return (
            <li
              key={row.drinkId}
              className="rounded-[28px] border border-[#E6D2AA] bg-white p-4 shadow-[0_10px_28px_rgba(95,68,34,0.06)]"
            >
              <div className="flex items-start justify-between gap-3">
                <DrinkThumb drink={drink} />
                <button
                  type="button"
                  className="text-xs font-bold text-[#8A642E]"
                  onClick={() => onRemove(row.drinkId)}
                >
                  הסרה
                </button>
              </div>

              <div className="mt-4 grid gap-3">
                <label className="grid gap-1.5 text-xs font-bold text-[#8A6B45]">
                  נפח
                  <select
                    className={fieldClass}
                    value={drink.packageMl}
                    onChange={(e) =>
                      onUpdate(row.drinkId, { packageMl: parseNum(e.target.value) })
                    }
                  >
                    {sizeOptions.map((ml) => (
                      <option key={ml} value={ml}>
                        {ml >= 1000 ? `${ml / 1000} ל׳` : `${ml} מ״ל`}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="flex items-center justify-between gap-2 rounded-2xl bg-[#FFF8EA] px-3 py-3">
                  <div>
                    <p className="text-xs font-bold text-[#8A6B45]">כמות מומלצת</p>
                    <p className="mt-1 text-lg font-black tabular-nums text-[#2C241C]">
                      {row.plannedUnitsLow === row.plannedUnitsHigh
                        ? row.plannedUnitsMid
                        : `${row.plannedUnitsLow}–${row.plannedUnitsHigh}`}
                    </p>
                  </div>
                  <RecommendInfo row={row} />
                </div>

                <label className="grid gap-1.5 text-xs font-bold text-[#8A6B45]">
                  כמות לרכישה
                  <QtyStepper
                    value={purchase}
                    label={`כמות לרכישה ל${row.label}`}
                    onChange={(n) => onUpdate(row.drinkId, { manualPurchaseUnits: n })}
                  />
                </label>

                <label className="grid gap-1.5 text-xs font-bold text-[#8A6B45]">
                  מחיר ליחידה (₪)
                  <input
                    inputMode="decimal"
                    className={fieldClass}
                    placeholder="הזינו מחיר מההצעה שלכם"
                    value={drink.unitPrice ?? ""}
                    onChange={(e) => {
                      const raw = e.target.value;
                      onUpdate(row.drinkId, {
                        unitPrice: raw.trim() === "" ? null : parseNum(raw),
                      });
                    }}
                  />
                </label>

                <div className="flex items-center justify-between border-t border-[#F0E2C8] pt-3">
                  <span className="text-sm font-bold text-[#8A6B45]">סה״כ עלות</span>
                  <span className="text-xl font-black tabular-nums text-[#2C241C]">
                    {row.costMid != null ? formatIls(row.costMid) : "—"}
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="rounded-[28px] border border-[#C9A45C]/45 bg-gradient-to-l from-[#FFF8EA] via-white to-[#F7E8CA] px-5 py-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-[#8A6B45]">סיכום עלויות הבקבוקים</p>
            <p className="mt-1 text-2xl font-black tabular-nums text-[#2C241C]">
              {total != null ? formatIls(total) : "חסרים מחירים"}
            </p>
          </div>
          {missing ? (
            <p className="max-w-sm text-xs leading-5 text-[#8A6B45]">
              למשקאות בלי מחיר לא מוצגת עלות — הזינו מחיר מההצעה שלכם כדי לראות סיכום מלא.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
