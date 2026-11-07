"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  SHOW_UP_SPREAD,
  UNDECIDED_DEFAULT_BAND,
  computeArrival,
  decodeArrivalQuery,
  forecastSequence,
  illustrateSequence,
  distributeByDefaultMix,
  encodeArrivalQuery,
  groupsForCalculation,
  type BuiltinGroupId,
  type Distance,
  type GroupInput,
  type GuestEntryMode,
  type Season,
  type SharePayload,
  type Weekday,
} from "./calcLogic";

const PATH = "/info/guides/wedding-venue-guest-guarantee";

const inputClass =
  "h-12 w-full border border-[#E4D3B8] bg-white px-3 text-base font-semibold text-[#2C241C] tabular-nums outline-none transition-[border-color] duration-200 focus:border-[#A68448]";
const primaryBtn =
  "inline-flex min-h-12 items-center justify-center bg-[#42182F] px-6 text-sm font-bold text-white transition-colors hover:bg-[#6A2A42]";
const secondaryBtn =
  "inline-flex min-h-12 items-center justify-center border border-[#D9C4A4] bg-white px-6 text-sm font-bold text-[#5E4735] transition-colors hover:border-[#A68448] disabled:cursor-not-allowed disabled:opacity-40";

type RateFields = { low: string; mid: string; high: string };
type CustomGroup = { id: string; label: string; count: string; low: string; mid: string; high: string };
type FormState = {
  guestMode: GuestEntryMode;
  totalGuests: string;
  overall: RateFields;
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

const STEPS = [
  { id: 0, label: "המוזמנים", title: "המוזמנים שלכם" },
  { id: 1, label: "האירוע", title: "פרטי האירוע" },
  { id: 2, label: "התחזית", title: "התחזית שלכם" },
] as const;

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
    guestMode: "groups",
    totalGuests: "",
    overall: bandToFields(CUSTOM_DEFAULT_BAND),
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

function digitsOnly(raw: string) {
  return raw.replace(/\D/g, "");
}

function decimalOnly(raw: string) {
  const cleaned = raw.replace(/[^\d.]/g, "");
  const dot = cleaned.indexOf(".");
  if (dot === -1) return cleaned;
  return `${cleaned.slice(0, dot + 1)}${cleaned.slice(dot + 1).replace(/\./g, "")}`;
}

function countFrom(raw: string) {
  if (!digitsOnly(raw)) return 0;
  const parsed = Number(digitsOnly(raw));
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

function storedGroups(form: FormState): GroupInput[] {
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
  return groups;
}

function formToPayload(form: FormState): SharePayload {
  const groups = storedGroups(form);
  const overallBand = {
    low: percentFrom(form.overall.low, CUSTOM_DEFAULT_BAND.low),
    mid: percentFrom(form.overall.mid, CUSTOM_DEFAULT_BAND.mid),
    high: percentFrom(form.overall.high, CUSTOM_DEFAULT_BAND.high),
  };
  const totalGuests = form.guestMode === "total" ? countFrom(form.totalGuests) : groups.reduce((sum, group) => sum + group.count, 0);
  return {
    groups: groupsForCalculation(form.guestMode, totalGuests, groups, overallBand),
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
    guestMode: form.guestMode,
    totalGuests,
    overallBand,
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
    .filter((group) => group.id !== "overall" && !BUILTIN_GROUPS.some((item) => item.id === group.id))
    .map((group) => ({
      id: group.id,
      label: group.label,
      count: String(group.count),
      low: String(group.lowPct),
      mid: String(group.midPct),
      high: String(group.highPct),
    }));
  base.guestMode = payload.guestMode === "total" ? "total" : "groups";
  base.totalGuests = payload.guestMode === "total" ? String(payload.totalGuests || 0) : "";
  if (payload.overallBand) base.overall = bandToFields(payload.overallBand);
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

function groupExpectation(count: number, mid: number) {
  const expected = Math.round((count * mid) / 100);
  return `${formatPeople(count)} מוזמנים · צפי ${Math.round(mid)}% · כ־${formatPeople(expected)} צפויים להגיע`;
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

function Stepper({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const current = countFrom(value);
  return (
    <div dir="ltr" className="flex h-12 items-stretch border border-[#E4D3B8] bg-white">
      <button
        type="button"
        className="w-11 text-xl leading-none text-[#42182F]"
        aria-label={`פחות ${label}`}
        onClick={() => onChange(String(Math.max(0, current - 1)))}
      >
        −
      </button>
      <input
        inputMode="numeric"
        aria-label={label}
        className="w-16 border-x border-[#E4D3B8] bg-white text-center text-base font-semibold text-[#2C241C] outline-none"
        value={value}
        onChange={(event) => onChange(digitsOnly(event.target.value))}
      />
      <button
        type="button"
        className="w-11 text-xl leading-none text-[#42182F]"
        aria-label={`עוד ${label}`}
        onClick={() => onChange(String(current + 1))}
      >
        +
      </button>
    </div>
  );
}

function ChoiceGroup<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T | "";
  options: { id: T; label: string }[];
  onChange: (value: T | "") => void;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-bold text-[#3A2433]">{label}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = value === option.id;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={selected}
              className={`min-h-11 border px-3 text-sm font-bold transition-colors ${
                selected
                  ? "border-[#42182F] bg-[#42182F] text-white"
                  : "border-[#E4D3B8] bg-white text-[#5E4735] hover:border-[#A68448]"
              }`}
              onClick={() => onChange(selected ? "" : option.id)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="border-b border-[#F0E4D0] py-3">
      <div className="flex items-baseline justify-between gap-4">
        <dt className="text-sm font-bold text-[#5E4735]">{label}</dt>
        <dd className="text-lg font-black tabular-nums text-[#2C241C]">{value}</dd>
      </div>
      {note ? <p className="mt-1 text-sm leading-6 text-[#5E4735]">{note}</p> : null}
    </div>
  );
}

export default function VenueGuaranteeCalculator() {
  const [form, setForm] = useState<FormState>(defaultForm);
  const [step, setStep] = useState(0);
  const [signedIn, setSignedIn] = useState(false);
  const [loadNote, setLoadNote] = useState("");
  const [shareNote, setShareNote] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [showGroupRanges, setShowGroupRanges] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const skipScroll = useRef(true);

  useEffect(() => {
    const saved = decodeArrivalQuery(window.location.search);
    if (!saved) return;
    setForm(payloadToForm(saved));
    setStep(2);
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

  useEffect(() => {
    if (skipScroll.current) {
      skipScroll.current = false;
      return;
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    rootRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }, [step]);

  const payload = useMemo(() => formToPayload(form), [form]);
  const result = useMemo(() => computeArrival(payload), [payload]);
  const forecastPicture = useMemo(
    () => illustrateSequence(forecastSequence(result, "mid"), payload.seatsPerTable),
    [result, payload.seatsPerTable]
  );
  const illustratedTables = result.forecastReady && result.totalInvited > 0 ? forecastPicture.tables.length : 0;
  const groupSum = useMemo(
    () => storedGroups(form).reduce((sum, group) => sum + group.count, 0),
    [form]
  );

  function patch(partial: Partial<FormState>) {
    setForm((current) => ({ ...current, ...partial }));
    setShareNote("");
  }

  function setTotal(value: string) {
    patch({ guestMode: "total", totalGuests: value });
  }

  function chooseGroups() {
    setForm((current) => {
      const next = { ...current, guestMode: "groups" as const, counts: { ...current.counts } };
      const sum = storedGroups(current).reduce((total, group) => total + group.count, 0);
      if (sum === 0 && countFrom(current.totalGuests) > 0) {
        const mix = distributeByDefaultMix(countFrom(current.totalGuests));
        for (const group of BUILTIN_GROUPS) next.counts[group.id] = String(mix[group.id]);
      }
      return next;
    });
    setShareNote("");
  }

  async function copyShareLink() {
    const shareGroups = storedGroups(form);
    const query = encodeArrivalQuery({
      ...payload,
      groups: shareGroups,
    });
    const url = new URL(window.location.href);
    url.search = query;
    url.hash = "venue-calculator";
    const href = url.toString();
    setShareUrl(href);
    try {
      await navigator.clipboard.writeText(href);
      setShareNote("הקישור הועתק. הוא כולל מספרים והנחות, בלי שמות אורחים.");
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
        const next = { ...current, guestMode: "groups" as const, counts: { ...current.counts }, custom: [] as CustomGroup[] };
        for (const group of BUILTIN_GROUPS) next.counts[group.id] = String(data.groups?.[group.id] || 0);
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

  const headcountValue = form.guestMode === "total" ? form.totalGuests : String(groupSum);
  const unusedText =
    result.forecastReady && result.unusedMeals != null && result.unusedMeals > 0
      ? result.unusedCost != null
        ? `${formatPeople(result.unusedMeals)} מנות פער · אומדן ${formatIls(result.unusedCost)} לפי המחיר שהוזן, לא חיוב ודאי`
        : `${formatPeople(result.unusedMeals)} מנות פער. חסר מחיר מנה כדי לחשב אומדן עלות.`
      : "";
  const extraText =
    result.forecastReady && result.extraMeals != null && result.extraMeals > 0
      ? result.extraCost != null
        ? `${formatPeople(result.extraMeals)} מנות מעל ההתחייבות · אומדן ${formatIls(result.extraCost)} לפי המחיר שהוזן, לא חיוב ודאי`
        : `${formatPeople(result.extraMeals)} מנות מעל ההתחייבות. חסר מחיר מנה נוספת כדי לחשב אומדן עלות.`
      : "";
  const confirmedShowUp = Math.round((result.confirmedReceived * payload.showUpPct) / 100);

  return (
    <div
      id="venue-calculator"
      ref={rootRef}
      className="scroll-mt-24 overflow-x-hidden border-t-2 border-[#C6A15A] bg-[#FBF7F0] px-4 py-6 md:px-8 md:py-8"
    >
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          .arrival-figure { animation: arrival-figure-in 280ms ease; }
        }
        @keyframes arrival-figure-in {
          from { opacity: 0.45; transform: translateY(6px); }
          to { opacity: 1; transform: none; }
        }
      `}</style>

      <nav aria-label="שלבי המחשבון">
        <ol className="grid grid-cols-3 gap-2">
          {STEPS.map((item, index) => {
            const current = step === item.id;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  aria-current={current ? "step" : undefined}
                  className={`flex min-h-12 w-full items-center gap-2 border px-2 text-right transition-colors sm:px-3 ${
                    current
                      ? "border-[#42182F] bg-white text-[#42182F]"
                      : "border-transparent bg-transparent text-[#5E4735] hover:border-[#E4D3B8]"
                  }`}
                  onClick={() => setStep(item.id)}
                >
                  <span className={`grid h-7 w-7 shrink-0 place-items-center text-xs font-black ${current ? "bg-[#42182F] text-white" : "bg-[#F0E4D0] text-[#5E4735]"}`}>
                    {index + 1}
                  </span>
                  <span className="text-sm font-bold">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <p className="mt-4 text-sm text-[#5E4735]">
        {result.forecastReady ? (
          <>
            הערכה מרכזית כרגע{" "}
            <button type="button" className="font-black text-[#42182F] underline-offset-4 hover:underline" onClick={() => setStep(2)}>
              {formatPeople(result.rangeMid)}
            </button>
            . זו תחזית, לא הבטחה.
          </>
        ) : (
          <span role="alert">אי אפשר לחשב תחזית עד שסכום הסטטוסים לא יעבור את מספר המוזמנים.</span>
        )}
      </p>

      {step === 0 ? (
        <section className="mx-auto mt-8 max-w-3xl" aria-labelledby="guest-step">
          <h3 id="guest-step" className="text-3xl font-black leading-tight text-[#2C241C]">
            כמה אורחים אתם מזמינים?
          </h3>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[#5E4735]">
            אפשר להזין מספר אחד, או לחלק לקבוצות. רק דרך אחת נספרת. המעבר ביניהן לא מחבר את שני המספרים.
          </p>

          <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="איך לספור את המוזמנים">
            <button type="button" aria-pressed={form.guestMode === "total"} className={form.guestMode === "total" ? primaryBtn : secondaryBtn} onClick={() => setTotal(form.totalGuests || String(groupSum))}>
              מספר כללי
            </button>
            <button type="button" aria-pressed={form.guestMode === "groups"} className={form.guestMode === "groups" ? primaryBtn : secondaryBtn} onClick={chooseGroups}>
              חלוקה לקבוצות
            </button>
          </div>

          <label className="mt-8 block">
            <span className="text-sm font-bold text-[#3A2433]">
              {form.guestMode === "total" ? "מספר המוזמנים" : "סך המוזמנים לפי הקבוצות"}
            </span>
            <input
              inputMode="numeric"
              className="mt-2 h-20 w-full border border-[#E4D3B8] bg-white px-4 text-5xl font-black tabular-nums text-[#42182F] outline-none focus:border-[#A68448]"
              value={headcountValue}
              onChange={(event) => setTotal(digitsOnly(event.target.value))}
            />
          </label>
          <p className="mt-2 text-sm leading-6 text-[#5E4735]">
            {form.guestMode === "total"
              ? "נספר רק המספר הזה. הקבוצות נשמרות ולא מתווספות אליו."
              : "עריכת המספר עוברת למצב של מספר כללי. הקבוצות לא יתווספו אליו."}
          </p>

          {form.guestMode === "total" ? (
            <>
            <p className="mt-4 text-sm leading-6 text-[#3A2433]">
              {groupExpectation(countFrom(form.totalGuests), percentFrom(form.overall.mid, CUSTOM_DEFAULT_BAND.mid))}
            </p>
            <details className="mt-6">
              <summary className="cursor-pointer text-sm font-bold text-[#5E4735]">התאמת אחוז ההגעה למספר הכללי</summary>
              <p className="mt-2 text-sm leading-6 text-[#5E4735]">ברירת המחדל היא הנחת תכנון, לא הבטחה. אפשר לשנות אותה. היא אינה נתון סטטיסטי ארצי מאומת.</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {(
                  [
                    ["low", "קצה נמוך"],
                    ["mid", "אמצע"],
                    ["high", "קצה גבוה"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="grid gap-1 text-sm font-bold text-[#5E4735]">
                    {label} %
                    <input
                      inputMode="decimal"
                      className={inputClass}
                      value={form.overall[key]}
                      onChange={(event) => patch({ overall: { ...form.overall, [key]: decimalOnly(event.target.value) } })}
                    />
                  </label>
                ))}
              </div>
            </details>
            </>
          ) : (
            <div className="mt-8">
              <div className="max-w-2xl">
                <p className="text-sm font-bold text-[#3A2433]">צפי %</p>
                <p id="group-rate-help" className="mt-1 text-sm leading-6 text-[#5E4735]">
                  אחוז ההגעה המשוער של אורחים מקבוצה זו. לדוגמה, אם הזמנתם 50 חברים והצפי הוא 80%, המחשבון מעריך שכ־40 מהם יגיעו. זו הערכה בלבד ולא אישור הגעה שהתקבל.
                </p>
                <p className="mt-2 text-sm leading-6 text-[#5E4735]">
                  אחוזי ההגעה הם הנחות תכנון שניתן לשנות בהתאם להיכרות שלכם עם האורחים. הם אינם אישורי הגעה בפועל או ממוצע ארצי מאומת. השורה מתחת לכל קבוצה מחשבת רק את אחוז הקבוצה, לפני אישורי הגעה ולפני יום, עונה ומרחק.
                </p>
              </div>
              <details className="mt-4 max-w-2xl" onToggle={(event) => setShowGroupRanges(event.currentTarget.open)}>
                <summary className="cursor-pointer text-sm font-bold text-[#5E4735]">טווחי אחוזים לכל קבוצה</summary>
                <p className="mt-2 text-sm leading-6 text-[#5E4735]">
                  הקצה הנמוך והגבוה מרחיבים את טווח התחזית של הקבוצה. גם הם הנחות תכנון הניתנות לעריכה.
                </p>
              </details>
              <ul className="mt-4 max-w-2xl divide-y divide-[#F0E4D0] border-y border-[#F0E4D0]">
                {BUILTIN_GROUPS.map((group) => {
                  const count = countFrom(form.counts[group.id]);
                  const mid = percentFrom(form.rates[group.id].mid, group.mid);
                  const low = percentFrom(form.rates[group.id].low, group.low);
                  const high = percentFrom(form.rates[group.id].high, group.high);
                  return (
                    <li key={group.id} className="py-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="w-36 text-sm font-bold text-[#2C241C]">{group.label}</span>
                        <div className="flex items-center gap-3">
                          <Stepper
                            label={`כמות ב${group.label}`}
                            value={form.counts[group.id]}
                            onChange={(value) => patch({ counts: { ...form.counts, [group.id]: value } })}
                          />
                          <label className="grid gap-1 text-xs font-bold text-[#5E4735]">
                            צפי %
                            <input
                              inputMode="decimal"
                              aria-label={`אחוז צפי ל${group.label}`}
                              aria-describedby="group-rate-help"
                              className="h-12 w-20 border border-[#E4D3B8] bg-white text-center text-base font-semibold text-[#2C241C] outline-none focus:border-[#A68448]"
                              value={form.rates[group.id].mid}
                              onChange={(event) =>
                                patch({
                                  rates: { ...form.rates, [group.id]: { ...form.rates[group.id], mid: decimalOnly(event.target.value) } },
                                })
                              }
                            />
                          </label>
                        </div>
                      </div>
                      <p className="mt-1 text-sm leading-6 text-[#5E4735]">
                        {groupExpectation(count, mid)} · טווח {Math.round(low)}%–{Math.round(high)}%
                      </p>
                      {showGroupRanges ? (
                        <div className="mt-2 grid max-w-sm grid-cols-2 gap-2">
                          <label className="grid gap-1 text-xs font-bold text-[#5E4735]">
                            קצה נמוך %
                            <input
                              inputMode="decimal"
                              aria-label={`קצה נמוך ל${group.label}`}
                              className="h-11 w-full border border-[#E4D3B8] bg-white text-center text-base font-semibold text-[#2C241C] outline-none focus:border-[#A68448]"
                              value={form.rates[group.id].low}
                              onChange={(event) =>
                                patch({
                                  rates: { ...form.rates, [group.id]: { ...form.rates[group.id], low: decimalOnly(event.target.value) } },
                                })
                              }
                            />
                          </label>
                          <label className="grid gap-1 text-xs font-bold text-[#5E4735]">
                            קצה גבוה %
                            <input
                              inputMode="decimal"
                              aria-label={`קצה גבוה ל${group.label}`}
                              className="h-11 w-full border border-[#E4D3B8] bg-white text-center text-base font-semibold text-[#2C241C] outline-none focus:border-[#A68448]"
                              value={form.rates[group.id].high}
                              onChange={(event) =>
                                patch({
                                  rates: { ...form.rates, [group.id]: { ...form.rates[group.id], high: decimalOnly(event.target.value) } },
                                })
                              }
                            />
                          </label>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>

              {form.custom.map((group) => (
                <div key={group.id} className="mt-4 grid gap-3 border border-[#E7D6BC] bg-white p-3 sm:grid-cols-[1fr_auto_auto]">
                  <label className="grid gap-1 text-sm font-bold text-[#5E4735]">
                    שם הקבוצה
                    <input
                      className={inputClass}
                      maxLength={40}
                      value={group.label}
                      onChange={(event) =>
                        patch({
                          custom: form.custom.map((item) => (item.id === group.id ? { ...item, label: event.target.value } : item)),
                        })
                      }
                    />
                  </label>
                  <div className="self-end">
                    <Stepper
                      label="כמות בקבוצה האישית"
                      value={group.count}
                      onChange={(value) =>
                        patch({
                          custom: form.custom.map((item) => (item.id === group.id ? { ...item, count: value } : item)),
                        })
                      }
                    />
                  </div>
                  <button
                    type="button"
                    className="self-end min-h-12 border border-[#E4D3B8] px-4 text-sm font-bold text-[#6A2A42]"
                    onClick={() => patch({ custom: form.custom.filter((item) => item.id !== group.id) })}
                  >
                    הסרה
                  </button>
                  <p className="text-sm leading-6 text-[#5E4735] sm:col-span-3">
                    {groupExpectation(countFrom(group.count), percentFrom(group.mid, CUSTOM_DEFAULT_BAND.mid))} · טווח {Math.round(percentFrom(group.low, CUSTOM_DEFAULT_BAND.low))}%–{Math.round(percentFrom(group.high, CUSTOM_DEFAULT_BAND.high))}%
                  </p>
                  <label className="grid gap-1 text-xs font-bold text-[#5E4735]">
                    צפי %
                    <input
                      inputMode="decimal"
                      aria-label={`אחוז צפי ל${group.label || "קבוצה אישית"}`}
                      aria-describedby="group-rate-help"
                      className="h-12 w-20 border border-[#E4D3B8] bg-white text-center text-base font-semibold text-[#2C241C] outline-none focus:border-[#A68448]"
                      value={group.mid}
                      onChange={(event) =>
                        patch({
                          custom: form.custom.map((item) =>
                            item.id === group.id ? { ...item, mid: decimalOnly(event.target.value) } : item
                          ),
                        })
                      }
                    />
                  </label>
                  {showGroupRanges ? (
                    <>
                      {(
                        [
                          ["low", "קצה נמוך"],
                          ["high", "קצה גבוה"],
                        ] as const
                      ).map(([key, label]) => (
                        <label key={key} className="grid gap-1 text-xs font-bold text-[#5E4735]">
                          {label} %
                          <input
                            inputMode="decimal"
                            className={inputClass}
                            value={group[key]}
                            onChange={(event) =>
                              patch({
                                custom: form.custom.map((item) =>
                                  item.id === group.id ? { ...item, [key]: decimalOnly(event.target.value) } : item
                                ),
                              })
                            }
                          />
                        </label>
                      ))}
                    </>
                  ) : null}
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
                        id: `custom-${form.custom.length + 1}`,
                        label: "",
                        count: "0",
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

            </div>
          )}

          {signedIn ? (
            <div className="mt-8 border-t border-[#E7D6BC] pt-4">
              <p className="text-sm leading-6 text-[#5E4735]">אפשר למלא סיכום מספרי מהאירוע המחובר, רק בלחיצה.</p>
              <button type="button" className={`${secondaryBtn} mt-3`} onClick={loadEventSummary}>
                שימוש בנתוני האירוע שלי
              </button>
              {loadNote ? <p className="mt-2 text-sm leading-6 text-[#5E4735]">{loadNote}</p> : null}
            </div>
          ) : null}
          {loadNote && !signedIn ? <p className="mt-4 text-sm leading-6 text-[#5E4735]">{loadNote}</p> : null}
        </section>
      ) : null}

      {step === 1 ? (
        <section className="mx-auto mt-8 max-w-3xl" aria-labelledby="event-step">
          <h3 id="event-step" className="text-3xl font-black leading-tight text-[#2C241C]">
            מה כבר יודעים על האירוע?
          </h3>
          <p className="mt-3 text-base leading-7 text-[#5E4735]">
            יום, עונה ומרחק מזיזים רק את התחזית. אישור או סירוב שכבר התקבלו נשארים נתון נפרד.
          </p>

          <div className="mt-8 grid gap-6">
            <ChoiceGroup
              label="באיזה יום האירוע?"
              value={form.weekday}
              options={(Object.keys(DAY_LABEL) as Weekday[]).map((id) => ({ id, label: DAY_LABEL[id] }))}
              onChange={(weekday) => patch({ weekday })}
            />
            <ChoiceGroup
              label="באיזו עונה?"
              value={form.season}
              options={(Object.keys(SEASON_LABEL) as Season[]).map((id) => ({ id, label: SEASON_LABEL[id] }))}
              onChange={(season) => patch({ season })}
            />
            <ChoiceGroup
              label="כמה רחוק האולם מהאורחים?"
              value={form.distance}
              options={(Object.keys(DISTANCE_LABEL) as Distance[]).map((id) => ({ id, label: DISTANCE_LABEL[id] }))}
              onChange={(distance) => patch({ distance })}
            />
          </div>

          <ul className="mt-5 max-w-xl divide-y divide-[#F0E4D0] border-y border-[#F0E4D0]">
            {(
              [
                ["confirmed", "כמה כבר אישרו?", "נתון שהתקבל, לא תחזית"],
                ["declined", "כמה כבר סירבו?", "לא נספרים כמגיעים"],
                ["pending", "כמה עוד לא ענו?", "לא נספרים כסירוב"],
                ["undecided", "כמה מתלבטים?", "עדיין לא סגורים"],
              ] as const
            ).map(([key, label, hint]) => (
              <li key={key} className="flex items-center gap-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-[#3A2433]">{label}</p>
                  <p className="text-xs leading-5 text-[#5E4735]">{hint}</p>
                </div>
                <Stepper label={label} value={form[key]} onChange={(value) => patch({ [key]: value })} />
              </li>
            ))}
          </ul>

          <div
            className={`mt-4 max-w-xl px-1 py-3 text-sm leading-6 ${
              result.forecastReady ? "text-[#5E4735]" : "border-r-2 border-[#8E3A4B] pr-3 text-[#6E3038]"
            }`}
            role={result.forecastReady ? "status" : "alert"}
          >
            <p>סך המוזמנים: {formatPeople(result.totalInvited)}</p>
            <p>עם סטטוס: {formatPeople(result.statusSum)}</p>
            {result.forecastReady ? (
              result.remainder > 0 ? (
                <p>טרם סווגו: {formatPeople(result.remainder)}. הם נכנסים לתחזית לפי הקבוצות, פעם אחת בלבד.</p>
              ) : (
                <p>טרם סווגו: 0. כל המוזמנים כבר משויכים לסטטוס.</p>
              )
            ) : (
              <p>{result.warnings[0]}</p>
            )}
          </div>

          <div className="mt-5 grid max-w-xl gap-4">
            <label className="grid gap-1 text-sm font-bold text-[#3A2433]">
              כמה אורחים התחייבתם לאולם?
              <input className={`${inputClass} max-w-36`} inputMode="numeric" placeholder="אין חוזה" value={form.venueMin} onChange={(event) => patch({ venueMin: digitsOnly(event.target.value) })} />
              <span className="text-xs font-semibold leading-5 text-[#5E4735]">השאירו ריק אם אין מספר. לא נמציא התחייבות.</span>
            </label>
            <label className="grid gap-1 text-sm font-bold text-[#3A2433]">
              כמה אורחים האולם יכול להכיל?
              <input className={`${inputClass} max-w-36`} inputMode="numeric" placeholder="לא ידוע" value={form.capacity} onChange={(event) => patch({ capacity: digitsOnly(event.target.value) })} />
            </label>
          </div>

          <details className="mt-8">
            <summary className="cursor-pointer text-sm font-bold text-[#5E4735]">פרטים נוספים לתכנון</summary>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-bold text-[#3A2433]">
                איזה חלק מהמאשרים צפוי להגיע? %
                <input className={`${inputClass} max-w-36`} inputMode="decimal" value={form.showUp} onChange={(event) => patch({ showUp: decimalOnly(event.target.value) })} />
                <span className="font-semibold text-[#5E4735]">ברירת מחדל 96%, עם ארבע נקודות מכל צד. לא הבטחה.</span>
              </label>
              <label className="grid gap-1 text-sm font-bold text-[#3A2433]">
                כמה מנות רזרבה להוסיף?
                <Stepper label="מנות רזרבה" value={form.reserves} onChange={(value) => patch({ reserves: value })} />
                <span className="font-semibold text-[#5E4735]">נוספות לתכנון המנות, לא מוצגות ככיסאות.</span>
              </label>
              <label className="grid gap-1 text-sm font-bold text-[#3A2433]">
                מחיר מנה (₪)
                <input className={`${inputClass} max-w-36`} inputMode="decimal" placeholder="לא הוזן" value={form.mealPrice} onChange={(event) => patch({ mealPrice: decimalOnly(event.target.value) })} />
              </label>
              <label className="grid gap-1 text-sm font-bold text-[#3A2433]">
                מחיר מנה נוספת (₪)
                <input className={`${inputClass} max-w-36`} inputMode="decimal" placeholder="לא הוזן" value={form.extraMealPrice} onChange={(event) => patch({ extraMealPrice: decimalOnly(event.target.value) })} />
              </label>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <fieldset>
                <legend className="text-sm font-bold text-[#3A2433]">טווח למי שעוד לא ענה</legend>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {(["low", "mid", "high"] as const).map((key) => (
                    <label key={key} className="grid gap-1 text-xs font-bold text-[#5E4735]">
                      {key === "low" ? "נמוך" : key === "mid" ? "אמצע" : "גבוה"}
                      <input className={`${inputClass} max-w-24`} inputMode="decimal" value={form.pendingBand[key]} onChange={(event) => patch({ pendingBand: { ...form.pendingBand, [key]: decimalOnly(event.target.value) } })} />
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend className="text-sm font-bold text-[#3A2433]">טווח למתלבטים</legend>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {(["low", "mid", "high"] as const).map((key) => (
                    <label key={key} className="grid gap-1 text-xs font-bold text-[#5E4735]">
                      {key === "low" ? "נמוך" : key === "mid" ? "אמצע" : "גבוה"}
                      <input className={`${inputClass} max-w-24`} inputMode="decimal" value={form.undecidedBand[key]} onChange={(event) => patch({ undecidedBand: { ...form.undecidedBand, [key]: decimalOnly(event.target.value) } })} />
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          </details>
        </section>
      ) : null}

      {step === 2 && !result.forecastReady ? (
        <section className="mx-auto mt-8 max-w-xl" aria-labelledby="forecast-step">
          <h3 id="forecast-step" className="text-3xl font-black text-[#2C241C]">אי אפשר להציג תחזית</h3>
          <p className="mt-4 border-r-2 border-[#8E3A4B] pr-4 text-base leading-7 text-[#6E3038]" role="alert">
            {result.warnings[0]}
          </p>
          <p className="mt-3 text-sm leading-6 text-[#5E4735]">
            סך המוזמנים הוא {formatPeople(result.totalInvited)}. הסטטוסים שהוזנו מסתכמים ב־{formatPeople(result.statusSum)}.
          </p>
          <button type="button" className={`${primaryBtn} mt-6`} onClick={() => setStep(1)}>
            תיקון נתוני האירוע
          </button>
        </section>
      ) : null}

      {step === 2 && result.forecastReady ? (
        <section className="mt-8" aria-labelledby="forecast-step">
          <div className="grid items-start gap-10 lg:grid-cols-2">
            <div>
              <p className="text-sm font-bold tracking-[0.14em] text-[#7A5530]">התחזית שלכם</p>
              <h3 id="forecast-step" className="mt-3 text-lg font-bold text-[#5E4735]">
                הערכה מרכזית
              </h3>
              <p key={result.rangeMid} className="arrival-figure mt-2 text-7xl font-black leading-none tabular-nums text-[#42182F] md:text-8xl" aria-live="polite">
                {formatPeople(result.rangeMid)}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <p className="text-xl font-bold leading-8 text-[#2C241C]">טווח הגעה משוער</p>
                <details className="group">
                  <summary className="inline-flex min-h-11 cursor-pointer list-none items-center border border-[#D9C4A4] bg-white px-3 text-sm font-bold text-[#5E4735] [&::-webkit-details-marker]:hidden">
                    הסבר על הטווח
                  </summary>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-[#5E4735]">
                    טווח ההגעה מציג הערכה נמוכה וגבוהה למספר האורחים שעשויים להגיע. הוא מחושב לפי קבוצות המוזמנים, אחוזי ההגעה שהוגדרו, אישורי ההגעה שכבר התקבלו ונתוני האירוע. הטווח נועד לעזור בתכנון ואינו מבטיח כמה אורחים יגיעו בפועל.
                  </p>
                </details>
              </div>
              <p className="mt-2 text-base leading-7 text-[#5E4735]">
                {result.isRange
                  ? `${formatPeople(result.rangeLow)} עד ${formatPeople(result.rangeHigh)}`
                  : "קצות הטווח נפגשים במספר המרכזי."}
              </p>
              <dl className="mt-4 grid grid-cols-3 gap-2">
                {(
                  [
                    ["תחזית נמוכה", result.rangeLow, "border-[#E4D3B8]"],
                    ["תחזית מרכזית", result.rangeMid, "border-[#42182F]"],
                    ["תחזית גבוהה", result.rangeHigh, "border-[#C6A15A]"],
                  ] as const
                ).map(([label, value, border]) => (
                  <div key={label} className={`border bg-[#FFFDF8] px-2 py-3 ${border}`}>
                    <dt className="text-xs font-bold leading-5 text-[#5E4735]">{label}</dt>
                    <dd className="mt-1 text-2xl font-black tabular-nums text-[#42182F] sm:text-3xl">{formatPeople(value)}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-base leading-7 text-[#5E4735]">זו הערכה לפי הנחות גלויות, לא מספר לחתימה ולא הבטחה.</p>
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-bold text-[#5E4735]">איך חושבה התחזית?</summary>
                <ol className="mt-3 space-y-2 text-sm leading-6 text-[#3A2433]">
                  <li>1. אורחים שאישרו בפועל: {formatPeople(result.confirmedReceived)}.</li>
                  <li>
                    2. הנחת אי־הופעה מתוך המאשרים: {formatPeople(Math.max(0, result.confirmedReceived - result.forecastViews.mid.show))}. נספרים{" "}
                    {formatPeople(result.forecastViews.mid.show)}. הפער הוא הנחת אי־הופעה, לא סירוב ולא ביטול.
                  </li>
                  <li>
                    3. צפי מתוך המתלבטים: {formatPeople(result.forecastViews.mid.undecided)} מתוך {formatPeople(result.undecidedReceived)} בפועל.
                  </li>
                  <li>
                    4. צפי מתוך הממתינים: {formatPeople(result.forecastViews.mid.pending)} מתוך {formatPeople(result.pendingReceived)} בפועל.
                  </li>
                  <li>
                    5. צפי מתוך מי שטרם סווגו: {formatPeople(result.forecastViews.mid.high + result.forecastViews.mid.low)} מתוך {formatPeople(result.remainder)}.
                  </li>
                  <li>
                    6. השפעת נתוני האירוע: {result.contextShift > 0 ? "+" : ""}{result.contextShift} נקודות אחוז. הן כבר כלולות בשיעורים שלמעלה, ולא מתווספות שוב.
                  </li>
                  <li>
                    7. רזרבות: {formatPeople(result.reserveMeals)} מנות. הן מתווספות לתכנון המנות ({formatPeople(result.recommendedPortions)}) ואינן כיסאות בתחזית ההגעה.
                  </li>
                </ol>
                <p className="mt-3 text-sm font-bold leading-6 text-[#42182F]">
                  סכום הגעה: {formatPeople(result.forecastViews.mid.show + result.forecastViews.mid.undecided + result.forecastViews.mid.pending + result.forecastViews.mid.high + result.forecastViews.mid.low)} · התחזית המרכזית: {formatPeople(result.rangeMid)}
                </p>
              </details>
              {result.confirmedReceived > 0 ? (
                <div className="mt-5 border-r-2 border-[#C6A15A] pr-4">
                  <p className="text-base font-bold text-[#8E3A4B]">אישרו בפועל: {formatPeople(result.confirmedReceived)}</p>
                  <p className="mt-1 text-sm leading-6 text-[#3A2433]">
                    אישור שהתקבל מחליף את אחוז הקבוצה של אותם אנשים. ההערכה מניחה שכ־{Math.round(payload.showUpPct)}% מהמאשרים יגיעו, ולכן נספרים{" "}
                    {formatPeople(confirmedShowUp)} מתוכם. ההפרש של {formatPeople(Math.max(0, result.confirmedReceived - confirmedShowUp))} הוא הנחת אי־הופעה. הוא אינו סירוב ואינו ביטול.
                    {" "}
                    התחזית הנמוכה והגבוהה מזיזות את אותה הנחה ב־{SHOW_UP_SPREAD} נקודות אחוז מכל צד.
                  </p>
                </div>
              ) : (
                <p className="mt-4 text-sm leading-6 text-[#5E4735]">עדיין לא הוזנו אישורי הגעה. שלושת המספרים למעלה הם תחזית בלבד.</p>
              )}
              {result.remainder > 0 ? (
                <p className="mt-3 text-sm leading-6 text-[#5E4735]">
                  {formatPeople(result.remainder)} מוזמנים עדיין בלי סטטוס. הם נכללים בתחזית לפי הקבוצות, ולא נספרים פעם נוספת.
                </p>
              ) : null}

              <ul className="mt-6 space-y-2 text-sm leading-6 text-[#3A2433]">
                <li><span className="font-bold">מוזמנים ברשימה:</span> {formatPeople(result.totalInvited)}</li>
                <li><span className="font-bold">אישרו בפועל:</span> {formatPeople(result.confirmedReceived)}</li>
                <li><span className="font-bold">צפויים להגיע:</span> {formatPeople(result.rangeMid)}. זו התחזית המרכזית.</li>
                <li>
                  <span className="font-bold">התחייבות חוזית:</span>{" "}
                  {result.contractMissing ? "לא הוזנה." : `${formatPeople(result.venueMin || 0)} מנות.`} זו אינה סטטוס של אורח, והיא לא מסמנת כיסא במפה.
                </li>
              </ul>

              <dl className="mt-6">
                <Stat
                  label="שולחנות בהמחשה"
                  value={formatPeople(illustratedTables)}
                  note="מספר השולחנות בתצוגת התחזית המרכזית, כולל מקומות שמחוץ לתחזית. שינוי המושבים משנה רק את הציור."
                />
                {!result.contractMissing ? (
                  <Stat
                    label="התחייבות שהוזנה"
                    value={formatPeople(result.venueMin || 0)}
                    note="מספר מנות מההסכם. הוא מופיע כהשוואה ליד המפה, לא כאורחים."
                  />
                ) : null}
                {result.reserveMeals > 0 ? (
                  <Stat
                    label="מנות לתכנון, כולל רזרבה"
                    value={formatPeople(result.recommendedPortions)}
                    note={`${formatPeople(result.reserveMeals)} מנות רזרבה נוספו על ההערכה.`}
                  />
                ) : null}
                {unusedText ? <Stat label="פער מול ההתחייבות" value={unusedText} note="אומדן להשוואה. הוא אינו סכום חיוב ודאי." /> : null}
                {extraText ? <Stat label="מנות מעל ההתחייבות" value={extraText} note="אומדן להשוואה. הוא אינו סכום חיוב ודאי." /> : null}
                {result.capacity != null ? <Stat label="קיבולת האולם" value={formatPeople(result.capacity)} /> : null}
              </dl>

              {result.warnings.length > 0 ? (
                <ul className="mt-6 space-y-2 border-r-2 border-[#8E3A4B] pr-4 text-sm leading-6 text-[#6E3038]">
                  {result.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              ) : null}

              <details className="mt-6">
                <summary className="cursor-pointer text-sm font-bold text-[#5E4735]">איך הגענו למספר</summary>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-[#5E4735]">
                  {result.assumptions.map((assumption) => (
                    <li key={assumption}>{assumption}</li>
                  ))}
                </ul>
              </details>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button type="button" className={secondaryBtn} onClick={copyShareLink}>
                  שמירת קישור לתוצאה
                </button>
                <button type="button" className={secondaryBtn} onClick={() => setStep(0)}>
                  עריכת הנתונים
                </button>
              </div>
              {shareNote ? <p className="mt-2 text-sm leading-6 text-[#5E4735]">{shareNote}</p> : null}
              {shareUrl ? <input readOnly className={`${inputClass} mt-2 text-xs`} value={shareUrl} aria-label="קישור לתוצאה" /> : null}

              <div className="mt-10 border-t-2 border-[#C6A15A] bg-[#FFFDF8] px-5 py-6">
                <h3 className="text-2xl font-black leading-snug text-[#2C241C]">רוצים להחליף הערכות באישורי הגעה אמיתיים?</h3>
                <p className="mt-3 max-w-xl text-base leading-7 text-[#5E4735]">
                  ב־Invistimo אפשר לעקוב אחרי מי שכבר אישר, מי שסירב ומי שעדיין לא ענה, ולעדכן את התכנון לפי תשובות אמיתיות.
                </p>
                <TrackedCtaLink href="/try/dashboard" className={`${primaryBtn} mt-5`} location={`calc_try_rsvp:${PATH}`}>
                  התנסו במערכת אישורי ההגעה
                </TrackedCtaLink>
              </div>
            </div>

            <ArrivalMap result={result} seatsValue={form.seats} onSeatsChange={(value) => patch({ seats: value })} />
          </div>
        </section>
      ) : null}

      <div className="mx-auto mt-8 flex max-w-3xl items-center justify-between gap-3">
        <button type="button" className={secondaryBtn} onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0}>
          חזרה
        </button>
        {step < 2 ? (
          <button type="button" className={primaryBtn} onClick={() => setStep((current) => Math.min(2, current + 1))}>
            {step === 0 ? "לפרטי האירוע" : "לתחזית"}
          </button>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}
