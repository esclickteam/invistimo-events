"use client";

import Image from "next/image";
import { useEffect, useId, useMemo, useState } from "react";
import {
  BOTTLE_CATALOG,
  CATEGORY_META,
  PACKAGE_SIZE_OPTIONS,
  bottlesByCategory,
  type BottleCategoryId,
  type BottleCatalogItem,
} from "./bottleCatalog";
import {
  DEFAULT_ASSUMPTIONS,
  computeCostComparison,
  computeQuantities,
  normalizeGuests,
  vibeServingDefaults,
  type BarPreferences,
  type CorkageMode,
  type EventDuration,
  type EventInputs,
  type EventSeason,
  type EventType,
  type EventVibe,
  type SelectedDrink,
  type SelfPurchaseCosts,
  type VenueAlcohol,
  type VenuePackageCosts,
} from "./calcLogic";

const STEPS = [
  { id: "event", label: "פרטי האירוע" },
  { id: "drinks", label: "משקאות" },
  { id: "bar", label: "העדפות בר" },
  { id: "results", label: "כמויות ועלויות" },
] as const;

const inputClass =
  "min-h-12 w-full rounded-2xl border border-[#E6D2AA] bg-white px-4 text-base font-semibold text-[#2C241C] tabular-nums outline-none transition focus:border-[#C9A45C] focus:ring-2 focus:ring-[#C9A45C]/30";
const selectClass = inputClass + " appearance-none";
const chipClass =
  "rounded-full border px-4 py-2 text-sm font-bold transition";
const chipOn = "border-[#C9A45C] bg-[#FFF8EA] text-[#5E4735] shadow-[0_0_0_1px_rgba(201,164,92,0.35)]";
const chipOff = "border-[#E6D2AA] bg-white/80 text-[#7A6042] hover:bg-white";

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

function parseNum(raw: string) {
  if (raw.trim() === "") return 0;
  const n = Number(String(raw).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function formatIls(n: number) {
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  }).format(n);
}

function uid() {
  return `d_${Math.random().toString(36).slice(2, 9)}`;
}

const defaultBar: BarPreferences = {
  welcomeBar: true,
  danceFloorBar: false,
  wineBeerWithMeal: true,
  venuePackageIncludesSome: false,
  venueProvidesSoftDrinks: true,
  cocktailStation: false,
  wineOnTables: false,
};

export default function AlcoholCalculator() {
  const baseId = useId();
  const [step, setStep] = useState(0);

  // Step 1 — event
  const [eventType, setEventType] = useState<EventType>("wedding");
  const [expectedGuests, setExpectedGuests] = useState("180");
  const [legalAgeGuests, setLegalAgeGuests] = useState("150");
  const [expectedDrinkers, setExpectedDrinkers] = useState("110");
  const [youngLegalAge, setYoungLegalAge] = useState("40");
  const [duration, setDuration] = useState<EventDuration>("5");
  const [vibe, setVibe] = useState<EventVibe>("mixed");
  const [season, setSeason] = useState<EventSeason>("unspecified");
  const [venueAlcohol, setVenueAlcohol] = useState<VenueAlcohol>("unsure");

  // Assumptions (editable)
  const [servingsLow, setServingsLow] = useState(String(DEFAULT_ASSUMPTIONS.servingsPerDrinkerLow));
  const [servingsHigh, setServingsHigh] = useState(String(DEFAULT_ASSUMPTIONS.servingsPerDrinkerHigh));
  const [spiritPour, setSpiritPour] = useState(String(DEFAULT_ASSUMPTIONS.spiritPourMl));
  const [winePour, setWinePour] = useState(String(DEFAULT_ASSUMPTIONS.winePourMl));
  const [beerPour, setBeerPour] = useState(String(DEFAULT_ASSUMPTIONS.beerPourMl));
  const [showAssumptions, setShowAssumptions] = useState(false);

  // Step 2 — drinks
  const [activeCategory, setActiveCategory] = useState<BottleCategoryId>("vodka");
  const [search, setSearch] = useState("");
  const [drinks, setDrinks] = useState<SelectedDrink[]>([]);
  const [customOpen, setCustomOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customMl, setCustomMl] = useState("700");
  const [customNa, setCustomNa] = useState(false);

  // Step 3 — bar
  const [bar, setBar] = useState<BarPreferences>(defaultBar);

  // Cost comparison
  const [selfCosts, setSelfCosts] = useState<SelfPurchaseCosts>({
    bottleCost: 0,
    corkageMode: "none",
    corkagePerBottle: 0,
    corkagePerGuest: 0,
    corkageFlat: 0,
    corkageGuestCount: 150,
    transport: 0,
    coolingStorage: 0,
    ice: 0,
    bartenders: 0,
    softMixers: 0,
    extraEquipment: 0,
    expectedSealedReturn: 0,
  });
  const [venueCosts, setVenueCosts] = useState<VenuePackageCosts>({
    packageTotal: 0,
    perGuestPrice: 0,
    perGuestCount: 150,
    brandUpgrades: 0,
    cocktailStationExtra: 0,
    extraBartenders: 0,
    notIncludedServices: 0,
    taxesExtras: 0,
  });
  const [usePlanBottleCost, setUsePlanBottleCost] = useState(true);

  // Sync vibe → default servings (only when vibe changes)
  useEffect(() => {
    const d = vibeServingDefaults(vibe);
    setServingsLow(String(d.servingsPerDrinkerLow));
    setServingsHigh(String(d.servingsPerDrinkerHigh));
  }, [vibe]);

  // Clamp drinkers when legal age / guests change
  useEffect(() => {
    const n = normalizeGuests({
      expectedGuests: parseNum(expectedGuests),
      legalAgeGuests: parseNum(legalAgeGuests),
      expectedDrinkers: parseNum(expectedDrinkers),
      youngLegalAgeGuests: parseNum(youngLegalAge),
    });
    if (n.legalAgeGuests !== parseNum(legalAgeGuests)) setLegalAgeGuests(String(n.legalAgeGuests));
    if (n.expectedDrinkers !== parseNum(expectedDrinkers))
      setExpectedDrinkers(String(n.expectedDrinkers));
  }, [expectedGuests, legalAgeGuests, expectedDrinkers, youngLegalAge]);

  const inputs: EventInputs = useMemo(() => {
    const assumptions = {
      ...DEFAULT_ASSUMPTIONS,
      servingsPerDrinkerLow: parseNum(servingsLow) || DEFAULT_ASSUMPTIONS.servingsPerDrinkerLow,
      servingsPerDrinkerHigh: parseNum(servingsHigh) || DEFAULT_ASSUMPTIONS.servingsPerDrinkerHigh,
      spiritPourMl: parseNum(spiritPour) || DEFAULT_ASSUMPTIONS.spiritPourMl,
      winePourMl: parseNum(winePour) || DEFAULT_ASSUMPTIONS.winePourMl,
      beerPourMl: parseNum(beerPour) || DEFAULT_ASSUMPTIONS.beerPourMl,
    };
    if (assumptions.servingsPerDrinkerHigh < assumptions.servingsPerDrinkerLow) {
      assumptions.servingsPerDrinkerHigh = assumptions.servingsPerDrinkerLow;
    }
    return {
      eventType,
      expectedGuests: parseNum(expectedGuests),
      legalAgeGuests: parseNum(legalAgeGuests),
      expectedDrinkers: parseNum(expectedDrinkers),
      youngLegalAgeGuests: parseNum(youngLegalAge),
      duration,
      vibe,
      season,
      venueProvidesAlcohol: venueAlcohol,
      bar,
      assumptions,
      drinks,
    };
  }, [
    eventType,
    expectedGuests,
    legalAgeGuests,
    expectedDrinkers,
    youngLegalAge,
    duration,
    vibe,
    season,
    venueAlcohol,
    bar,
    drinks,
    servingsLow,
    servingsHigh,
    spiritPour,
    winePour,
    beerPour,
  ]);

  const qty = useMemo(() => computeQuantities(inputs), [inputs]);

  const comparison = useMemo(() => {
    const planCost = qty.purchaseCostMid;
    return computeCostComparison(selfCosts, venueCosts, {
      selfBottleCostFromPlan: usePlanBottleCost && planCost != null ? planCost : null,
    });
  }, [selfCosts, venueCosts, usePlanBottleCost, qty.purchaseCostMid]);

  function toggleCatalogBottle(item: BottleCatalogItem) {
    setDrinks((prev) => {
      const existing = prev.find((d) => d.catalogId === item.id);
      if (existing) return prev.filter((d) => d.id !== existing.id);
      const next: SelectedDrink = {
        id: uid(),
        catalogId: item.id,
        category: item.category,
        label: `${item.brandHe} · ${item.styleHe}`,
        packageMl: item.defaultMl,
        unitPrice: null,
        venueIncludedUnits: 0,
        manualUnits: null,
        isNonAlcoholic: item.category === "non_alcoholic",
      };
      return [...prev, next];
    });
  }

  function addCustomDrink() {
    const name = customName.trim() || "משקה מותאם";
    const next: SelectedDrink = {
      id: uid(),
      catalogId: null,
      category: customNa ? "non_alcoholic" : activeCategory,
      label: name,
      packageMl: parseNum(customMl) || 700,
      unitPrice: null,
      venueIncludedUnits: 0,
      manualUnits: null,
      isNonAlcoholic: customNa || activeCategory === "non_alcoholic",
    };
    setDrinks((prev) => [...prev, next]);
    setCustomName("");
    setCustomOpen(false);
  }

  function addNaPresets() {
    const presets: { label: string; ml: number }[] = [
      { label: "מים מינרליים", ml: 500 },
      { label: "סודה", ml: 500 },
      { label: "משקאות קלים", ml: 330 },
      { label: "מיצים", ml: 1000 },
      { label: "מוקטיילים", ml: 200 },
    ];
    setDrinks((prev) => {
      const missing = presets.filter((p) => !prev.some((d) => d.label === p.label));
      return [
        ...prev,
        ...missing.map(
          (p): SelectedDrink => ({
            id: uid(),
            catalogId: null,
            category: "non_alcoholic",
            label: p.label,
            packageMl: p.ml,
            unitPrice: null,
            venueIncludedUnits: 0,
            manualUnits: null,
            isNonAlcoholic: true,
          })
        ),
      ];
    });
    setActiveCategory("non_alcoholic");
  }

  function updateDrink(id: string, patch: Partial<SelectedDrink>) {
    setDrinks((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }

  function removeDrink(id: string) {
    setDrinks((prev) => prev.filter((d) => d.id !== id));
  }

  const filteredCatalog = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list =
      activeCategory === "cocktails" || activeCategory === "non_alcoholic"
        ? []
        : bottlesByCategory(activeCategory);
    if (q) {
      list = BOTTLE_CATALOG.filter(
        (b) =>
          b.brandHe.includes(search.trim()) ||
          b.brandEn.toLowerCase().includes(q) ||
          b.styleHe.includes(search.trim()) ||
          CATEGORY_META[b.category].labelHe.includes(search.trim())
      );
    }
    return list;
  }, [activeCategory, search]);

  function printSummary() {
    window.print();
  }

  return (
    <div
      id="alcohol-calculator"
      className="scroll-mt-24 rounded-[32px] border border-[#E6D2AA] bg-[#FFFDF8] p-5 shadow-[0_22px_50px_rgba(95,68,34,0.08)] md:p-8"
    >
      {/* Progress */}
      <nav aria-label="שלבי המחשבון" className="mb-8">
        <ol className="flex flex-wrap gap-2">
          {STEPS.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => setStep(i)}
                className={`${chipClass} ${i === step ? chipOn : chipOff}`}
                aria-current={i === step ? "step" : undefined}
              >
                <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#C9A45C]/25 text-[11px] tabular-nums">
                  {i + 1}
                </span>
                {s.label}
              </button>
            </li>
          ))}
        </ol>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#F0E2C8]" aria-hidden>
          <div
            className="h-full rounded-full bg-gradient-to-l from-[#C9A45C] to-[#E8D6A8] transition-all duration-500"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </nav>

      {/* STEP 1 */}
      {step === 0 && (
        <section aria-labelledby={`${baseId}-event`} className="grid gap-6">
          <div>
            <h3 id={`${baseId}-event`} className="text-2xl font-black text-[#2C241C]">
              פרטי האירוע
            </h3>
            <p className="mt-2 text-sm leading-6 text-[#7A6042]">
              מחשבים רק לפי אורחים בגיל שתייה חוקי שצפויים לשתות. אין ייחוס שתייה לקטינים.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="סוג האירוע">
              <select
                className={selectClass}
                value={eventType}
                onChange={(e) => setEventType(e.target.value as EventType)}
              >
                <option value="wedding">חתונה</option>
                <option value="bar_bat">בר/בת מצווה</option>
                <option value="corporate">אירוע חברה</option>
                <option value="adult_birthday">יום הולדת למבוגרים</option>
                <option value="other">אירוע אחר</option>
              </select>
            </Field>
            <Field label="משך האירוע" hint="לא מגדיל אוטומטית כמויות — להקשר בלבד">
              <select
                className={selectClass}
                value={duration}
                onChange={(e) => setDuration(e.target.value as EventDuration)}
              >
                <option value="upto3">עד 3 שעות</option>
                <option value="4">4 שעות</option>
                <option value="5">5 שעות</option>
                <option value="6">6 שעות</option>
                <option value="other">אחר</option>
              </select>
            </Field>
            <Field label="מספר אורחים צפוי בפועל">
              <input
                inputMode="numeric"
                className={inputClass}
                value={expectedGuests}
                onChange={(e) => setExpectedGuests(e.target.value)}
              />
            </Field>
            <Field label="מתוכם — בגיל שתייה חוקי">
              <input
                inputMode="numeric"
                className={inputClass}
                value={legalAgeGuests}
                onChange={(e) => setLegalAgeGuests(e.target.value)}
              />
            </Field>
            <Field
              label="מתוכם — צפויים לשתות אלכוהול"
              hint="לא יכול לעלות על מספר האורחים בגיל שתייה חוקי. ניתן להזין 0."
            >
              <input
                inputMode="numeric"
                className={inputClass}
                value={expectedDrinkers}
                onChange={(e) => {
                  const v = parseNum(e.target.value);
                  const max = parseNum(legalAgeGuests);
                  setExpectedDrinkers(String(Math.min(v, max)));
                }}
              />
            </Field>
            <Field
              label="אורחים צעירים בגיל שתייה חוקי (אופציונלי)"
              hint="להבנת הרכב הקהל בלבד — לא משנה את חישוב הכמויות"
            >
              <input
                inputMode="numeric"
                className={inputClass}
                value={youngLegalAge}
                onChange={(e) => setYoungLegalAge(e.target.value)}
              />
            </Field>
            <Field label="אופי האירוע">
              <select
                className={selectClass}
                value={vibe}
                onChange={(e) => setVibe(e.target.value as EventVibe)}
              >
                <option value="calm_family">רגוע ומשפחתי</option>
                <option value="mixed">מגוון</option>
                <option value="party">מסיבה עם רחבת ריקודים</option>
              </select>
            </Field>
            <Field label="עונה (אופציונלי)">
              <select
                className={selectClass}
                value={season}
                onChange={(e) => setSeason(e.target.value as EventSeason)}
              >
                <option value="unspecified">לא צוין</option>
                <option value="spring">אביב</option>
                <option value="summer">קיץ</option>
                <option value="autumn">סתיו</option>
                <option value="winter">חורף</option>
              </select>
            </Field>
            <Field label="האם האולם מספק חלק מהאלכוהול?">
              <select
                className={selectClass}
                value={venueAlcohol}
                onChange={(e) => setVenueAlcohol(e.target.value as VenueAlcohol)}
              >
                <option value="yes">כן</option>
                <option value="no">לא</option>
                <option value="unsure">לא בטוחים</option>
              </select>
            </Field>
          </div>

          <div className="rounded-2xl border border-[#EAD9B8] bg-[#FFF8EA]/70 p-4">
            <button
              type="button"
              className="flex w-full items-center justify-between text-sm font-black text-[#5E4735]"
              onClick={() => setShowAssumptions((v) => !v)}
              aria-expanded={showAssumptions}
            >
              הנחות תכנון לעריכה
              <span aria-hidden>{showAssumptions ? "−" : "+"}</span>
            </button>
            {showAssumptions ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="מנות לשותה — נמוך">
                  <input inputMode="decimal" className={inputClass} value={servingsLow} onChange={(e) => setServingsLow(e.target.value)} />
                </Field>
                <Field label="מנות לשותה — גבוה">
                  <input inputMode="decimal" className={inputClass} value={servingsHigh} onChange={(e) => setServingsHigh(e.target.value)} />
                </Field>
                <Field label="מ״ל למנת חריף">
                  <input inputMode="numeric" className={inputClass} value={spiritPour} onChange={(e) => setSpiritPour(e.target.value)} />
                </Field>
                <Field label="מ״ל למנת יין">
                  <input inputMode="numeric" className={inputClass} value={winePour} onChange={(e) => setWinePour(e.target.value)} />
                </Field>
                <Field label="מ״ל למנת בירה">
                  <input inputMode="numeric" className={inputClass} value={beerPour} onChange={(e) => setBeerPour(e.target.value)} />
                </Field>
              </div>
            ) : null}
            <p className="mt-3 text-xs leading-5 text-[#8A6B45]">
              הנחות שמרניות לתכנון רכש בלבד — לא המלצת צריכה ולא נתוני מכירות מאומתים.
            </p>
          </div>
        </section>
      )}

      {/* STEP 2 — catalog */}
      {step === 1 && (
        <section aria-labelledby={`${baseId}-drinks`} className="grid gap-6">
          <div>
            <h3 id={`${baseId}-drinks`} className="text-2xl font-black text-[#2C241C]">
              מה תרצו להגיש?
            </h3>
            <p className="mt-2 text-sm leading-6 text-[#7A6042]">
              בחרו קטגוריה, ואז בקבוקים מהגלריה. המותג משפיע על אריזה ומחיר שתזינו — לא על נוסחת הצריכה עצמה.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {(Object.keys(CATEGORY_META) as BottleCategoryId[]).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setActiveCategory(id);
                  setSearch("");
                  if (id === "non_alcoholic") addNaPresets();
                }}
                className={`${chipClass} ${activeCategory === id ? chipOn : chipOff}`}
              >
                {CATEGORY_META[id].labelHe}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="search"
              placeholder="חיפוש מותג או סוג…"
              className={inputClass}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="חיפוש בקטלוג"
            />
            <button
              type="button"
              className="min-h-12 shrink-0 rounded-2xl border border-[#DCC7A6] bg-white px-5 text-sm font-black text-[#5E4735]"
              onClick={() => setCustomOpen((v) => !v)}
            >
              + בקבוק מותאם אישית
            </button>
          </div>

          {customOpen ? (
            <div className="grid gap-3 rounded-2xl border border-[#E6D2AA] bg-white/90 p-4 sm:grid-cols-4">
              <Field label="שם">
                <input className={inputClass} value={customName} onChange={(e) => setCustomName(e.target.value)} />
              </Field>
              <Field label="נפח (מ״ל)">
                <input inputMode="numeric" className={inputClass} value={customMl} onChange={(e) => setCustomMl(e.target.value)} />
              </Field>
              <Field label="ללא אלכוהול?">
                <select
                  className={selectClass}
                  value={customNa ? "yes" : "no"}
                  onChange={(e) => setCustomNa(e.target.value === "yes")}
                >
                  <option value="no">לא</option>
                  <option value="yes">כן</option>
                </select>
              </Field>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={addCustomDrink}
                  className="min-h-12 w-full rounded-2xl bg-gradient-to-l from-[#3A2B22] to-[#5A4333] text-sm font-black text-white"
                >
                  הוספה
                </button>
              </div>
            </div>
          ) : null}

          {activeCategory === "cocktails" ? (
            <div className="rounded-2xl border border-dashed border-[#DCC7A6] bg-[#FFF8EA]/50 p-6 text-sm leading-7 text-[#5C4A3A]">
              <p className="font-bold text-[#2C241C]">קוקטיילים</p>
              <p className="mt-2">
                הוסיפו משקה מותאם בשם הקוקטייל, או סמנו עמדת קוקטיילים בשלב הבא. הביקוש לקוקטיילים
                נלקח כחלק מהחריפים שנבחרו — בלי ספירה כפולה מלאה מול כל בקבוק בנפרד.
              </p>
              <button
                type="button"
                className="mt-4 rounded-full border border-[#C9A45C] bg-white px-5 py-2 text-sm font-black text-[#5E4735]"
                onClick={() => {
                  setCustomNa(false);
                  setCustomName("קוקטיילים");
                  setCustomOpen(true);
                }}
              >
                הוספת שורת קוקטיילים
              </button>
            </div>
          ) : null}

          {activeCategory === "non_alcoholic" ? (
            <p className="text-sm text-[#7A6042]">
              נוספו פריטי בסיס לשתייה קלה. ניתן לערוך נפח, מחיר וכמות בשלב התוצאות.
            </p>
          ) : null}

          {filteredCatalog.length > 0 ? (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {filteredCatalog.map((item) => {
                const selected = drinks.some((d) => d.catalogId === item.id);
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => toggleCatalogBottle(item)}
                      aria-pressed={selected}
                      className={`group flex h-full w-full flex-col overflow-hidden rounded-[22px] border bg-white text-right transition ${
                        selected
                          ? "border-[#C9A45C] shadow-[0_0_0_2px_rgba(201,164,92,0.45),0_12px_28px_rgba(95,68,34,0.1)]"
                          : "border-[#E6D2AA] hover:border-[#D4B87A]"
                      }`}
                    >
                      <div className="relative flex aspect-[3/4] items-center justify-center bg-gradient-to-b from-[#FFFDF8] to-[#F7EFE0] p-3">
                        <Image
                          src={item.imageSrc}
                          alt={item.imageAlt}
                          width={280}
                          height={360}
                          className="max-h-full w-auto object-contain transition duration-500 group-hover:scale-[1.03]"
                          sizes="(max-width:640px) 45vw, 160px"
                        />
                        {selected ? (
                          <span className="absolute left-2 top-2 rounded-full bg-[#C9A45C] px-2 py-0.5 text-[10px] font-black text-white">
                            נבחר
                          </span>
                        ) : null}
                      </div>
                      <div className="border-t border-[#F0E2C8] px-3 py-3">
                        <p className="text-sm font-black leading-5 text-[#2C241C]">{item.brandHe}</p>
                        <p className="mt-0.5 text-xs font-semibold text-[#8A6B45]">{item.styleHe}</p>
                        <p className="mt-1 text-xs font-bold tabular-nums text-[#7A5530]">
                          {item.defaultMl >= 1000
                            ? `${item.defaultMl / 1000} ל׳`
                            : `${item.defaultMl} מ״ל`}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : activeCategory !== "cocktails" && activeCategory !== "non_alcoholic" && !search ? (
            <p className="text-sm text-[#7A6042]">אין פריטים בקטגוריה זו כרגע.</p>
          ) : null}

          {drinks.length > 0 ? (
            <div className="rounded-2xl border border-[#E6D2AA] bg-white/80 p-4">
              <p className="text-sm font-black text-[#2C241C]">נבחרו {drinks.length} משקאות</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {drinks.map((d) => (
                  <li
                    key={d.id}
                    className="inline-flex items-center gap-2 rounded-full border border-[#E6D2AA] bg-[#FFF8EA] px-3 py-1.5 text-xs font-bold text-[#5E4735]"
                  >
                    {d.label}
                    <button
                      type="button"
                      className="text-[#8A6B45] hover:text-[#2C241C]"
                      aria-label={`הסרת ${d.label}`}
                      onClick={() => removeDrink(d.id)}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[11px] leading-5 text-[#8A6B45]">
                אין מחירי מותגים מוכנים מראש — הזינו מחיר ליחידה רק אם יש לכם הצעה מאומתת. Invistimo אינה מוכרת אלכוהול.
              </p>
            </div>
          ) : null}
        </section>
      )}

      {/* STEP 3 — bar prefs */}
      {step === 2 && (
        <section aria-labelledby={`${baseId}-bar`} className="grid gap-6">
          <div>
            <h3 id={`${baseId}-bar`} className="text-2xl font-black text-[#2C241C]">
              איזה בר אתם מתכננים?
            </h3>
            <p className="mt-2 text-sm leading-6 text-[#7A6042]">
              הסימונים עוזרים למנוע ספירה כפולה מול מה שהאולם מספק.
            </p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["welcomeBar", "בר קבלת פנים"],
                ["danceFloorBar", "בר ברחבת הריקודים"],
                ["wineBeerWithMeal", "יין ובירה במהלך הארוחה"],
                ["venuePackageIncludesSome", "חלק מהמשקאות כלולים בחבילת האולם"],
                ["venueProvidesSoftDrinks", "האולם מספק שתייה קלה ומים"],
                ["cocktailStation", "עמדת קוקטיילים"],
                ["wineOnTables", "יין גם לשולחנות"],
              ] as const
            ).map(([key, label]) => (
              <li key={key}>
                <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border border-[#E6D2AA] bg-white px-4 py-3 text-sm font-bold text-[#5E4735]">
                  <input
                    type="checkbox"
                    className="h-5 w-5 accent-[#C9A45C]"
                    checked={bar[key]}
                    onChange={(e) => setBar((b) => ({ ...b, [key]: e.target.checked }))}
                  />
                  {label}
                </label>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* STEP 4 — results + cost compare */}
      {step === 3 && (
        <section aria-labelledby={`${baseId}-results`} className="grid gap-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 id={`${baseId}-results`} className="text-2xl font-black text-[#2C241C]">
                תכנון כמויות ועלויות
              </h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#7A6042]">
                אלה כמויות לתכנון רכישה בלבד, לא המלצה לצריכת אלכוהול. בפועל ייתכנו הבדלים משמעותיים בין אירועים.
              </p>
            </div>
            <button
              type="button"
              onClick={printSummary}
              className="rounded-full border border-[#DCC7A6] bg-white px-5 py-2.5 text-sm font-black text-[#5E4735] print:hidden"
            >
              הדפסת סיכום
            </button>
          </div>

          <div className="grid gap-3 rounded-2xl border border-[#E6D2AA] bg-[#FFF8EA]/60 p-4 sm:grid-cols-3">
            <div>
              <p className="text-xs font-bold text-[#8A6B45]">אורחים צפויים</p>
              <p className="mt-1 text-xl font-black tabular-nums text-[#2C241C]">{qty.expectedGuests}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-[#8A6B45]">בגיל שתייה חוקי</p>
              <p className="mt-1 text-xl font-black tabular-nums text-[#2C241C]">{qty.legalAgeGuests}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-[#8A6B45]">צפויים לשתות</p>
              <p className="mt-1 text-xl font-black tabular-nums text-[#2C241C]">{qty.drinkers}</p>
            </div>
          </div>

          {qty.warnings.length ? (
            <ul className="space-y-2 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-950">
              {qty.warnings.map((w) => (
                <li key={w}>• {w}</li>
              ))}
            </ul>
          ) : null}

          {qty.rows.length === 0 ? (
            <p className="text-sm text-[#7A6042]">בחרו משקאות בשלב הקודם כדי לראות כמויות.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#E6D2AA] text-right text-xs font-black text-[#8A6B45]">
                    <th className="py-2 pe-2 font-black">משקה</th>
                    <th className="py-2 px-2 font-black">נפח</th>
                    <th className="py-2 px-2 font-black">תכנון (טווח)</th>
                    <th className="py-2 px-2 font-black">כלול באולם</th>
                    <th className="py-2 px-2 font-black">לרכישה</th>
                    <th className="py-2 px-2 font-black">מחיר ליחידה</th>
                    <th className="py-2 ps-2 font-black">עלות</th>
                  </tr>
                </thead>
                <tbody>
                  {qty.rows.map((row) => {
                    const drink = drinks.find((d) => d.id === row.drinkId);
                    return (
                      <tr key={row.drinkId} className="border-b border-[#F0E2C8] align-top">
                        <td className="py-3 pe-2">
                          <p className="font-bold text-[#2C241C]">{row.label}</p>
                          {row.notes.length ? (
                            <p className="mt-1 text-[11px] text-[#8A6B45]">{row.notes.join(" · ")}</p>
                          ) : null}
                          <button
                            type="button"
                            className="mt-1 text-[11px] font-bold text-[#8A642E] underline print:hidden"
                            onClick={() => removeDrink(row.drinkId)}
                          >
                            הסרה
                          </button>
                        </td>
                        <td className="py-3 px-2">
                          <select
                            className="min-h-10 w-24 rounded-xl border border-[#E6D2AA] bg-white px-2 text-xs font-bold"
                            value={drink?.packageMl ?? row.packageMl}
                            onChange={(e) =>
                              updateDrink(row.drinkId, { packageMl: parseNum(e.target.value) })
                            }
                          >
                            {PACKAGE_SIZE_OPTIONS.map((ml) => (
                              <option key={ml} value={ml}>
                                {ml}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3 px-2 tabular-nums font-semibold text-[#35281F]">
                          {row.plannedUnitsLow === row.plannedUnitsHigh
                            ? row.plannedUnitsMid
                            : `${row.plannedUnitsLow}–${row.plannedUnitsHigh}`}
                          <div className="mt-1 print:hidden">
                            <input
                              inputMode="numeric"
                              placeholder="עריכה ידנית"
                              className="min-h-9 w-24 rounded-xl border border-[#E6D2AA] px-2 text-xs"
                              value={drink?.manualUnits ?? ""}
                              onChange={(e) => {
                                const raw = e.target.value;
                                updateDrink(row.drinkId, {
                                  manualUnits: raw.trim() === "" ? null : parseNum(raw),
                                });
                              }}
                              aria-label={`כמות ידנית ל${row.label}`}
                            />
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <input
                            inputMode="numeric"
                            className="min-h-10 w-20 rounded-xl border border-[#E6D2AA] px-2 text-xs font-bold tabular-nums"
                            value={drink?.venueIncludedUnits ?? 0}
                            onChange={(e) =>
                              updateDrink(row.drinkId, {
                                venueIncludedUnits: parseNum(e.target.value),
                              })
                            }
                          />
                        </td>
                        <td className="py-3 px-2 font-black tabular-nums text-[#2C241C]">
                          {row.toPurchaseLow === row.toPurchaseHigh
                            ? row.toPurchaseMid
                            : `${row.toPurchaseLow}–${row.toPurchaseHigh}`}
                        </td>
                        <td className="py-3 px-2">
                          <input
                            inputMode="decimal"
                            placeholder="₪"
                            className="min-h-10 w-24 rounded-xl border border-[#E6D2AA] px-2 text-xs font-bold tabular-nums"
                            value={drink?.unitPrice ?? ""}
                            onChange={(e) => {
                              const raw = e.target.value;
                              updateDrink(row.drinkId, {
                                unitPrice: raw.trim() === "" ? null : parseNum(raw),
                              });
                            }}
                          />
                        </td>
                        <td className="py-3 ps-2 font-bold tabular-nums text-[#2C241C]">
                          {row.costMid != null ? formatIls(row.costMid) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="rounded-2xl border border-[#E6D2AA] bg-white/90 p-4">
            <p className="text-sm font-black text-[#2C241C]">
              עלות בקבוקים משוערת (לפי מחירים שהוזנו):{" "}
              {qty.purchaseCostMid != null ? (
                <span className="tabular-nums">
                  {formatIls(qty.purchaseCostLow || 0)} – {formatIls(qty.purchaseCostHigh || 0)}
                  <span className="mx-1 text-[#8A6B45]">(אמצע {formatIls(qty.purchaseCostMid)})</span>
                </span>
              ) : (
                <span className="font-semibold text-[#8A6B45]">חסרים מחירים</span>
              )}
            </p>
          </div>

          <details className="rounded-2xl border border-[#EAD9B8] bg-[#FFF8EA]/50 p-4">
            <summary className="cursor-pointer text-sm font-black text-[#5E4735]">
              הנחות החישוב לצד התוצאה
            </summary>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-[#5C4A3A]">
              {qty.assumptions.map((a) => (
                <li key={a}>• {a}</li>
              ))}
            </ul>
          </details>

          {/* Cost comparison */}
          <div className="border-t border-[#E6D2AA] pt-8">
            <h4 className="text-xl font-black text-[#2C241C]">
              לקנות לבד או לקחת מהאולם?
            </h4>
            <p className="mt-2 text-sm leading-6 text-[#7A6042]">
              השוו עלות כוללת — לא רק מחיר בקבוק. בלי נתונים מלאים לא נכריז איזו חלופה משתלמת יותר.
            </p>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-[#E6D2AA] bg-white p-4">
                <p className="text-sm font-black text-[#2C241C]">אפשרות א׳ — רכישה עצמאית</p>
                <label className="mt-3 flex items-center gap-2 text-xs font-bold text-[#7A6042]">
                  <input
                    type="checkbox"
                    className="accent-[#C9A45C]"
                    checked={usePlanBottleCost}
                    onChange={(e) => setUsePlanBottleCost(e.target.checked)}
                  />
                  להשתמש בעלות הבקבוקים מהתכנון למעלה
                </label>
                {!usePlanBottleCost ? (
                  <Field label="עלות בקבוקים">
                    <input
                      inputMode="decimal"
                      className={inputClass}
                      value={selfCosts.bottleCost || ""}
                      onChange={(e) =>
                        setSelfCosts((s) => ({ ...s, bottleCost: parseNum(e.target.value) }))
                      }
                    />
                  </Field>
                ) : null}
                <div className="mt-3 grid gap-3">
                  <Field label="דמי מזיגה — שיטת חישוב">
                    <select
                      className={selectClass}
                      value={selfCosts.corkageMode}
                      onChange={(e) =>
                        setSelfCosts((s) => ({
                          ...s,
                          corkageMode: e.target.value as CorkageMode,
                        }))
                      }
                    >
                      <option value="none">אין / לא ידוע</option>
                      <option value="per_bottle">לפי בקבוק (סך דמי מזיגה)</option>
                      <option value="per_guest">לפי אורח</option>
                      <option value="flat">סכום קבוע</option>
                    </select>
                  </Field>
                  {selfCosts.corkageMode === "per_bottle" ? (
                    <Field label="סך דמי מזיגה לפי בקבוקים">
                      <input
                        inputMode="decimal"
                        className={inputClass}
                        value={selfCosts.corkagePerBottle || ""}
                        onChange={(e) =>
                          setSelfCosts((s) => ({
                            ...s,
                            corkagePerBottle: parseNum(e.target.value),
                          }))
                        }
                      />
                    </Field>
                  ) : null}
                  {selfCosts.corkageMode === "per_guest" ? (
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="דמי מזיגה לאורח">
                        <input
                          inputMode="decimal"
                          className={inputClass}
                          value={selfCosts.corkagePerGuest || ""}
                          onChange={(e) =>
                            setSelfCosts((s) => ({
                              ...s,
                              corkagePerGuest: parseNum(e.target.value),
                            }))
                          }
                        />
                      </Field>
                      <Field label="מספר אורחים לחישוב">
                        <input
                          inputMode="numeric"
                          className={inputClass}
                          value={selfCosts.corkageGuestCount || ""}
                          onChange={(e) =>
                            setSelfCosts((s) => ({
                              ...s,
                              corkageGuestCount: parseNum(e.target.value),
                            }))
                          }
                        />
                      </Field>
                    </div>
                  ) : null}
                  {selfCosts.corkageMode === "flat" ? (
                    <Field label="דמי מזיגה קבועים">
                      <input
                        inputMode="decimal"
                        className={inputClass}
                        value={selfCosts.corkageFlat || ""}
                        onChange={(e) =>
                          setSelfCosts((s) => ({ ...s, corkageFlat: parseNum(e.target.value) }))
                        }
                      />
                    </Field>
                  ) : null}
                  {(
                    [
                      ["transport", "הובלה"],
                      ["coolingStorage", "קירור ואחסון"],
                      ["ice", "קרח"],
                      ["bartenders", "ברמנים ושירות"],
                      ["softMixers", "שתייה קלה ומיקסרים"],
                      ["extraEquipment", "ציוד נוסף"],
                      ["expectedSealedReturn", "החזר צפוי על סגורים (אם הוסכם בכתב)"],
                    ] as const
                  ).map(([key, label]) => (
                    <Field key={key} label={label}>
                      <input
                        inputMode="decimal"
                        className={inputClass}
                        value={selfCosts[key] || ""}
                        onChange={(e) =>
                          setSelfCosts((s) => ({ ...s, [key]: parseNum(e.target.value) }))
                        }
                      />
                    </Field>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-[#E6D2AA] bg-white p-4">
                <p className="text-sm font-black text-[#2C241C]">אפשרות ב׳ — חבילת האולם</p>
                <div className="mt-3 grid gap-3">
                  {(
                    [
                      ["packageTotal", "מחיר כולל של חבילת הבר"],
                      ["perGuestPrice", "מחיר לאורח (אם רלוונטי)"],
                      ["perGuestCount", "מספר אורחים לתמחור"],
                      ["brandUpgrades", "שדרוג מותגים"],
                      ["cocktailStationExtra", "תוספת עמדת קוקטיילים"],
                      ["extraBartenders", "ברמנים נוספים"],
                      ["notIncludedServices", "שירותים שאינם כלולים"],
                      ["taxesExtras", "מסים ותוספות"],
                    ] as const
                  ).map(([key, label]) => (
                    <Field key={key} label={label}>
                      <input
                        inputMode="decimal"
                        className={inputClass}
                        value={venueCosts[key] || ""}
                        onChange={(e) =>
                          setVenueCosts((v) => ({ ...v, [key]: parseNum(e.target.value) }))
                        }
                      />
                    </Field>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-[#E6D2AA] bg-[#FFF8EA] p-5">
                <p className="text-xs font-bold text-[#8A6B45]">רכישה עצמאית — עלות משוערת</p>
                <p className="mt-2 text-2xl font-black tabular-nums text-[#2C241C]">
                  {comparison.selfTotalBeforeReturn > 0
                    ? formatIls(comparison.selfTotalAfterExpectedReturn)
                    : "—"}
                </p>
                <ul className="mt-3 space-y-1 text-xs text-[#7A6042]">
                  {comparison.selfBreakdown.map((b) => (
                    <li key={b.label} className="flex justify-between gap-2">
                      <span>{b.label}</span>
                      <span className="tabular-nums">{formatIls(b.amount)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-[#E6D2AA] bg-[#FFF8EA] p-5">
                <p className="text-xs font-bold text-[#8A6B45]">חבילת האולם — עלות משוערת</p>
                <p className="mt-2 text-2xl font-black tabular-nums text-[#2C241C]">
                  {comparison.venueTotal > 0 ? formatIls(comparison.venueTotal) : "—"}
                </p>
                <ul className="mt-3 space-y-1 text-xs text-[#7A6042]">
                  {comparison.venueBreakdown.map((b) => (
                    <li key={b.label} className="flex justify-between gap-2">
                      <span>{b.label}</span>
                      <span className="tabular-nums">{formatIls(b.amount)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-[#E6D2AA] bg-white p-4 text-sm leading-6 text-[#5C4A3A]">
              {comparison.canDeclareWinner ? (
                <p className="font-bold text-[#2C241C]">
                  הפרש משוער:{" "}
                  {formatIls(Math.abs(comparison.differenceSelfMinusVenue || 0))}
                  {comparison.cheaperSide === "self"
                    ? " — רכישה עצמאית נמוכה יותר לפי הנתונים שהוזנו"
                    : comparison.cheaperSide === "venue"
                      ? " — חבילת האולם נמוכה יותר לפי הנתונים שהוזנו"
                      : " — כמעט זהה"}
                  .
                </p>
              ) : (
                <p className="font-bold text-[#2C241C]">
                  לא ניתן להכריז איזו חלופה משתלמת יותר — חסרים נתונים באחת הצדדים.
                </p>
              )}
              <ul className="mt-3 space-y-1 text-xs text-[#8A6B45]">
                {comparison.caveats.map((c) => (
                  <li key={c}>• {c}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* Nav buttons */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <button
          type="button"
          disabled={step === 0}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          className="min-h-12 rounded-full border border-[#DCC7A6] bg-white px-6 text-sm font-black text-[#5E4735] disabled:opacity-40"
        >
          הקודם
        </button>
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
            className="min-h-12 rounded-full bg-gradient-to-l from-[#3A2B22] via-[#5A4333] to-[#2C211B] px-8 text-sm font-black text-white"
          >
            המשך
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setStep(0)}
            className="min-h-12 rounded-full border border-[#DCC7A6] bg-white px-6 text-sm font-black text-[#5E4735]"
          >
            חזרה לתחילת המחשבון
          </button>
        )}
      </div>
    </div>
  );
}
