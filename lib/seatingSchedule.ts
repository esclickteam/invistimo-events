export const SEATING_SCHEDULE_FIELDS = [
  { key: "receptionStartTime", label: "שעת תחילת קבלת הפנים" },
  { key: "plannedChuppahTime", label: "שעת החופה המתוכננת" },
  { key: "plannedSeatingStartTime", label: "שעת תחילת ההושבה המתוכננת" },
  { key: "teamArrivalTime", label: "שעת הגעת הצוות" },
] as const;

export type SeatingScheduleFieldKey = (typeof SEATING_SCHEDULE_FIELDS)[number]["key"];

export type SeatingScheduleTimes = Record<SeatingScheduleFieldKey, string>;

export type SeatingScheduleActor = {
  userId: string;
  name: string;
};

export type SeatingScheduleChange = SeatingScheduleTimes & {
  changedAt: string;
  changedByUserId: string;
  changedByName: string;
};

export type SeatingScheduleRecord = SeatingScheduleTimes & {
  approvedAt: string;
  approvedByUserId: string;
  approvedByName: string;
  changes: SeatingScheduleChange[];
};

export type CustomerSeatingSchedule = Partial<SeatingScheduleTimes>;

export const SEATING_START_DEFAULT_WITH_RECEPTION =
  "תחילת שירות ההושבה תהיה בשעת תחילת קבלת הפנים, אלא אם נקבע אחרת במפורש.";

export const SEATING_START_DEFAULT_UNSCHEDULED =
  "תחילת שירות ההושבה תהיה במועד תחילת קבלת הפנים, כפי שייקבע בתיאום עם הלקוח.";

export type SeatingServiceStartDisplay =
  | { kind: "explicit"; time: string; label: string }
  | { kind: "default_reception"; time: string; text: string }
  | { kind: "default_unscheduled"; text: string };

const FROZEN_STATUSES = new Set(["sent", "viewed", "signed", "expired"]);

export function emptySeatingScheduleTimes(): SeatingScheduleTimes {
  return {
    receptionStartTime: "",
    plannedChuppahTime: "",
    plannedSeatingStartTime: "",
    teamArrivalTime: "",
  };
}

export function normalizeClockTime(value: unknown) {
  const raw = String(value ?? "").trim();
  const match = raw.match(/^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/);
  return match ? `${match[1]}:${match[2]}` : "";
}

export function clockMinusMinutes(value: string, minutes: number) {
  const normalized = normalizeClockTime(value);
  if (!normalized || !Number.isFinite(minutes)) return "";

  const [hours, mins] = normalized.split(":").map(Number);
  const total = (((hours * 60 + mins - minutes) % (24 * 60)) + 24 * 60) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function orderIncludesVenueSeating(upsells: unknown) {
  if (!Array.isArray(upsells)) return false;

  return upsells.some((upsell) => {
    if (!upsell || typeof upsell !== "object") return false;
    const record = upsell as { key?: unknown; title?: unknown };
    const key = String(record.key || "");
    const title = String(record.title || "").trim();
    return key === "venueSeating" || title === "הושבה באולם";
  });
}

/** All seating hour fields are optional — kept for callers that still list labels. */
export function missingSeatingScheduleLabels(_input?: unknown) {
  return [] as string[];
}

export function invalidSeatingScheduleLabels(input: unknown) {
  if (!input || typeof input !== "object") return [] as string[];
  const source = input as Record<string, unknown>;

  return SEATING_SCHEDULE_FIELDS.filter((field) => {
    const raw = String(source[field.key] ?? "").trim();
    if (!raw) return false;
    return !normalizeClockTime(raw);
  }).map((field) => field.label);
}

export function parseSeatingScheduleTimes(input: unknown) {
  if (!input || typeof input !== "object") {
    return {
      ok: true as const,
      times: emptySeatingScheduleTimes(),
      missing: [] as string[],
    };
  }

  const invalid = invalidSeatingScheduleLabels(input);
  if (invalid.length > 0) {
    return { ok: false as const, missing: invalid };
  }

  const source = input as Record<string, unknown>;
  const times = emptySeatingScheduleTimes();
  for (const field of SEATING_SCHEDULE_FIELDS) {
    times[field.key] = normalizeClockTime(source[field.key]);
  }

  return { ok: true as const, times, missing: [] as string[] };
}

export function seatingTimesEqual(
  left: Partial<SeatingScheduleTimes> | null | undefined,
  right: Partial<SeatingScheduleTimes> | null | undefined,
) {
  return SEATING_SCHEDULE_FIELDS.every(
    (field) =>
      normalizeClockTime(left?.[field.key]) ===
      normalizeClockTime(right?.[field.key]),
  );
}

function readStoredTimes(record: Partial<SeatingScheduleRecord> | null | undefined) {
  const times = emptySeatingScheduleTimes();
  for (const field of SEATING_SCHEDULE_FIELDS) {
    times[field.key] = normalizeClockTime(record?.[field.key]);
  }
  return times;
}

export function hasApprovedSeatingSchedule(
  record: Partial<SeatingScheduleRecord> | null | undefined,
) {
  if (!record || typeof record !== "object") return false;
  if (String(record.approvedAt || "").trim()) return true;
  return SEATING_SCHEDULE_FIELDS.some((field) =>
    Boolean(normalizeClockTime(record[field.key])),
  );
}

export function isSeatingScheduleFrozen(status: unknown) {
  return FROZEN_STATUSES.has(String(status || ""));
}

export function applySeatingScheduleUpdate({
  current,
  nextTimes,
  status,
  actor,
  now = new Date().toISOString(),
}: {
  current?: Partial<SeatingScheduleRecord> | null;
  nextTimes: SeatingScheduleTimes;
  status: unknown;
  actor: SeatingScheduleActor;
  now?: string;
}) {
  if (!isSeatingScheduleFrozen(status)) {
    return {
      ok: true as const,
      changed: !seatingTimesEqual(current, nextTimes),
      schedule: {
        ...nextTimes,
        approvedAt: now,
        approvedByUserId: actor.userId,
        approvedByName: actor.name,
        changes: [],
      },
    };
  }

  if (!hasApprovedSeatingSchedule(current)) {
    return {
      ok: false as const,
      error:
        "לא ניתן לקבוע לוחות זמנים מקוריים במסמך שכבר נשלח או נחתם. המסמך שנשלח נשאר כפי שהוא.",
    };
  }

  const approved = readStoredTimes(current);
  const changes = Array.isArray(current?.changes) ? current.changes : [];
  const latest = changes.length > 0 ? changes[changes.length - 1] : approved;

  if (seatingTimesEqual(latest, nextTimes)) {
    return {
      ok: true as const,
      changed: false,
      schedule: {
        ...approved,
        approvedAt: String(current?.approvedAt || ""),
        approvedByUserId: String(current?.approvedByUserId || ""),
        approvedByName: String(current?.approvedByName || ""),
        changes,
      },
    };
  }

  return {
    ok: true as const,
    changed: true,
    schedule: {
      ...approved,
      approvedAt: String(current?.approvedAt || ""),
      approvedByUserId: String(current?.approvedByUserId || ""),
      approvedByName: String(current?.approvedByName || ""),
      changes: [
        ...changes,
        {
          ...nextTimes,
          changedAt: now,
          changedByUserId: actor.userId,
          changedByName: actor.name,
        },
      ],
    },
  };
}

export function toCustomerSeatingSchedule(
  record: unknown,
): CustomerSeatingSchedule | null {
  if (!record || typeof record !== "object") return null;

  const source = record as Record<string, unknown>;
  const visible: CustomerSeatingSchedule = {};

  for (const field of SEATING_SCHEDULE_FIELDS) {
    const value = normalizeClockTime(source[field.key]);
    if (value) visible[field.key] = value;
  }

  return Object.keys(visible).length > 0 ? visible : null;
}

export function seatingServiceStartDisplay(
  schedule: CustomerSeatingSchedule | Partial<SeatingScheduleTimes> | null | undefined,
): SeatingServiceStartDisplay {
  const explicit = normalizeClockTime(schedule?.plannedSeatingStartTime);
  if (explicit) {
    return {
      kind: "explicit",
      time: explicit,
      label: "שעת תחילת ההושבה המתוכננת",
    };
  }

  const reception = normalizeClockTime(schedule?.receptionStartTime);
  if (reception) {
    return {
      kind: "default_reception",
      time: reception,
      text: SEATING_START_DEFAULT_WITH_RECEPTION,
    };
  }

  return {
    kind: "default_unscheduled",
    text: SEATING_START_DEFAULT_UNSCHEDULED,
  };
}

/** View-mode schedules section: only when venue seating is included and at least one hour was set. */
export function hasVisibleSeatingScheduleContent(
  schedule: CustomerSeatingSchedule | Partial<SeatingScheduleTimes> | null | undefined,
  includesVenueSeating: boolean,
) {
  if (!includesVenueSeating) return false;
  return SEATING_SCHEDULE_FIELDS.some((field) =>
    Boolean(normalizeClockTime(schedule?.[field.key])),
  );
}
