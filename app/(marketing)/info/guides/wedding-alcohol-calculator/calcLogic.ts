/**
 * Transparent purchase-planning math for wedding / event alcohol.
 *
 * These are editable planning defaults for buying stock — not consumption
 * recommendations, not Invistimo “experience data”, and not guaranteed usage.
 * Quantities are always shown as a low–high planning range and can be overridden.
 */

export type EventType =
  | "wedding"
  | "bar_bat"
  | "corporate"
  | "adult_birthday"
  | "other";

export type EventDuration = "upto3" | "4" | "5" | "6" | "other";

export type EventVibe = "calm_family" | "mixed" | "party";

export type EventSeason = "spring" | "summer" | "autumn" | "winter" | "unspecified";

export type VenueAlcohol = "yes" | "no" | "unsure";

export type BottleCategoryId =
  | "vodka"
  | "whiskey"
  | "arak"
  | "gin"
  | "rum"
  | "tequila"
  | "wine"
  | "beer"
  | "cocktails"
  | "non_alcoholic";

export type SelectedDrink = {
  id: string;
  catalogId: string | null;
  category: BottleCategoryId;
  label: string;
  packageMl: number;
  unitPrice: number | null;
  /** Units already included by the venue */
  venueIncludedUnits: number;
  /** Manual override of planned total units before venue deduction (null = use engine) */
  manualUnits: number | null;
  /** Manual override of units to purchase (null = planned − venueIncluded) */
  manualPurchaseUnits: number | null;
  /** Soft drinks / water / NA */
  isNonAlcoholic: boolean;
};

export type BarPreferences = {
  welcomeBar: boolean;
  danceFloorBar: boolean;
  wineBeerWithMeal: boolean;
  venuePackageIncludesSome: boolean;
  venueProvidesSoftDrinks: boolean;
  cocktailStation: boolean;
  wineOnTables: boolean;
};

export type PlanningAssumptions = {
  /** Planned alcoholic “servings” per drinker — low bound */
  servingsPerDrinkerLow: number;
  /** Planned alcoholic “servings” per drinker — high bound */
  servingsPerDrinkerHigh: number;
  /** ml counted as one spirit pour */
  spiritPourMl: number;
  /** ml counted as one wine pour */
  winePourMl: number;
  /** ml counted as one beer serving */
  beerPourMl: number;
  /** Share of alcoholic demand attributed to cocktails when selected (0–1) */
  cocktailShare: number;
  /** Non-alcoholic servings per guest (all expected guests) — low/high */
  softPerGuestLow: number;
  softPerGuestHigh: number;
  waterLitersPerGuest: number;
};

export type EventInputs = {
  eventType: EventType;
  expectedGuests: number;
  legalAgeGuests: number;
  expectedDrinkers: number;
  /** Optional demographic context only — never used for alcohol qty */
  youngLegalAgeGuests: number;
  duration: EventDuration;
  vibe: EventVibe;
  season: EventSeason;
  venueProvidesAlcohol: VenueAlcohol;
  bar: BarPreferences;
  assumptions: PlanningAssumptions;
  drinks: SelectedDrink[];
};

export type DrinkPlanRow = {
  drinkId: string;
  label: string;
  category: BottleCategoryId;
  packageMl: number;
  plannedUnitsLow: number;
  plannedUnitsHigh: number;
  plannedUnitsMid: number;
  venueIncludedUnits: number;
  toPurchaseLow: number;
  toPurchaseHigh: number;
  toPurchaseMid: number;
  unitPrice: number | null;
  costLow: number | null;
  costHigh: number | null;
  costMid: number | null;
  isManual: boolean;
  isNonAlcoholic: boolean;
  notes: string[];
};

export type QuantityResult = {
  drinkers: number;
  legalAgeGuests: number;
  expectedGuests: number;
  servingsLow: number;
  servingsHigh: number;
  rows: DrinkPlanRow[];
  purchaseCostLow: number | null;
  purchaseCostHigh: number | null;
  purchaseCostMid: number | null;
  warnings: string[];
  assumptions: string[];
  missingPrices: boolean;
};

export type CorkageMode = "per_bottle" | "per_guest" | "flat" | "none";

export type SelfPurchaseCosts = {
  bottleCost: number;
  corkageMode: CorkageMode;
  corkagePerBottle: number;
  corkagePerGuest: number;
  corkageFlat: number;
  corkageGuestCount: number;
  transport: number;
  coolingStorage: number;
  ice: number;
  bartenders: number;
  softMixers: number;
  extraEquipment: number;
  /** Expected return on sealed bottles if agreed in writing — not guaranteed */
  expectedSealedReturn: number;
};

export type VenuePackageCosts = {
  packageTotal: number;
  perGuestPrice: number;
  perGuestCount: number;
  brandUpgrades: number;
  cocktailStationExtra: number;
  extraBartenders: number;
  notIncludedServices: number;
  taxesExtras: number;
};

export type CostComparisonResult = {
  selfTotalBeforeReturn: number;
  selfTotalAfterExpectedReturn: number;
  venueTotal: number;
  differenceSelfMinusVenue: number | null;
  selfBreakdown: { label: string; amount: number }[];
  venueBreakdown: { label: string; amount: number }[];
  caveats: string[];
  canDeclareWinner: boolean;
  cheaperSide: "self" | "venue" | "tie" | "unknown";
};

export const DEFAULT_ASSUMPTIONS: PlanningAssumptions = {
  servingsPerDrinkerLow: 2.5,
  servingsPerDrinkerHigh: 4,
  spiritPourMl: 40,
  winePourMl: 150,
  beerPourMl: 330,
  cocktailShare: 0.15,
  softPerGuestLow: 2,
  softPerGuestHigh: 4,
  waterLitersPerGuest: 0.75,
};

/** Vibe nudges the editable defaults slightly; duration does NOT auto-scale servings. */
export function vibeServingDefaults(vibe: EventVibe): Pick<
  PlanningAssumptions,
  "servingsPerDrinkerLow" | "servingsPerDrinkerHigh"
> {
  if (vibe === "calm_family") return { servingsPerDrinkerLow: 2, servingsPerDrinkerHigh: 3 };
  if (vibe === "party") return { servingsPerDrinkerLow: 3, servingsPerDrinkerHigh: 5 };
  return { servingsPerDrinkerLow: 2.5, servingsPerDrinkerHigh: 4 };
}

function clampNonNeg(n: number) {
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

function clampInt(n: number) {
  return Math.floor(clampNonNeg(n));
}

function isSpiritCategory(c: BottleCategoryId) {
  return c === "vodka" || c === "whiskey" || c === "arak" || c === "gin" || c === "rum" || c === "tequila";
}

function pourMlFor(category: BottleCategoryId, a: PlanningAssumptions) {
  if (category === "wine" || category === "cocktails") {
    // cocktails use spirit pour for base spirit demand attribution
    return category === "wine" ? a.winePourMl : a.spiritPourMl;
  }
  if (category === "beer") return a.beerPourMl;
  if (isSpiritCategory(category)) return a.spiritPourMl;
  return a.spiritPourMl;
}

/**
 * Normalize guest counts: drinkers cannot exceed legal-age guests;
 * legal-age cannot exceed expected guests; minors never receive alcohol qty.
 */
export function normalizeGuests(raw: {
  expectedGuests: number;
  legalAgeGuests: number;
  expectedDrinkers: number;
  youngLegalAgeGuests?: number;
}) {
  const expectedGuests = clampInt(raw.expectedGuests);
  const legalAgeGuests = Math.min(clampInt(raw.legalAgeGuests), expectedGuests);
  const expectedDrinkers = Math.min(clampInt(raw.expectedDrinkers), legalAgeGuests);
  const youngLegalAgeGuests = Math.min(
    clampInt(raw.youngLegalAgeGuests ?? 0),
    legalAgeGuests
  );
  return { expectedGuests, legalAgeGuests, expectedDrinkers, youngLegalAgeGuests };
}

/**
 * Split alcoholic demand across selected alcoholic drinks without double-counting.
 * Cocktails take a configurable share first; remaining demand is split evenly
 * across other alcoholic categories represented in the selection.
 */
export function allocateAlcoholicDemand(
  totalServings: number,
  drinks: SelectedDrink[],
  cocktailShare: number
): Map<string, number> {
  const map = new Map<string, number>();
  const alcoholic = drinks.filter((d) => !d.isNonAlcoholic);
  if (!alcoholic.length || totalServings <= 0) return map;

  const cocktailDrinks = alcoholic.filter((d) => d.category === "cocktails");
  const other = alcoholic.filter((d) => d.category !== "cocktails");

  const share = Math.min(1, Math.max(0, cocktailShare));
  let remaining = totalServings;

  if (cocktailDrinks.length && other.length) {
    const cocktailPool = totalServings * share;
    const eachC = cocktailPool / cocktailDrinks.length;
    for (const d of cocktailDrinks) map.set(d.id, eachC);
    remaining = totalServings - cocktailPool;
  } else if (cocktailDrinks.length && !other.length) {
    const eachC = totalServings / cocktailDrinks.length;
    for (const d of cocktailDrinks) map.set(d.id, eachC);
    remaining = 0;
  }

  if (other.length && remaining > 0) {
    // Group by category so 3 vodkas don't take 3× the category share
    const byCat = new Map<BottleCategoryId, SelectedDrink[]>();
    for (const d of other) {
      const list = byCat.get(d.category) || [];
      list.push(d);
      byCat.set(d.category, list);
    }
    const catCount = byCat.size;
    const perCat = remaining / catCount;
    for (const [, list] of byCat) {
      const each = perCat / list.length;
      for (const d of list) map.set(d.id, each);
    }
  }

  return map;
}

function servingsToUnits(servings: number, pourMl: number, packageMl: number) {
  if (packageMl <= 0 || pourMl <= 0 || servings <= 0) return 0;
  const mlNeeded = servings * pourMl;
  return Math.ceil(mlNeeded / packageMl);
}

export function computeQuantities(raw: EventInputs): QuantityResult {
  const guests = normalizeGuests(raw);
  const a = raw.assumptions;
  const warnings: string[] = [];
  const assumptions: string[] = [];

  if (raw.expectedDrinkers > raw.legalAgeGuests) {
    warnings.push("מספר השותים הוגבל למספר האורחים בגיל שתייה חוקי.");
  }
  if (raw.legalAgeGuests > raw.expectedGuests) {
    warnings.push("מספר האורחים בגיל שתייה חוקי הוגבל למספר האורחים הצפוי.");
  }
  if (guests.expectedDrinkers === 0 && raw.drinks.some((d) => !d.isNonAlcoholic)) {
    warnings.push("לא הוזנו אורחים צפויים לשתות אלכוהול — כמויות האלכוהול לתכנון הן 0.");
  }

  // Duration is shown for context only — we do NOT auto-inflate servings by hours.
  assumptions.push(
    "משך האירוע משמש להקשר תכנון בלבד ואינו מגדיל אוטומטית את מספר המנות המתוכננות."
  );
  assumptions.push(
    `הנחת תכנון: ${a.servingsPerDrinkerLow}–${a.servingsPerDrinkerHigh} מנות אלכוהול משוערות לשותה (ניתנות לעריכה).`
  );
  assumptions.push(
    `גודל מנה לתכנון: חריף ${a.spiritPourMl} מ״ל · יין ${a.winePourMl} מ״ל · בירה ${a.beerPourMl} מ״ל.`
  );
  assumptions.push(
    "המחשבון מחלק ביקוש בין הקטגוריות שנבחרו בלי להניח שכל אורח שותה מכל סוג."
  );
  assumptions.push(
    "אלה כמויות לתכנון רכישה בלבד, לא המלצה לצריכת אלכוהול. בפועל ייתכנו הבדלים משמעותיים בין אירועים."
  );
  assumptions.push(
    "אין כאן נתוני מכירות או «ניסיון כמויות» מאומת של Invistimo — רק הנחות תכנון שקופות לעריכה."
  );

  if (raw.youngLegalAgeGuests > 0) {
    assumptions.push(
      "מספר האורחים הצעירים בגיל שתייה חוקי הוא מידע להרכב קהל בלבד ואינו משנה את חישוב הכמויות."
    );
  }

  const drinkers = guests.expectedDrinkers;
  const servingsLow = drinkers * clampNonNeg(a.servingsPerDrinkerLow);
  const servingsHigh = drinkers * clampNonNeg(a.servingsPerDrinkerHigh);

  // Soft demand uses all expected guests (including minors) — water/soft drinks only
  const softLow = guests.expectedGuests * clampNonNeg(a.softPerGuestLow);
  const softHigh = guests.expectedGuests * clampNonNeg(a.softPerGuestHigh);

  if (raw.bar.venueProvidesSoftDrinks) {
    assumptions.push("סומן שהאולם מספק שתייה קלה ומים — הופחתו כמויות ה־NA לרכישה בהתאם.");
  }
  if (raw.venueProvidesAlcohol === "yes" || raw.bar.venuePackageIncludesSome) {
    assumptions.push(
      "חלק מהמשקאות עשויים להיות כלולים באולם — הזינו יחידות כלולות לכל משקה כדי למנוע ספירה כפולה."
    );
  }

  const alcoholAllocLow = allocateAlcoholicDemand(
    servingsLow,
    raw.drinks,
    a.cocktailShare
  );
  const alcoholAllocHigh = allocateAlcoholicDemand(
    servingsHigh,
    raw.drinks,
    a.cocktailShare
  );

  const naDrinks = raw.drinks.filter((d) => d.isNonAlcoholic);
  const rows: DrinkPlanRow[] = [];

  for (const drink of raw.drinks) {
    const notes: string[] = [];
    let plannedLow = 0;
    let plannedHigh = 0;

    if (drink.manualUnits != null && Number.isFinite(drink.manualUnits)) {
      const m = clampInt(drink.manualUnits);
      plannedLow = m;
      plannedHigh = m;
      notes.push("כמות ידנית");
    } else if (drink.isNonAlcoholic) {
      if (naDrinks.length === 0) {
        plannedLow = 0;
        plannedHigh = 0;
      } else {
        // Split soft servings across NA items; water gets liter-based planning if labeled
        const isWater = /מים|water/i.test(drink.label);
        if (isWater) {
          const litersLow = guests.expectedGuests * a.waterLitersPerGuest * 0.85;
          const litersHigh = guests.expectedGuests * a.waterLitersPerGuest * 1.15;
          const packL = drink.packageMl / 1000;
          plannedLow = packL > 0 ? Math.ceil(litersLow / packL) : 0;
          plannedHigh = packL > 0 ? Math.ceil(litersHigh / packL) : 0;
          notes.push("תכנון מים לפי ליטר לאורח");
        } else {
          const eachLow = softLow / naDrinks.length;
          const eachHigh = softHigh / naDrinks.length;
          // Treat soft “serving” ≈ package for cans/bottles when package is drink-sized
          const pour = Math.min(drink.packageMl, 330);
          plannedLow = servingsToUnits(eachLow, pour, drink.packageMl);
          plannedHigh = servingsToUnits(eachHigh, pour, drink.packageMl);
        }
        if (raw.bar.venueProvidesSoftDrinks) {
          // Venue soft drinks: zero purchase suggestion unless user overrides
          plannedLow = 0;
          plannedHigh = 0;
          notes.push("האולם מספק שתייה קלה — כמות רכישה אופסה");
        }
      }
    } else {
      const pour = pourMlFor(drink.category, a);
      const sLow = alcoholAllocLow.get(drink.id) || 0;
      const sHigh = alcoholAllocHigh.get(drink.id) || 0;
      plannedLow = servingsToUnits(sLow, pour, drink.packageMl);
      plannedHigh = servingsToUnits(sHigh, pour, drink.packageMl);

      // Meal wine / table wine hint — does not double-count; only annotates
      if (drink.category === "wine" && (raw.bar.wineBeerWithMeal || raw.bar.wineOnTables)) {
        notes.push("יין בארוחה/שולחנות — ודאו שלא סופרים פעמיים מול חבילת האולם");
      }
      if (drink.category === "beer" && raw.bar.wineBeerWithMeal) {
        notes.push("בירה בארוחה — בדקו מה כלול באולם");
      }
    }

    if (plannedHigh < plannedLow) plannedHigh = plannedLow;
    const plannedMid = Math.round((plannedLow + plannedHigh) / 2);
    const venueInc = clampInt(drink.venueIncludedUnits);
    let toPurchaseLow = Math.max(0, plannedLow - venueInc);
    let toPurchaseHigh = Math.max(0, plannedHigh - venueInc);
    let toPurchaseMid = Math.max(0, plannedMid - venueInc);

    if (drink.manualPurchaseUnits != null && Number.isFinite(drink.manualPurchaseUnits)) {
      const p = clampInt(drink.manualPurchaseUnits);
      toPurchaseLow = p;
      toPurchaseHigh = p;
      toPurchaseMid = p;
      notes.push("כמות רכישה ידנית");
    }

    const price =
      drink.unitPrice != null && Number.isFinite(drink.unitPrice) && drink.unitPrice > 0
        ? drink.unitPrice
        : null;

    rows.push({
      drinkId: drink.id,
      label: drink.label,
      category: drink.category,
      packageMl: drink.packageMl,
      plannedUnitsLow: plannedLow,
      plannedUnitsHigh: plannedHigh,
      plannedUnitsMid: plannedMid,
      venueIncludedUnits: venueInc,
      toPurchaseLow,
      toPurchaseHigh,
      toPurchaseMid,
      unitPrice: price,
      costLow: price != null ? toPurchaseLow * price : null,
      costHigh: price != null ? toPurchaseHigh * price : null,
      costMid: price != null ? toPurchaseMid * price : null,
      isManual: drink.manualUnits != null || drink.manualPurchaseUnits != null,
      isNonAlcoholic: drink.isNonAlcoholic,
      notes,
    });
  }

  const priced = rows.filter((r) => r.costMid != null);
  const missingPrices = rows.some((r) => r.toPurchaseMid > 0 && r.unitPrice == null);
  const purchaseCostLow = priced.length
    ? priced.reduce((s, r) => s + (r.costLow || 0), 0)
    : null;
  const purchaseCostHigh = priced.length
    ? priced.reduce((s, r) => s + (r.costHigh || 0), 0)
    : null;
  const purchaseCostMid = priced.length
    ? priced.reduce((s, r) => s + (r.costMid || 0), 0)
    : null;

  if (missingPrices) {
    warnings.push("חלק מהמשקאות לרכישה עדיין בלי מחיר ליחידה — סיכום העלות חלקי.");
  }
  if (!raw.drinks.length) {
    warnings.push("עדיין לא נבחרו משקאות — בחרו בקבוקים מהקטלוג או הוסיפו מותאם אישית.");
  }

  return {
    drinkers,
    legalAgeGuests: guests.legalAgeGuests,
    expectedGuests: guests.expectedGuests,
    servingsLow,
    servingsHigh,
    rows,
    purchaseCostLow,
    purchaseCostHigh,
    purchaseCostMid,
    warnings,
    assumptions,
    missingPrices,
  };
}

export function computeCostComparison(
  self: SelfPurchaseCosts,
  venue: VenuePackageCosts,
  opts?: { selfBottleCostFromPlan?: number | null }
): CostComparisonResult {
  const caveats: string[] = [];
  const bottleCost =
    opts?.selfBottleCostFromPlan != null && opts.selfBottleCostFromPlan > 0
      ? opts.selfBottleCostFromPlan
      : clampNonNeg(self.bottleCost);

  let corkage = 0;
  if (self.corkageMode === "per_bottle") {
    corkage = clampNonNeg(self.corkagePerBottle) * Math.max(1, Math.round(bottleCost > 0 ? 1 : 0));
    // When per-bottle corkage is set, user should pass bottle count via corkagePerBottle * units in UI;
    // here corkagePerBottle field is treated as TOTAL corkage if they enter total, OR we accept
    // corkagePerBottle as rate and they enter count in a dedicated way — see UI: we store total in corkagePerBottle when mode is per_bottle as "rate * bottles" already computed by UI.
    corkage = clampNonNeg(self.corkagePerBottle);
  } else if (self.corkageMode === "per_guest") {
    corkage = clampNonNeg(self.corkagePerGuest) * clampInt(self.corkageGuestCount);
  } else if (self.corkageMode === "flat") {
    corkage = clampNonNeg(self.corkageFlat);
  }

  const selfBreakdown = [
    { label: "עלות בקבוקים", amount: bottleCost },
    { label: "דמי מזיגה", amount: corkage },
    { label: "הובלה", amount: clampNonNeg(self.transport) },
    { label: "קירור ואחסון", amount: clampNonNeg(self.coolingStorage) },
    { label: "קרח", amount: clampNonNeg(self.ice) },
    { label: "ברמנים ושירות", amount: clampNonNeg(self.bartenders) },
    { label: "שתייה קלה ומיקסרים", amount: clampNonNeg(self.softMixers) },
    { label: "ציוד נוסף", amount: clampNonNeg(self.extraEquipment) },
  ].filter((x) => x.amount > 0 || x.label === "עלות בקבוקים");

  const selfTotalBeforeReturn = selfBreakdown.reduce((s, x) => s + x.amount, 0);
  const expectedReturn = clampNonNeg(self.expectedSealedReturn);
  if (expectedReturn > 0) {
    caveats.push(
      "החזר על בקבוקים סגורים הוזן כהערכה בלבד — לא להניח החזר מובטח בלי אישור בכתב מהספק."
    );
  }
  const selfTotalAfterExpectedReturn = Math.max(0, selfTotalBeforeReturn - expectedReturn);

  const venueGuestPart =
    clampNonNeg(venue.perGuestPrice) * clampInt(venue.perGuestCount);
  const venueBreakdown = [
    { label: "מחיר חבילת בר", amount: clampNonNeg(venue.packageTotal) },
    { label: "תמחור לפי אורח", amount: venueGuestPart },
    { label: "שדרוג מותגים", amount: clampNonNeg(venue.brandUpgrades) },
    { label: "עמדת קוקטיילים", amount: clampNonNeg(venue.cocktailStationExtra) },
    { label: "ברמנים נוספים", amount: clampNonNeg(venue.extraBartenders) },
    { label: "שירותים שאינם כלולים", amount: clampNonNeg(venue.notIncludedServices) },
    { label: "מסים ותוספות", amount: clampNonNeg(venue.taxesExtras) },
  ].filter((x) => x.amount > 0 || x.label === "מחיר חבילת בר");

  const venueTotal = venueBreakdown.reduce((s, x) => s + x.amount, 0);

  const selfHasData = selfTotalBeforeReturn > 0;
  const venueHasData = venueTotal > 0;

  if (!selfHasData || !venueHasData) {
    caveats.push("חסרים נתונים באחת החלופות — לא ניתן להכריז איזו אפשרות משתלמת יותר.");
  }
  caveats.push("השוו מה כלול בכל הצעה: ברמנים, קרח, כוסות, קירור, מותגים ומגבלות.");
  caveats.push("מחיר בקבוק נמוך בחנות לא בהכרח אומר שרכישה עצמאית תהיה זולה יותר.");

  let cheaperSide: CostComparisonResult["cheaperSide"] = "unknown";
  let difference: number | null = null;
  const canDeclareWinner = selfHasData && venueHasData;

  if (canDeclareWinner) {
    difference = selfTotalAfterExpectedReturn - venueTotal;
    if (Math.abs(difference) < 1) cheaperSide = "tie";
    else if (difference < 0) cheaperSide = "self";
    else cheaperSide = "venue";
  }

  return {
    selfTotalBeforeReturn,
    selfTotalAfterExpectedReturn,
    venueTotal,
    differenceSelfMinusVenue: difference,
    selfBreakdown,
    venueBreakdown,
    caveats,
    canDeclareWinner,
    cheaperSide,
  };
}

export function sumPurchaseUnits(rows: DrinkPlanRow[]) {
  return rows.reduce((s, r) => s + r.toPurchaseMid, 0);
}
