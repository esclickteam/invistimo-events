"use client";

import { useEffect, useMemo, useState } from "react";
import TrackedCtaLink from "@/components/seo/TrackedCtaLink";
import ArrivalMap from "./ArrivalMap";
import {
  BUILTIN_GROUPS,
  CUSTOM_DEFAULT_BAND,
  DAY_LABEL,
  DEFAULT_COUNTS,
  DISTANCE_LABEL,
  PENDING_DEFAULT_BAND,
  SEASON_LABEL,
  SHOW_UP_DEFAULT,
  UNDECIDED_DEFAULT_BAND,
  computeArrival,
  decodeArrivalQuery,
  encodeArrivalQuery,
  type BuiltinGroupId,
  type Distance,
  type GroupInput,
  type Season,
  type SharePayload,
  type Weekday,
} from "./calcLogic";

const PATH = "/info/guides/wedding-venue-guest-guarantee";

const inputClass =
  "min-h-11 w-full rounded-none border border-[#E4D3B8] bg-white px-3 text-base font-semibold text-[#2C241C] tabular-nums outline-none transition-[border-color] duration-200 focus:border-[#A68448]";
const selectClass = inputClass;
const primaryBtn =
  "inline-flex min-h-11 items-center justify-center rounded-none bg-[#42182F] px-5 text-sm font-bold text-white transition-colors hover:bg-[#6A2A42]";
const secondaryBtn =
  "inline-flex min-h-11 items-center justify-center rounded-none border border-[#D9C4A4] bg-white px-5 text-sm font-bold text-[#5E4735] transition-colors hover:border-[#A68448]";

type RateFields = { low: string; mid: string; high: string };
type CustomGroup = { id: string; label: string; count: string; low: string; mid: string; high: string };
type FormState = {
  counts: Record<BuiltinGroupId, string>;
  rates: Record<BuiltinGroupId, RateFields>;
  custom: CustomGroup[];
  weekday: Weekday | "";
  season: Season | "";
  distance: Distance | "";
  confirmed: string;
  declined: string;
  pending: string;
  undecided: string;
  showUp: string;
  pendingBand: RateFields;
  undecidedBand: RateFields;
  venueMin: string;
  capacity: string;
  reserves: string;
  mealPrice: string;
  extraMealPrice: string;
  seats: string;
};

type SnapshotResponse = {
  signedIn?: boolean;
  found?: boolean;
  invited?: number;
  confirmed?: number;
  declined?: number;
  undecided?: number;
  pending?: number;
  groups?: Partial<Record<BuiltinGroupId, number>>;
  unassigned?: number;
  weekday?: Weekday | null;
  season?: Season | null;
};

function bandToFields(band: { low: number; mid: number; high: number }): RateFields {
  return { low: String(band.low), mid: String(band.mid), high: String(band.high) };
}

function defaultForm(): FormState {
  const counts = {} as Record<BuiltinGroupId, string>;
  const rates = {} as Record<BuiltinGroupId, RateFields>;
  for (const group of BUILTIN_GROUPS) {
    counts[group.id] = String(DEFAULT_COUNTS[group.id]);
    rates[group.id] = { low: String(group.low), mid: String(group.mid), high: String(group.high) };
  }
  return {
    counts,
    rates,
    custom: [],
    weekday: "",
    season: "",
    distance: "",
    confirmed: "0",
    declined: "0",
    pending: "0",
    undecided: "0",
    showUp: String(SHOW_UP_DEFAULT),
    pendingBand: bandToFields(PENDING_DEFAULT_BAND),
    undecidedBand: bandToFields(UNDECIDED_DEFAULT_BAND),
    venueMin: "",
    capacity: "",
    reserves: "0",
    mealPrice: "",
    extraMealPrice: "",
    seats: "10",
  };
}

function countFrom(raw: string) {
  if (!raw.trim()) return 0;
  const parsed = Number(String(raw).replace(/[^\d.]/g, ""));
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.floor(parsed);
}

function percentFrom(raw: string, fallback: number) {
  if (!raw.trim()) return fallback;
  const parsed = Number(String(raw).replace(/[^\d.]/g, ""));
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(100, Math.max(0, parsed));
}

function optionalCount(raw: string) {
  if (!raw.trim()) return null;
  return countFrom(raw);
}

function formToPayload(form: FormState): SharePayload {
  const groups: GroupInput[] = BUILTIN_GROUPS.map((group) => ({
    id: group.id,
    label: group.label,
    count: countFrom(form.counts[group.id]),
    lowPct: percentFrom(form.rates[group.id].low, group.low),
    midPct: percentFrom(form.rates[group.id].mid, group.mid),
    highPct: percentFrom(form.rates[group.id].high, group.high),
  }));
  for (const group of form.custom) {
    groups.push({
      id: group.id,
      label: group.label.trim() || "קבוצה אישית",
      count: countFrom(group.count),
      lowPct: percentFrom(group.low, CUSTOM_DEFAULT_BAND.low),
      midPct: percentFrom(group.mid, CUSTOM_DEFAULT_BAND.mid),
      highPct: percentFrom(group.high, CUSTOM_DEFAULT_BAND.high),
    });
  }
  return {
    groups,
    weekday: form.weekday,
    season: form.season,
    distance: form.distance,
    confirmed: countFrom(form.confirmed),
    declined: countFrom(form.declined),
    pending: countFrom(form.pending),
    undecided: countFrom(form.undecided),
    showUpPct: percentFrom(form.showUp, SHOW_UP_DEFAULT),
    pendingBand: {
      low: percentFrom(form.pendingBand.low, PENDING_DEFAULT_BAND.low),
      mid: percentFrom(form.pendingBand.mid, PENDING_DEFAULT_BAND.mid),
      high: percentFrom(form.pendingBand.high, PENDING_DEFAULT_BAND.high),
    },
    undecidedBand: {
      low: percentFrom(form.undecidedBand.low, UNDECIDED_DEFAULT_BAND.low),
      mid: percentFrom(form.undecidedBand.mid, UNDECIDED_DEFAULT_BAND.mid),
      high: percentFrom(form.undecidedBand.high, UNDECIDED_DEFAULT_BAND.high),
    },
    venueMin: optionalCount(form.venueMin),
    capacity: optionalCount(form.capacity),
    reserveMeals: countFrom(form.reserves),
    mealPrice: optionalCount(form.mealPrice),
    extraMealPrice: optionalCount(form.extraMealPrice),
    seatsPerTable: Math.min(16, Math.max(4, countFrom(form.seats) || 10)),
  };
}

function payloadToForm(payload: SharePayload): FormState {
  const base = defaultForm();
  for (const group of BUILTIN_GROUPS) {
    const found = payload.groups.find((item) => item.id === group.id);
    if (!found) continue;
    base.counts[group.id] = String(found.count);
    base.rates[group.id] = { low: String(found.lowPct), mid: String(found.midPct), high: String(found.highPct) };
  }
  base.custom = payload.groups
    .filter((group) => !BUILTIN_GROUPS.some((item) => item.id === group.id))
    .map((group) => ({
      id: group.id,
      label: group.label,
      count: String(group.count),
      low: String(group.lowPct),
      mid: String(group.midPct),
      high: String(group.highPct),
    }));
  base.weekday = payload.weekday;
  base.season = payload.season;
  base.distance = payload.distance;
  base.confirmed = String(payload.confirmed);
  base.declined = String(payload.declined);
  base.pending = String(payload.pending);
  base.undecided = String(payload.undecided);
  base.showUp = String(payload.showUpPct);
  base.pendingBand = bandToFields(payload.pendingBand);
  base.undecidedBand = bandToFields(payload.undecidedBand);
  base.venueMin = payload.venueMin == null ? "" : String(payload.venueMin);
  base.capacity = payload.capacity == null ? "" : String(payload.capacity);
  base.reserves = String(payload.reserveMeals);
  base.mealPrice = payload.mealPrice == null ? "" : String(payload.mealPrice);
  base.extraMealPrice = payload.extraMealPrice == null ? "" : String(payload.extraMealPrice);
  base.seats = String(payload.seatsPerTable);
  return base;
}

function formatPeople(value: number) {
  return value.toLocaleString("he-IL");
}

function formatIls(value: number) {
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  }).format(value);
}

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

function ResultLine({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="border-b border-[#EFE2CC] py-3 last:border-0">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-sm font-bold text-[#5E4735]">{label}</span>
        <span className="text-lg font-black tabular-nums text-[#2C241C]">{value}</span>
      </div>
      {note ? <p className="mt-1 text-xs leading-5 text-[#8A6B45]">{note}</p> : null}
    </div>
  );
}

export default function VenueGuaranteeCalculator() {
  const [form, setForm] = useState<FormState>(defaultForm);
  const [signedIn, setSignedIn] = useState(false);
  const [loadNote, setLoadNote] = useState("");
  const [shareNote, setShareNote] = useState("");
  const [shareUrl, setShareUrl] = useState("");

  useEffect(() => {
    const saved = decodeArrivalQuery(window.location.search);
    if (saved) setForm(payloadToForm(saved));
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/planning/arrival-snapshot?probe=1", { credentials: "same-origin" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { signedIn?: boolean } | null) => {
        if (!cancelled && data?.signedIn) setSignedIn(true);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const payload = useMemo(() => formToPayload(form), [form]);
  const result = useMemo(() => computeArrival(payload), [payload]);

  function patch(partial: Partial<FormState>) {
    setForm((current) => ({ ...current, ...partial }));
    setShareNote("");
  }

  async function copyShareLink() {
    const query = encodeArrivalQuery(payload);
    const url = new URL(window.location.href);
    url.search = query;
    url.hash = "venue-calculator";
    const href = url.toString();
    setShareUrl(href);
    try {
      await navigator.clipboard.writeText(href);
      setShareNote("הקישור הועתק. הוא כולל את המספרים וההנחות, בלי שמות אורחים.");
    } catch {
      setShareNote("אפשר להעתיק את הקישור מכאן.");
    }
  }

  async function loadEventSummary() {
    setLoadNote("טוענים סיכום מספרי…");
    try {
      const response = await fetch("/api/planning/arrival-snapshot", { credentials: "same-origin" });
      if (response.status === 401) {
        setSignedIn(false);
        setLoadNote("כדי לטעון נתונים מהאירוע צריך להתחבר.");
        return;
      }
      const data = (await response.json()) as SnapshotResponse;
      if (!data.found) {
        setLoadNote("לא מצאנו אירוע עם מוזמנים בחשבון הזה. הנתונים במחשבון לא השתנו.");
        return;
      }
      setForm((current) => {
        const next = { ...current, counts: { ...current.counts }, custom: [] as CustomGroup[] };
        for (const group of BUILTIN_GROUPS) {
          next.counts[group.id] = String(data.groups?.[group.id] || 0);
        }
        if ((data.unassigned || 0) > 0) {
          next.custom = [
            {
              id: "event-unassigned",
              label: "מוזמנים ללא קבוצה מוכרת",
              count: String(data.unassigned),
              low: String(CUSTOM_DEFAULT_BAND.low),
              mid: String(CUSTOM_DEFAULT_BAND.mid),
              high: String(CUSTOM_DEFAULT_BAND.high),
            },
          ];
        }
        next.confirmed = String(data.confirmed || 0);
        next.declined = String(data.declined || 0);
        next.pending = String(data.pending || 0);
        next.undecided = String(data.undecided || 0);
        if (data.weekday) next.weekday = data.weekday;
        if (data.season) next.season = data.season;
        return next;
      });
      setLoadNote("נטען סיכום מספרי בלבד. פרטי אורחים לא הועתקו, וסקיצת ההושבה לא השתנתה.");
    } catch {
      setLoadNote("לא הצלחנו לטעון את הסיכום. אפשר להמשיך להזין ידנית.");
    }
  }

  const unusedText = (() => {
    if (result.contractMissing) return "אין נתון חוזה, ולכן אין אומדן עלות מול התחייבות.";
    if (result.unusedMeals == null) return "לפי ההערכה המרכזית אין מנות עודפות מול ההתחייבות.";
    if (result.unusedCost == null) return `${formatPeople(result.unusedMeals)} מנות. חסר מחיר מנה כדי לחשב עלות.`;
    return `${formatPeople(result.unusedMeals)} מנות · ${formatIls(result.unusedCost)}`;
  })();

  const extraText =
    result.extraMeals != null && result.extraMeals > 0
      ? result.extraCost != null
        ? `${formatPeople(result.extraMeals)} מנות מעל ההתחייבות · ${formatIls(result.extraCost)}`
        : `${formatPeople(result.extraMeals)} מנות מעל ההתחייבות. חסר מחיר מנה נוספת.`
      : "";

  return (
    <div id="venue-calculator" className="scroll-mt-24 border border-[#E4D2B6] border-t-2 border-t-[#C6A15A] bg-[#FBF7F0] p-4 md:p-6">
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className="grid min-w-0 gap-5">
          <section className="border border-[#E7D6BC] bg-[#FFFDF8] p-4 md:p-5" aria-labelledby="guest-inputs">
            <h3 id="guest-inputs" className="text-xl font-black text-[#2C241C]">
              נתוני מוזמנים
            </h3>
            <p className="mt-2 text-sm leading-6 text-[#5C4A3A]">
              המספרים בשדות הם דוגמה. מחליפים אותם ברשימה שלכם. סך המוזמנים הוא סכום הקבוצות.
            </p>
            <div className="mt-4 grid gap-4">
              {BUILTIN_GROUPS.map((group) => (
                <div key={group.id} className="grid gap-2 border border-[#F0E4D0] p-3">
                  <div className="grid gap-2 sm:grid-cols-[1fr_7rem_6rem]">
                    <span className="self-center text-sm font-bold text-[#3A2433]">{group.label}</span>
                    <label className="grid gap-1 text-xs font-bold text-[#8A6B45]">
                      אנשים
                      <input
                        inputMode="numeric"
                        className={inputClass}
                        value={form.counts[group.id]}
                        onChange={(event) =>
                          patch({ counts: { ...form.counts, [group.id]: event.target.value } })
                        }
                      />
                    </label>
                    <label className="grid gap-1 text-xs font-bold text-[#8A6B45]">
                      צפי %
                      <input
                        inputMode="decimal"
                        aria-label={`אחוז צפי ל${group.label}`}
                        className={inputClass}
                        value={form.rates[group.id].mid}
                        onChange={(event) =>
                          patch({
                            rates: {
                              ...form.rates,
                              [group.id]: { ...form.rates[group.id], mid: event.target.value },
                            },
                          })
                        }
                      />
                    </label>
                  </div>
                  <details className="text-xs text-[#7A6042]">
                    <summary className="cursor-pointer font-bold">טווח אחוזים לקבוצה</summary>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <label className="grid gap-1 font-bold">
                        קצה נמוך
                        <input
                          inputMode="decimal"
                          className={inputClass}
                          value={form.rates[group.id].low}
                          onChange={(event) =>
                            patch({
                              rates: {
                                ...form.rates,
                                [group.id]: { ...form.rates[group.id], low: event.target.value },
                              },
                            })
                          }
                        />
                      </label>
                      <label className="grid gap-1 font-bold">
                        קצה גבוה
                        <input
                          inputMode="decimal"
                          className={inputClass}
                          value={form.rates[group.id].high}
                          onChange={(event) =>
                            patch({
                              rates: {
                                ...form.rates,
                                [group.id]: { ...form.rates[group.id], high: event.target.value },
                              },
                            })
                          }
                        />
                      </label>
                    </div>
                  </details>
                </div>
              ))}
            </div>

            {form.custom.map((group) => (
              <div key={group.id} className="mt-4 grid gap-2 border border-[#E7C9D2] p-3">
                <div className="grid gap-2 sm:grid-cols-[1fr_7rem_auto]">
                  <label className="grid gap-1 text-xs font-bold text-[#8A6B45]">
                    שם הקבוצה
                    <input
                      className={inputClass}
                      value={group.label}
                      maxLength={40}
                      onChange={(event) =>
                        patch({
                          custom: form.custom.map((item) =>
                            item.id === group.id ? { ...item, label: event.target.value } : item
                          ),
                        })
                      }
                    />
                  </label>
                  <label className="grid gap-1 text-xs font-bold text-[#8A6B45]">
                    אנשים
                    <input
                      inputMode="numeric"
                      className={inputClass}
                      value={group.count}
                      onChange={(event) =>
                        patch({
                          custom: form.custom.map((item) =>
                            item.id === group.id ? { ...item, count: event.target.value } : item
                          ),
                        })
                      }
                    />
                  </label>
                  <button
                    type="button"
                    className="self-end min-h-11 rounded-none border border-[#E4D3B8] px-3 text-sm font-bold text-[#6A2A42]"
                    onClick={() => patch({ custom: form.custom.filter((item) => item.id !== group.id) })}
                  >
                    הסרה
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ["low", "נמוך"],
                      ["mid", "אמצע"],
                      ["high", "גבוה"],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key} className="grid gap-1 text-xs font-bold text-[#8A6B45]">
                      {label} %
                      <input
                        inputMode="decimal"
                        className={inputClass}
                        value={group[key]}
                        onChange={(event) =>
                          patch({
                            custom: form.custom.map((item) =>
                              item.id === group.id ? { ...item, [key]: event.target.value } : item
                            ),
                          })
                        }
                      />
                    </label>
                  ))}
                </div>
              </div>
            ))}

            <button
              type="button"
              className={`${secondaryBtn} mt-4`}
              onClick={() =>
                patch({
                  custom: [
                    ...form.custom,
                    {
                      id: `custom-${Date.now()}`,
                      label: "",
                      count: "",
                      low: String(CUSTOM_DEFAULT_BAND.low),
                      mid: String(CUSTOM_DEFAULT_BAND.mid),
                      high: String(CUSTOM_DEFAULT_BAND.high),
                    },
                  ],
                })
              }
            >
              הוספת קבוצה אישית
            </button>
          </section>

          <section className="border border-[#E7D6BC] bg-[#FFFDF8] p-4 md:p-5" aria-labelledby="event-inputs">
            <h3 id="event-inputs" className="text-xl font-black text-[#2C241C]">
              נתוני האירוע
            </h3>
            <p className="mt-2 text-sm leading-6 text-[#5C4A3A]">
              יום, עונה ומרחק מזיזים את התחזית בלבד. אישור שכבר התקבל לא משתנה בגללם.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Field label="יום בשבוע">
                <select
                  className={selectClass}
                  value={form.weekday}
                  onChange={(event) => patch({ weekday: event.target.value as Weekday | "" })}
                >
                  <option value="">לא נבחר</option>
                  {(Object.keys(DAY_LABEL) as Weekday[]).map((day) => (
                    <option key={day} value={day}>
                      {DAY_LABEL[day]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="עונה">
                <select
                  className={selectClass}
                  value={form.season}
                  onChange={(event) => patch({ season: event.target.value as Season | "" })}
                >
                  <option value="">לא נבחרה</option>
                  {(Object.keys(SEASON_LABEL) as Season[]).map((season) => (
                    <option key={season} value={season}>
                      {SEASON_LABEL[season]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="מרחק ומיקום">
                <select
                  className={selectClass}
                  value={form.distance}
                  onChange={(event) => patch({ distance: event.target.value as Distance | "" })}
                >
                  <option value="">לא נבחר</option>
                  {(Object.keys(DISTANCE_LABEL) as Distance[]).map((distance) => (
                    <option key={distance} value={distance}>
                      {DISTANCE_LABEL[distance]}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="אישרו הגעה" hint="נתון שהתקבל, לא תחזית">
                <input className={inputClass} inputMode="numeric" value={form.confirmed} onChange={(event) => patch({ confirmed: event.target.value })} />
              </Field>
              <Field label="שיעור הופעה מתוך המאשרים (%)" hint="ברירת מחדל 96%. הטווח הוא ארבע נקודות מכל צד.">
                <input className={inputClass} inputMode="decimal" value={form.showUp} onChange={(event) => patch({ showUp: event.target.value })} />
              </Field>
              <Field label="סירבו" hint="לא נספרים כמגיעים">
                <input className={inputClass} inputMode="numeric" value={form.declined} onChange={(event) => patch({ declined: event.target.value })} />
              </Field>
              <Field label="ממתינים" hint="עוד לא ענו. לא נספרים כסירוב.">
                <input className={inputClass} inputMode="numeric" value={form.pending} onChange={(event) => patch({ pending: event.target.value })} />
              </Field>
              <Field label="מתלבטים" hint="ענו שהם עדיין לא סגורים">
                <input className={inputClass} inputMode="numeric" value={form.undecided} onChange={(event) => patch({ undecided: event.target.value })} />
              </Field>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <fieldset className="grid grid-cols-3 gap-2 border border-[#F0E4D0] p-3">
                <legend className="px-1 text-xs font-bold text-[#7A5530]">טווח לממתינים</legend>
                {(["low", "mid", "high"] as const).map((key) => (
                  <label key={key} className="grid gap-1 text-xs font-bold text-[#8A6B45]">
                    {key === "low" ? "נמוך" : key === "mid" ? "אמצע" : "גבוה"}
                    <input
                      className={inputClass}
                      inputMode="decimal"
                      value={form.pendingBand[key]}
                      onChange={(event) => patch({ pendingBand: { ...form.pendingBand, [key]: event.target.value } })}
                    />
                  </label>
                ))}
              </fieldset>
              <fieldset className="grid grid-cols-3 gap-2 border border-[#F0E4D0] p-3">
                <legend className="px-1 text-xs font-bold text-[#7A5530]">טווח למתלבטים</legend>
                {(["low", "mid", "high"] as const).map((key) => (
                  <label key={key} className="grid gap-1 text-xs font-bold text-[#8A6B45]">
                    {key === "low" ? "נמוך" : key === "mid" ? "אמצע" : "גבוה"}
                    <input
                      className={inputClass}
                      inputMode="decimal"
                      value={form.undecidedBand[key]}
                      onChange={(event) =>
                        patch({ undecidedBand: { ...form.undecidedBand, [key]: event.target.value } })
                      }
                    />
                  </label>
                ))}
              </fieldset>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="מינימום התחייבות לאולם" hint="השאירו ריק אם אין עדיין מספר בחוזה. לא נמלא אותו במקומכם.">
                <input className={inputClass} inputMode="numeric" value={form.venueMin} placeholder="לא הוזן" onChange={(event) => patch({ venueMin: event.target.value })} />
              </Field>
              <Field label="קיבולת מקסימלית" hint="אופציונלי">
                <input className={inputClass} inputMode="numeric" value={form.capacity} placeholder="לא ידוע" onChange={(event) => patch({ capacity: event.target.value })} />
              </Field>
              <Field label="מנות רזרבה">
                <input className={inputClass} inputMode="numeric" value={form.reserves} onChange={(event) => patch({ reserves: event.target.value })} />
              </Field>
              <Field label="מחיר מנה (₪)">
                <input className={inputClass} inputMode="decimal" value={form.mealPrice} placeholder="לא הוזן" onChange={(event) => patch({ mealPrice: event.target.value })} />
              </Field>
              <Field label="מחיר מנה נוספת (₪)" hint="למנות שמעל ההתחייבות, אם יש מחיר נפרד">
                <input className={inputClass} inputMode="decimal" value={form.extraMealPrice} placeholder="לא הוזן" onChange={(event) => patch({ extraMealPrice: event.target.value })} />
              </Field>
            </div>
          </section>
        </div>

        <div className="min-w-0">
          <section className="border border-[#E7D6BC] bg-white p-4 md:p-5" aria-labelledby="arrival-results">
            <h3 id="arrival-results" className="text-sm font-black tracking-[0.14em] text-[#7A5530]">
              תוצאות
            </h3>
            <div aria-live="polite">
              <p className="mt-3 text-sm font-bold text-[#5E4735]">הערכה מרכזית</p>
              <p className="mt-1 text-6xl font-black tabular-nums leading-none text-[#2C241C]">
                {formatPeople(result.rangeMid)}
              </p>
              <p className="mt-3 text-base font-bold leading-7 text-[#3A2433]">
                {result.isRange
                  ? `טווח הגעה משוער ${formatPeople(result.rangeLow)}–${formatPeople(result.rangeHigh)}`
                  : "קצות הטווח נפגשים במספר הזה. זו עדיין תחזית, לא ספירה באולם."}
              </p>
              <p className="mt-2 text-sm leading-6 text-[#5C4A3A]">
                אישרו בפועל: {formatPeople(result.confirmedReceived)}. זה נתון שהוזן, בנפרד מהתחזית.
              </p>
            </div>

            <ArrivalMap
              result={result}
              seatsValue={form.seats}
              onSeatsChange={(value) => patch({ seats: value })}
            />

            <div className="mt-4">
              <ResultLine label="סך המוזמנים" value={formatPeople(result.totalInvited)} />
              <ResultLine
                label="כמות מנות מומלצת לתכנון"
                value={formatPeople(result.recommendedPortions)}
                note="ההערכה המרכזית ועוד הרזרבות. זה תכנון, לא מספר לחתימה."
              />
              <ResultLine
                label="התחייבות מינימלית לפי החוזה"
                value={result.contractMissing ? "לא הוזנה" : formatPeople(result.venueMin || 0)}
                note={result.contractMissing ? "בלי נתון חוזה מוצג טווח תכנון בלבד." : "המספר שהוזן מההסכם, לא המלצה."}
              />
              <ResultLine label="רזרבות" value={formatPeople(result.reserveMeals)} />
              <ResultLine label="אומדן עלות מנות שלא נוצלו" value={unusedText} />
              {extraText ? <ResultLine label="אומדן מנות מעל ההתחייבות" value={extraText} /> : null}
              {result.capacity != null ? (
                <ResultLine label="קיבולת האולם" value={formatPeople(result.capacity)} />
              ) : null}
            </div>

            {result.warnings.length > 0 ? (
              <ul className="mt-4 space-y-2 border border-[#E2C4C4] bg-[#FBF4F4] px-4 py-3 text-sm leading-6 text-[#6E3038]">
                {result.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            ) : null}

            <div className="mt-4 border border-[#E7D6BC] bg-[#FBF7F0] px-4 py-3">
              <p className="text-sm font-black text-[#2C241C]">ההנחות שעומדות מאחורי המספר</p>
              <ul className="mt-2 space-y-2 text-sm leading-6 text-[#5C4A3A]">
                {result.assumptions.map((assumption) => (
                  <li key={assumption}>{assumption}</li>
                ))}
              </ul>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <button type="button" className={primaryBtn} onClick={copyShareLink}>
                שמירת קישור לתוצאה
              </button>
              <TrackedCtaLink href="/try/dashboard" className={secondaryBtn} location={`calc_try_rsvp:${PATH}`}>
                נסו את מערכת אישורי ההגעה
              </TrackedCtaLink>
            </div>
            {shareNote ? <p className="mt-2 text-sm leading-6 text-[#5C4A3A]">{shareNote}</p> : null}
            {shareUrl ? (
              <input readOnly className={`${inputClass} mt-2 text-xs`} value={shareUrl} aria-label="קישור לתוצאה" />
            ) : null}

            {signedIn ? (
              <div className="mt-4 border border-[#E7D6BC] p-3">
                <p className="text-sm leading-6 text-[#5C4A3A]">
                  יש חשבון מחובר. אפשר למלא את המחשבון בסיכום מספרי מהאירוע, רק אם תבחרו בכך.
                </p>
                <button type="button" className={`${secondaryBtn} mt-3`} onClick={loadEventSummary}>
                  שימוש בנתוני האירוע שלי
                </button>
                {loadNote ? <p className="mt-2 text-sm leading-6 text-[#5C4A3A]">{loadNote}</p> : null}
              </div>
            ) : null}
            {loadNote && !signedIn ? <p className="mt-3 text-sm leading-6 text-[#5C4A3A]">{loadNote}</p> : null}
          </section>
        </div>
      </div>
    </div>
  );
}
