/**
 * Invistimo arrival and venue-commitment planner.
 *
 * Original planning model for this page. The percentages are editable
 * assumptions for a conversation with the venue. They are not measured
 * attendance, not a contract recommendation, and not a seating plan.
 *
 * Counting
 * 1. Invited guests are the sum of the groups.
 * 2. Status counts are not a second guest list. If their sum is larger than
 *    the invited total, the forecast is withheld until the numbers fit.
 * 3. When the sum is smaller, the difference is unclassified. Only that
 *    remainder is forecast from group bands, and it is not counted again.
 * 4. Declined guests contribute 0 arrivals and are not forecast again.
 * 5. A confirmed count is data the user entered. A visible show-up rate
 *    (default 96%, with a band of 4 points on each side) turns it into a
 *    forecast. Day, season, and distance never change that confirmed count.
 * 6. Undecided and pending guests use their own visible bands.
 * 7. Only the unclassified remainder is forecast from group bands, weighted
 *    by each group's share of the invited total.
 * 8. Day, season, and distance shift forecast bands only: groups, pending,
 *    and undecided.
 * 9. An empty venue minimum stays empty. The result is then a planning range,
 *    not an invented contractual commitment.
 * 10. Reserve meals are added to the central estimate for portion planning.
 *     They are not extra guests and are not drawn as chairs.
 * 11. Chairs illustrate the central estimate. Outlined chairs appear only when
 *     a typed contract minimum is higher than that estimate.
 */

export const BUILTIN_GROUPS = [
  { id: "closeFamily", label: "משפחה קרובה", low: 90, mid: 96, high: 99 },
  { id: "extendedFamily", label: "משפחה מורחבת", low: 64, mid: 78, high: 90 },
  { id: "closeFriends", label: "חברים קרובים", low: 72, mid: 85, high: 94 },
  { id: "acquaintances", label: "חברים ומכרים", low: 40, mid: 58, high: 74 },
  { id: "workStudyArmy", label: "עבודה, לימודים וצבא", low: 30, mid: 48, high: 66 },
  { id: "parentsFriends", label: "חברים של ההורים", low: 44, mid: 62, high: 78 },
] as const;

export type BuiltinGroupId = (typeof BUILTIN_GROUPS)[number]["id"];

export const CUSTOM_DEFAULT_BAND = { low: 40, mid: 60, high: 78 };
export const PENDING_DEFAULT_BAND = { low: 20, mid: 45, high: 70 };
export const UNDECIDED_DEFAULT_BAND = { low: 32, mid: 52, high: 72 };
export const SHOW_UP_DEFAULT = 96;
export const SHOW_UP_SPREAD = 4;
/** A group whose central rate stays at or above this is drawn as high expectation. */
export const HIGH_EXPECTATION_MID = 75;
export const ILLUSTRATION_CAP = 1500;

export const DEFAULT_COUNTS: Record<BuiltinGroupId, number> = {
  closeFamily: 36,
  extendedFamily: 48,
  closeFriends: 40,
  acquaintances: 36,
  workStudyArmy: 24,
  parentsFriends: 16,
};

export type Weekday = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";
export type Season = "spring" | "summer" | "autumn" | "winter";
export type Distance = "near" | "regional" | "far" | "destination";

export const DAY_SHIFT: Record<Weekday, number> = {
  sun: -5,
  mon: -5,
  tue: -5,
  wed: -5,
  thu: 4,
  fri: 1,
  sat: -3,
};

export const SEASON_SHIFT: Record<Season, number> = {
  spring: 0,
  summer: -4,
  autumn: 0,
  winter: -3,
};

export const DISTANCE_SHIFT: Record<Distance, number> = {
  near: 3,
  regional: 0,
  far: -7,
  destination: -16,
};

export const DAY_LABEL: Record<Weekday, string> = {
  sun: "ראשון",
  mon: "שני",
  tue: "שלישי",
  wed: "רביעי",
  thu: "חמישי",
  fri: "שישי",
  sat: "שבת",
};

export const SEASON_LABEL: Record<Season, string> = {
  spring: "אביב",
  summer: "קיץ",
  autumn: "סתיו",
  winter: "חורף",
};

export const DISTANCE_LABEL: Record<Distance, string> = {
  near: "קרוב, עד כחצי שעה",
  regional: "אזורי, עד כשעה",
  far: "רחוק, מעל שעה",
  destination: "יעד מרוחק או טיסה",
};

export type Band = { low: number; mid: number; high: number };
export type GuestEntryMode = "total" | "groups";

/**
 * A general headcount and a group breakdown are alternate ways to enter
 * the same invited list. Only one of them is passed into the forecast.
 */
export function groupsForCalculation(
  mode: GuestEntryMode,
  totalGuests: number,
  groups: GroupInput[],
  overallBand: Band = CUSTOM_DEFAULT_BAND
): GroupInput[] {
  if (mode !== "total") return groups;
  return [
    {
      id: "overall",
      label: "כלל המוזמנים",
      count: clampCount(totalGuests),
      lowPct: clampPct(overallBand.low),
      midPct: clampPct(overallBand.mid),
      highPct: clampPct(overallBand.high),
    },
  ];
}

/** Split a headcount by the built-in sample mix. The parts sum to the total. */
export function distributeByDefaultMix(total: number): Record<BuiltinGroupId, number> {
  const people = clampCount(total);
  const weights = BUILTIN_GROUPS.map((group) => DEFAULT_COUNTS[group.id]);
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
  const exact = weights.map((weight) => (people * weight) / weightSum);
  const counts = exact.map((value) => Math.floor(value));
  let remaining = people - counts.reduce((sum, count) => sum + count, 0);
  const order = exact
    .map((value, index) => ({ index, fraction: value - counts[index] }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  for (const item of order) {
    if (remaining <= 0) break;
    counts[item.index] += 1;
    remaining -= 1;
  }
  const distributed = {} as Record<BuiltinGroupId, number>;
  BUILTIN_GROUPS.forEach((group, index) => {
    distributed[group.id] = counts[index];
  });
  return distributed;
}

export type GroupInput = {
  id: string;
  label: string;
  count: number;
  lowPct: number;
  midPct: number;
  highPct: number;
};

export type ArrivalInputs = {
  groups: GroupInput[];
  weekday: Weekday | "";
  season: Season | "";
  distance: Distance | "";
  confirmed: number;
  declined: number;
  pending: number;
  undecided: number;
  showUpPct: number;
  pendingBand: Band;
  undecidedBand: Band;
  venueMin: number | null;
  capacity: number | null;
  reserveMeals: number;
  mealPrice: number | null;
  extraMealPrice: number | null;
};

export type ChairKind = "confirmed" | "high" | "undecided" | "low" | "commitment" | "empty";

export type ChairCounts = Record<Exclude<ChairKind, "empty">, number>;

export type ArrivalResult = {
  totalInvited: number;
  confirmedReceived: number;
  declinedReceived: number;
  undecidedReceived: number;
  pendingReceived: number;
  remainder: number;
  rangeLow: number;
  rangeMid: number;
  rangeHigh: number;
  isRange: boolean;
  recommendedPortions: number;
  reserveMeals: number;
  venueMin: number | null;
  contractMissing: boolean;
  capacity: number | null;
  unusedMeals: number | null;
  unusedCost: number | null;
  extraMeals: number | null;
  extraCost: number | null;
  overCapacity: boolean;
  contextShift: number;
  chairs: ChairCounts;
  warnings: string[];
  assumptions: string[];
  forecastReady: boolean;
  statusSum: number;
};

const WEEKDAYS = new Set<string>(Object.keys(DAY_SHIFT));
const SEASONS = new Set<string>(Object.keys(SEASON_SHIFT));
const DISTANCES = new Set<string>(Object.keys(DISTANCE_SHIFT));

export function clampCount(value: number) {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.floor(value);
}

export function clampPct(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

export function contextShift(weekday: Weekday | "", season: Season | "", distance: Distance | "") {
  return (weekday ? DAY_SHIFT[weekday] : 0) + (season ? SEASON_SHIFT[season] : 0) + (distance ? DISTANCE_SHIFT[distance] : 0);
}

function money(meals: number, price: number) {
  return Math.round(meals * price);
}

function shiftBand(band: Band, shift: number): { band: Band; swapped: boolean } {
  let low = clampPct(band.low);
  let mid = clampPct(band.mid);
  let high = clampPct(band.high);
  let swapped = false;
  if (low > high) {
    const swap = low;
    low = high;
    high = swap;
    swapped = true;
  }
  if (mid < low) mid = low;
  if (mid > high) mid = high;
  low = clampPct(low + shift);
  mid = clampPct(mid + shift);
  high = clampPct(high + shift);
  if (mid < low) mid = low;
  if (high < mid) high = mid;
  return { band: { low, mid, high }, swapped };
}

function roundShare(people: number, pct: number) {
  return Math.round((people * pct) / 100);
}

type EffectiveGroup = GroupInput & { band: Band };

function remainderForecast(remainder: number, groups: EffectiveGroup[], total: number, key: keyof Band) {
  if (remainder <= 0 || total <= 0) return { high: 0, low: 0 };
  let highRaw = 0;
  let lowRaw = 0;
  for (const group of groups) {
    if (group.count <= 0) continue;
    const contribution = remainder * (group.count / total) * (group.band[key] / 100);
    if (group.band.mid >= HIGH_EXPECTATION_MID) highRaw += contribution;
    else lowRaw += contribution;
  }
  return { high: Math.round(highRaw), low: Math.round(lowRaw) };
}

function emptyChairs(): ChairCounts {
  return { confirmed: 0, high: 0, undecided: 0, low: 0, commitment: 0 };
}

export function mapKnownGroupName(name: string): BuiltinGroupId | null {
  const normalized = name.trim().replace(/\s+/g, " ");
  if (!normalized) return null;
  if (/חברים של ההורים|חברי ההורים|חברים של הורים/.test(normalized)) return "parentsFriends";
  if (/משפחה מורחבת|משפחה רחוקה|דודים|בני דודים/.test(normalized)) return "extendedFamily";
  if (/משפחה קרובה|קרובי משפחה/.test(normalized)) return "closeFamily";
  if (/חברים קרובים|חברות קרובות/.test(normalized)) return "closeFriends";
  if (/חברים ומכרים|מכרים|חברים רחוקים/.test(normalized)) return "acquaintances";
  if (/עבודה|לימודים|צבא|קולגות|עמיתים/.test(normalized)) return "workStudyArmy";
  return null;
}

export function computeArrival(raw: ArrivalInputs): ArrivalResult {
  const groups = raw.groups.map((group) => ({
    ...group,
    label: group.label.trim() || "קבוצה אישית",
    count: clampCount(group.count),
    lowPct: clampPct(group.lowPct),
    midPct: clampPct(group.midPct),
    highPct: clampPct(group.highPct),
  }));

  const groupTotal = groups.reduce((sum, group) => sum + group.count, 0);
  const requested = {
    confirmed: clampCount(raw.confirmed),
    declined: clampCount(raw.declined),
    undecided: clampCount(raw.undecided),
    pending: clampCount(raw.pending),
  };
  const requestedSum = requested.confirmed + requested.declined + requested.undecided + requested.pending;

  const totalInvited = groupTotal;
  const warnings: string[] = [];
  if (requestedSum > totalInvited) {
    const overflow = requestedSum - totalInvited;
    const lead =
      requested.confirmed > totalInvited
        ? `מספר המאשרים (${requested.confirmed.toLocaleString("he-IL")}) גדול ממספר המוזמנים (${totalInvited.toLocaleString("he-IL")}).`
        : `סכום הסטטוסים (${requestedSum.toLocaleString("he-IL")}) גדול ממספר המוזמנים (${totalInvited.toLocaleString("he-IL")}).`;
    const venueMin = raw.venueMin == null ? null : clampCount(raw.venueMin);
    const capacity = raw.capacity == null ? null : clampCount(raw.capacity);
    return {
      totalInvited,
      confirmedReceived: requested.confirmed,
      declinedReceived: requested.declined,
      undecidedReceived: requested.undecided,
      pendingReceived: requested.pending,
      remainder: 0,
      rangeLow: 0,
      rangeMid: 0,
      rangeHigh: 0,
      isRange: false,
      recommendedPortions: 0,
      reserveMeals: clampCount(raw.reserveMeals),
      venueMin,
      contractMissing: venueMin == null,
      capacity,
      unusedMeals: null,
      unusedCost: null,
      extraMeals: null,
      extraCost: null,
      overCapacity: false,
      contextShift: 0,
      chairs: emptyChairs(),
      warnings: [
        `${lead} חורגים ב־${overflow.toLocaleString("he-IL")} אנשים, ולכן אין תחזית. כל אדם יכול להופיע רק בסטטוס אחד.`,
      ],
      assumptions: [
        "התחזית מושהית עד שסכום האישורים, הסירובים, הממתינים והמתלבטים אינו עובר את מספר המוזמנים.",
      ],
      forecastReady: false,
      statusSum: requestedSum,
    };
  }

  let room = totalInvited;
  const confirmedReceived = Math.min(requested.confirmed, room);
  room -= confirmedReceived;
  const declinedReceived = Math.min(requested.declined, room);
  room -= declinedReceived;
  const undecidedReceived = Math.min(requested.undecided, room);
  room -= undecidedReceived;
  const pendingReceived = Math.min(requested.pending, room);
  room -= pendingReceived;
  const remainder = room;

  const shift = contextShift(raw.weekday, raw.season, raw.distance);
  let swapped = false;
  const effectiveGroups: EffectiveGroup[] = groups.map((group) => {
    const shifted = shiftBand({ low: group.lowPct, mid: group.midPct, high: group.highPct }, shift);
    if (shifted.swapped) swapped = true;
    return { ...group, band: shifted.band };
  });
  const pendingShift = shiftBand(raw.pendingBand, shift);
  const undecidedShift = shiftBand(raw.undecidedBand, shift);
  if (pendingShift.swapped || undecidedShift.swapped) swapped = true;

  const showMid = clampPct(raw.showUpPct);
  const showLow = clampPct(showMid - SHOW_UP_SPREAD);
  const showHigh = clampPct(showMid + SHOW_UP_SPREAD);

  function edge(show: number, pendingPct: number, undecidedPct: number, key: keyof Band) {
    const confirmedPart = roundShare(confirmedReceived, show);
    const undecidedPart = roundShare(undecidedReceived, undecidedPct);
    const pendingPart = roundShare(pendingReceived, pendingPct);
    const fromGroups = remainderForecast(remainder, effectiveGroups, totalInvited, key);
    return {
      total: confirmedPart + undecidedPart + pendingPart + fromGroups.high + fromGroups.low,
      confirmedPart,
      undecidedPart,
      pendingPart,
      highPart: fromGroups.high,
      lowPart: fromGroups.low + pendingPart,
    };
  }

  const lowEdge = edge(showLow, pendingShift.band.low, undecidedShift.band.low, "low");
  const midEdge = edge(showMid, pendingShift.band.mid, undecidedShift.band.mid, "mid");
  const highEdge = edge(showHigh, pendingShift.band.high, undecidedShift.band.high, "high");

  let rangeLow = lowEdge.total;
  let rangeMid = midEdge.total;
  let rangeHigh = highEdge.total;
  if (rangeLow > rangeMid) rangeLow = rangeMid;
  if (rangeHigh < rangeMid) rangeHigh = rangeMid;

  const reserveMeals = clampCount(raw.reserveMeals);
  const recommendedPortions = rangeMid + reserveMeals;
  const venueMin = raw.venueMin == null ? null : clampCount(raw.venueMin);
  const capacity = raw.capacity == null ? null : clampCount(raw.capacity);
  const mealPrice = raw.mealPrice == null || !Number.isFinite(raw.mealPrice) ? null : Math.max(0, raw.mealPrice);
  const extraMealPrice =
    raw.extraMealPrice == null || !Number.isFinite(raw.extraMealPrice) ? null : Math.max(0, raw.extraMealPrice);

  const contractMissing = venueMin == null;
  const unusedMeals = !contractMissing && venueMin > rangeMid ? venueMin - rangeMid : null;
  const unusedCost = unusedMeals != null && unusedMeals > 0 && mealPrice != null ? money(unusedMeals, mealPrice) : null;
  const extraMeals = !contractMissing && recommendedPortions > venueMin ? recommendedPortions - venueMin : null;
  const extraCost = extraMeals != null && extraMeals > 0 && extraMealPrice != null ? money(extraMeals, extraMealPrice) : null;
  const overCapacity = capacity != null && recommendedPortions > capacity;

  if (overCapacity && capacity != null) {
    warnings.push(`תכנון המנות (${recommendedPortions}) גבוה מקיבולת האולם שהוזנה (${capacity}).`);
  }
  if (!contractMissing && rangeHigh < venueMin) {
    warnings.push("ההתחייבות שהוזנה גבוהה גם מהקצה העליון של טווח ההגעה. זו השוואה לנתונים, לא המלצה לחתום על המספר.");
  }

  const chairs = emptyChairs();
  chairs.confirmed = midEdge.confirmedPart;
  chairs.high = midEdge.highPart;
  chairs.undecided = midEdge.undecidedPart;
  chairs.low = midEdge.lowPart;
  chairs.commitment = !contractMissing && venueMin > rangeMid ? venueMin - rangeMid : 0;

  const assumptions = [
    "האחוזים הם הנחות תכנון של Invistimo. אפשר לשנות אותם. הם אינם נתון מדוד ואינם מספר לחתימה.",
    "אישור וסירוב שהוזנו נשארים נתונים. יום, עונה ומרחק מזיזים רק את התחזית למי שעדיין בלי תשובה סופית.",
    confirmedReceived > 0
      ? `${confirmedReceived} אישרו הגעה בפועל. מתוכם נלקחים ${Math.round(showMid)}% כהערכת הופעה, בטווח ${Math.round(showLow)}%–${Math.round(showHigh)}%.`
      : "עדיין לא הוזנו אישורי הגעה. אין במסך הזה אישורים שהתקבלו.",
    declinedReceived > 0
      ? `${declinedReceived} סירבו. הם לא נספרים כמגיעים ולא נכנסים שוב לתחזית של הקבוצות.`
      : "לא הוזנו סירובים.",
    undecidedReceived > 0
      ? `${undecidedReceived} מתלבטים לפי טווח ${Math.round(undecidedShift.band.low)}%–${Math.round(undecidedShift.band.high)}%, אמצע ${Math.round(undecidedShift.band.mid)}%.`
      : "לא הוזנו מתלבטים.",
    pendingReceived > 0
      ? `${pendingReceived} ממתינים לתשובה לפי טווח ${Math.round(pendingShift.band.low)}%–${Math.round(pendingShift.band.high)}%, אמצע ${Math.round(pendingShift.band.mid)}%. הם לא נספרים כמי שלא יגיעו.`
      : "לא הוזנו ממתינים לתשובה.",
    remainder > 0
      ? `${remainder} מוזמנים בלי סטטוס אישור מחושבים לפי שיעורי הקבוצות, אחרי התאמה של ${shift > 0 ? "+" : ""}${shift} נקודות.`
      : "אין יתרת מוזמנים בלי סטטוס, ולכן שיעורי הקבוצות לא מוסיפים אנשים מעבר לאישורים.",
    contractMissing
      ? "לא הוזנה התחייבות מהחוזה. מוצג טווח תכנון בלבד, בלי מספר התחייבות."
      : `ההתחייבות המינימלית שהוזנה היא ${venueMin}. היא מוצגת כנתון חוזה, לא כהמלצה.` ,
    reserveMeals > 0
      ? `${reserveMeals} מנות רזרבה נוספות על ההערכה המרכזית לצורך תכנון מנות. הן לא מוצגות ככיסאות ולא כאורחים.`
      : "לא הוזנו מנות רזרבה.",
    "השולחנות בהמחשה הם תמונה של המספרים בלבד. הם לא שולחנות מהאירוע ולא משנים את סקיצת ההושבה.",
  ];
  if (swapped) {
    assumptions.push("טווח אחוזים שהוזן מהגבוה לנמוך סודר כך שהקצה הנמוך נשאר מתחת לקצה הגבוה.");
  }
  if (shift !== 0) {
    const parts = [
      raw.weekday ? DAY_LABEL[raw.weekday] : "",
      raw.season ? SEASON_LABEL[raw.season] : "",
      raw.distance ? DISTANCE_LABEL[raw.distance] : "",
    ].filter(Boolean);
    assumptions.splice(
      2,
      0,
      `התאמת ההקשר (${parts.join(" · ")}) היא ${shift > 0 ? "+" : ""}${shift} נקודות אחוז על תחזיות בלבד.`
    );
  }

  return {
    totalInvited,
    confirmedReceived,
    declinedReceived,
    undecidedReceived,
    pendingReceived,
    remainder,
    rangeLow,
    rangeMid,
    rangeHigh,
    isRange: rangeLow !== rangeHigh,
    recommendedPortions,
    reserveMeals,
    venueMin,
    contractMissing,
    capacity,
    unusedMeals,
    unusedCost,
    extraMeals,
    extraCost,
    overCapacity,
    contextShift: shift,
    chairs,
    warnings,
    assumptions,
    forecastReady: true,
    statusSum: requestedSum,
  };
}

export function illustrateChairs(counts: ChairCounts, seatsPerTable: number, cap = ILLUSTRATION_CAP) {
  const seats = Math.min(16, Math.max(4, clampCount(seatsPerTable) || 10));
  const sequence: ChairKind[] = [
    ...Array.from({ length: counts.confirmed }, () => "confirmed" as const),
    ...Array.from({ length: counts.high }, () => "high" as const),
    ...Array.from({ length: counts.undecided }, () => "undecided" as const),
    ...Array.from({ length: counts.low }, () => "low" as const),
    ...Array.from({ length: counts.commitment }, () => "commitment" as const),
  ];
  const drawn = sequence.slice(0, cap);
  const truncated = sequence.length - drawn.length;
  const tables: ChairKind[][] = [];
  for (let index = 0; index < drawn.length; index += seats) {
    const table = drawn.slice(index, index + seats);
    while (table.length < seats) table.push("empty");
    tables.push(table);
  }
  if (tables.length === 0) {
    tables.push(Array.from({ length: seats }, () => "empty" as const));
  }
  return {
    seats,
    tables,
    truncated,
    drawnPeople: Math.min(cap, counts.confirmed + counts.high + counts.undecided + counts.low),
    drawnCommitment: drawn.filter((kind) => kind === "commitment").length,
  };
}

export type SharePayload = ArrivalInputs & {
  seatsPerTable: number;
  guestMode?: GuestEntryMode;
  totalGuests?: number;
  overallBand?: Band;
};

function isWeekday(value: string): value is Weekday {
  return WEEKDAYS.has(value);
}
function isSeason(value: string): value is Season {
  return SEASONS.has(value);
}
function isDistance(value: string): value is Distance {
  return DISTANCES.has(value);
}

function readCountList(value: string | null, expected: number) {
  const parts = (value || "").split(",");
  if (parts.length !== expected) return null;
  return parts.map((part) => clampCount(Number(part)));
}

function readBandList(value: string | null, expected: number) {
  const parts = (value || "").split(",");
  if (parts.length !== expected) return null;
  return parts.map((part) => clampPct(Number(part)));
}

export function encodeArrivalQuery(payload: SharePayload) {
  const builtin = BUILTIN_GROUPS.map((group) => payload.groups.find((item) => item.id === group.id));
  if (builtin.some((group) => !group)) return "";
  const custom = payload.groups.filter((group) => !BUILTIN_GROUPS.some((item) => item.id === group.id));
  const params = new URLSearchParams();
  params.set("v", "2");
  params.set("g", builtin.map((group) => String(clampCount(group!.count))).join(","));
  params.set("gl", builtin.map((group) => String(clampPct(group!.lowPct))).join(","));
  params.set("gm", builtin.map((group) => String(clampPct(group!.midPct))).join(","));
  params.set("gh", builtin.map((group) => String(clampPct(group!.highPct))).join(","));
  if (custom.length > 0) {
    params.set(
      "cg",
      custom
        .map((group) =>
          [
            encodeURIComponent(group.label),
            clampCount(group.count),
            clampPct(group.lowPct),
            clampPct(group.midPct),
            clampPct(group.highPct),
          ].join("~")
        )
        .join("|")
    );
  }
  if (payload.weekday) params.set("day", payload.weekday);
  if (payload.season) params.set("season", payload.season);
  if (payload.distance) params.set("dist", payload.distance);
  params.set("yes", String(clampCount(payload.confirmed)));
  params.set("no", String(clampCount(payload.declined)));
  params.set("wait", String(clampCount(payload.pending)));
  params.set("maybe", String(clampCount(payload.undecided)));
  params.set("show", String(clampPct(payload.showUpPct)));
  params.set(
    "pb",
    [payload.pendingBand.low, payload.pendingBand.mid, payload.pendingBand.high].map((n) => clampPct(n)).join(",")
  );
  params.set(
    "ub",
    [payload.undecidedBand.low, payload.undecidedBand.mid, payload.undecidedBand.high].map((n) => clampPct(n)).join(",")
  );
  params.set("min", payload.venueMin == null ? "" : String(clampCount(payload.venueMin)));
  params.set("cap", payload.capacity == null ? "" : String(clampCount(payload.capacity)));
  params.set("res", String(clampCount(payload.reserveMeals)));
  params.set("price", payload.mealPrice == null ? "" : String(Math.max(0, Math.round(payload.mealPrice))));
  params.set("extra", payload.extraMealPrice == null ? "" : String(Math.max(0, Math.round(payload.extraMealPrice))));
  params.set("seats", String(Math.min(16, Math.max(4, clampCount(payload.seatsPerTable) || 10))));
  if (payload.guestMode === "total") {
    const band = payload.overallBand || CUSTOM_DEFAULT_BAND;
    params.set("gmode", "total");
    params.set("gtot", String(clampCount(payload.totalGuests || 0)));
    params.set("ob", [band.low, band.mid, band.high].map((value) => clampPct(value)).join(","));
  }
  return params.toString();
}

function optionalCount(value: string | null) {
  if (value == null || value.trim() === "") return null;
  return clampCount(Number(value));
}

export function decodeArrivalQuery(search: string): SharePayload | null {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  if (params.get("v") !== "2") return null;
  const counts = readCountList(params.get("g"), BUILTIN_GROUPS.length);
  const lows = readBandList(params.get("gl"), BUILTIN_GROUPS.length);
  const mids = readBandList(params.get("gm"), BUILTIN_GROUPS.length);
  const highs = readBandList(params.get("gh"), BUILTIN_GROUPS.length);
  const pending = readBandList(params.get("pb"), 3);
  const undecided = readBandList(params.get("ub"), 3);
  if (!counts || !lows || !mids || !highs || !pending || !undecided) return null;

  const groups: GroupInput[] = BUILTIN_GROUPS.map((group, index) => ({
    id: group.id,
    label: group.label,
    count: counts[index],
    lowPct: lows[index],
    midPct: mids[index],
    highPct: highs[index],
  }));

  const customRaw = params.get("cg");
  if (customRaw) {
    try {
      customRaw.split("|").forEach((row, index) => {
        const [labelPart, countPart, lowPart, midPart, highPart] = row.split("~");
        if (!countPart) return;
        groups.push({
          id: `custom-${index + 1}`,
          label: decodeURIComponent(labelPart || "") || "קבוצה אישית",
          count: clampCount(Number(countPart)),
          lowPct: clampPct(Number(lowPart)),
          midPct: clampPct(Number(midPart)),
          highPct: clampPct(Number(highPart)),
        });
      });
    } catch {
      return null;
    }
  }

  const day = params.get("day") || "";
  const season = params.get("season") || "";
  const distance = params.get("dist") || "";

  return {
    groups,
    weekday: isWeekday(day) ? day : "",
    season: isSeason(season) ? season : "",
    distance: isDistance(distance) ? distance : "",
    confirmed: clampCount(Number(params.get("yes") || 0)),
    declined: clampCount(Number(params.get("no") || 0)),
    pending: clampCount(Number(params.get("wait") || 0)),
    undecided: clampCount(Number(params.get("maybe") || 0)),
    showUpPct: clampPct(Number(params.get("show") || SHOW_UP_DEFAULT)),
    pendingBand: { low: pending[0], mid: pending[1], high: pending[2] },
    undecidedBand: { low: undecided[0], mid: undecided[1], high: undecided[2] },
    venueMin: optionalCount(params.get("min")),
    capacity: optionalCount(params.get("cap")),
    reserveMeals: clampCount(Number(params.get("res") || 0)),
    mealPrice: optionalCount(params.get("price")),
    extraMealPrice: optionalCount(params.get("extra")),
    seatsPerTable: Math.min(16, Math.max(4, clampCount(Number(params.get("seats") || 10)))),
    guestMode: params.get("gmode") === "total" ? "total" : "groups",
    totalGuests: clampCount(Number(params.get("gtot") || 0)),
    overallBand: (() => {
      const band = readBandList(params.get("ob"), 3);
      return band
        ? { low: band[0], mid: band[1], high: band[2] }
        : { low: CUSTOM_DEFAULT_BAND.low, mid: CUSTOM_DEFAULT_BAND.mid, high: CUSTOM_DEFAULT_BAND.high };
    })(),
  };
}
