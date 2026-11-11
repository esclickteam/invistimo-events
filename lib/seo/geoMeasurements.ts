/**
 * GEO Intelligence checkpoints for the 11 Nov 2026 public wave.
 * Not rendered on the site. There is still no Search Console API.
 *
 * Baseline numbers come only from the frozen export in
 * docs/seo/monitoring/pr-519-gsc-baseline-2026-11-05.json (8 Aug–5 Nov 2026).
 * A missing export is null. It is not stored as zero.
 *
 * Each checkpoint stays "עדיין מוקדם למדוד" until a later manual export is
 * written into `after`. Filling a checkpoint does not edit a page.
 */

export const MEASUREMENT_VERDICTS = [
  "השתפר",
  "ללא שינוי",
  "ירד",
  "עדיין מוקדם למדוד",
] as const;

export type MeasurementVerdict = (typeof MEASUREMENT_VERDICTS)[number];

export type SearchMetrics = {
  impressions: number | null;
  clicks: number | null;
  ctr: number | null;
  averagePosition: number | null;
};

export type MeasurementCheckpoint = {
  day: 7 | 14 | 28;
  date: string;
  verdict: MeasurementVerdict;
  after: SearchMetrics | null;
  rankingUrl: string | null;
  note: string;
};

export type GeoMeasurement = {
  id: string;
  query: string;
  targetUrl: string;
  measurementDate: "2026-11-11";
  baselineWindow: { start: "2026-08-08"; end: "2026-11-05" };
  baseline: SearchMetrics;
  /** URL that received the impressions in the frozen export. Null when the export did not name one. */
  currentRankingUrl: string | null;
  cannibalization: string;
  checkpoints: MeasurementCheckpoint[];
};

const EMPTY: SearchMetrics = {
  impressions: null,
  clicks: null,
  ctr: null,
  averagePosition: null,
};

function openCheckpoints(note: string): MeasurementCheckpoint[] {
  return (
    [
      [7, "2026-11-18"],
      [14, "2026-11-25"],
      [28, "2026-12-09"],
    ] as const
  ).map(([day, date]) => ({
    day,
    date,
    verdict: "עדיין מוקדם למדוד" as const,
    after: null,
    rankingUrl: null,
    note,
  }));
}

const WAITING =
  "אין ייצוא Search Console אחרי 11.11.2026. לא למלא אפסים ולא לשנות עמוד לפי הבדיקה.";

function row(
  id: string,
  query: string,
  targetUrl: string,
  baseline: SearchMetrics,
  currentRankingUrl: string | null,
  cannibalization: string
): GeoMeasurement {
  return {
    id,
    query,
    targetUrl,
    measurementDate: "2026-11-11",
    baselineWindow: { start: "2026-08-08", end: "2026-11-05" },
    baseline,
    currentRankingUrl,
    cannibalization,
    checkpoints: openCheckpoints(WAITING),
  };
}

export const GEO_MEASUREMENTS: GeoMeasurement[] = [
  row(
    "rsvp-head",
    "אישורי הגעה",
    "/rsvp",
    { impressions: 177, clicks: 3, ctr: 0.0169, averagePosition: 29.3 },
    null,
    "הייצוא לא פירסם חלוקה לפי URL. החשיפות התפצלו בין מדריך המחיר, /rsvp, מדריכים ווואטסאפ."
  ),
  row("rsvp-events", "אישורי הגעה לאירועים", "/rsvp", EMPTY, null, "אין ספירה נפרדת בייצוא עד 5.11.2026."),
  row("rsvp-service", "שירות אישורי הגעה", "/rsvp", EMPTY, null, "אין ספירה נפרדת בייצוא עד 5.11.2026."),
  row("rsvp-system", "מערכת אישורי הגעה", "/rsvp", EMPTY, null, "הביטוי לא הופיע בייצוא עד 5.11.2026."),
  row(
    "wedding-rsvp",
    "אישורי הגעה לחתונה",
    "/rsvp/chatuna",
    { impressions: 81, clicks: 5, ctr: 0.062, averagePosition: 35.8 },
    "/rsvp",
    "פיצול: /rsvp 42 חשיפות במיקום 26.3, מדריך המחיר 29 חשיפות, /rsvp/chatuna 9 חשיפות במיקום 45.8."
  ),
  row("save-the-date", "Save the Date", "/rsvp/save-the-date", EMPTY, null, "אין ספירה בייצוא עד 5.11.2026."),
  row(
    "save-the-date-he",
    "סייב דה דייט",
    "/rsvp/save-the-date",
    EMPTY,
    null,
    "אותו URL כמו Save the Date. אין ספירה נפרדת בייצוא."
  ),
  row(
    "digital-invite-wedding",
    "הזמנה דיגיטלית לחתונה",
    "/invitations/chatuna",
    EMPTY,
    null,
    "אין ספירה מספרית בייצוא עד 5.11.2026."
  ),
  row(
    "wedding-seating",
    "סידורי הושבה לחתונה",
    "/seating-explained",
    { impressions: 27, clicks: 0, ctr: 0, averagePosition: 29.6 },
    "/info/guides/wedding-seating-arrangements",
    "המדריך קיבל 25 חשיפות במיקום 25.1. עמוד השירות לא הופיע בייצוא."
  ),
  row(
    "seating-tables",
    "סידור שולחנות לחתונה",
    "/seating-explained",
    EMPTY,
    null,
    "אין ספירה נפרדת. היעד זהה לסידורי הושבה לחתונה."
  ),
  row(
    "whatsapp-rsvp",
    "אישורי הגעה בוואטסאפ",
    "/rsvp/whatsapp",
    { impressions: 35, clicks: 0, ctr: 0, averagePosition: 35.8 },
    "/rsvp/whatsapp",
    "פיצול: /rsvp/whatsapp 12 חשיפות במיקום 39.3, /rsvp 6 חשיפות במיקום 19.3. 17 חשיפות לא שויכו."
  ),
  row("free-rsvp", "אישורי הגעה חינם", "/pricing", EMPTY, null, "אין ספירה בייצוא עד 5.11.2026. אין מוצר חינם."),
  row(
    "cost-rsvp-wedding",
    "כמה עולים אישורי הגעה לחתונה",
    "/info/guides/cost-rsvp-wedding",
    EMPTY,
    null,
    "אין ספירה לביטוי המחיר עצמו. בביטוי החתונה המדריך הופיע עם 29 חשיפות, וזה פיצול מול /rsvp/chatuna."
  ),
  row(
    "excel-guest-list",
    "רשימת מוזמנים לחתונה אקסל",
    "/info/guides/wedding-guest-list-excel",
    EMPTY,
    null,
    "המדריך עלה ב־11.11.2026. אין חשיפות בייצוא הקודם. רשימת מוזמנים, טבלת מוזמנים ורשימת אורחים יושבים על אותו URL."
  ),
];
