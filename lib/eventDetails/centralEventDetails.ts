/**
 * מקור מידע מרכזי לפרטי אירוע ואפשרויות מתנה.
 *
 * Event הוא מקור האמת אחרי סנכרון מכתיבת הלקוח. בזמן קריאה לאורחים
 * אסור להציג קליפת ברירת מחדל ("הזמנה חדשה", 00:00, תאריך יצירה)
 * אם בהזמנה שמורה גרסה אמיתית שהלקוח הגדיר.
 *
 * Invitation.giftOptions / publicEventPage.gifts / Event.giftCreditUrl
 * נשארים לתאימות לאחור ומסונכרנים בכתיבה.
 */

export const PLACEHOLDER_EVENT_TITLES = new Set([
  "",
  "הזמנה חדשה",
  "הזמנה חדשה (ארכיון — לא בשימוש)",
  "אירוע חדש",
  "האירוע שלך",
  "אירוע ללא שם",
]);

const PLACEHOLDER_TIME_RE = /^0{1,2}:0{2}(?::0{2})?$/;

export type CentralGiftOptions = {
  creditEnabled: boolean;
  creditUrl: string;
  payboxEnabled: boolean;
  payboxUrl: string;
  bitEnabled: boolean;
  bitPhone: string;
};

export type CentralEventDetails = {
  title: string;
  eventType: string;
  hostsNames: string;
  date: string;
  time: string;
  receptionTime: string;
  ceremonyTime: string;
  guestNote: string;
  venueName: string;
  address: string;
  city: string;
  wazeUrl: string;
  googleMapsUrl: string;
  parkingNotes: string;
  eventImageUrl: string;
  invitationImageUrl: string;
  gifts: CentralGiftOptions;
};

export const EMPTY_GIFTS: CentralGiftOptions = {
  creditEnabled: false,
  creditUrl: "",
  payboxEnabled: false,
  payboxUrl: "",
  bitEnabled: false,
  bitPhone: "",
};

export const EMPTY_CENTRAL_EVENT_DETAILS: CentralEventDetails = {
  title: "",
  eventType: "wedding",
  hostsNames: "",
  date: "",
  time: "",
  receptionTime: "",
  ceremonyTime: "",
  guestNote: "",
  venueName: "",
  address: "",
  city: "",
  wazeUrl: "",
  googleMapsUrl: "",
  parkingNotes: "",
  eventImageUrl: "",
  invitationImageUrl: "",
  gifts: { ...EMPTY_GIFTS },
};

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : String(value ?? "").trim();
}

export function isPlaceholderEventTitle(value: unknown) {
  return PLACEHOLDER_EVENT_TITLES.has(cleanString(value));
}

export function isPlaceholderEventTime(value: unknown) {
  const raw = cleanString(value).replace(/[^\d:]/g, "");
  return !raw || PLACEHOLDER_TIME_RE.test(raw);
}

export function normalizeEventDateValue(value: unknown) {
  if (!value) return "";

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  const raw = cleanString(value);
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function firstRealString(
  values: unknown[],
  isPlaceholder: (value: string) => boolean = (value) => !value
) {
  for (const value of values) {
    const cleaned = cleanString(value);
    if (cleaned && !isPlaceholder(cleaned)) return cleaned;
  }
  return "";
}

export function pickGuestFacingTitle(event?: any, invitation?: any) {
  return firstRealString(
    [
      invitation?.title,
      invitation?.eventTitle,
      invitation?.eventName,
      event?.title,
      event?.eventName,
    ],
    isPlaceholderEventTitle
  );
}

export function pickGuestFacingDate(event?: any, invitation?: any) {
  return (
    normalizeEventDateValue(invitation?.eventDate) ||
    normalizeEventDateValue(invitation?.date) ||
    normalizeEventDateValue(event?.eventDate) ||
    normalizeEventDateValue(event?.date)
  );
}

export function pickGuestFacingTime(event?: any, invitation?: any) {
  return firstRealString(
    [
      invitation?.eventTime,
      invitation?.time,
      event?.eventTime,
      event?.time,
    ],
    isPlaceholderEventTime
  );
}

export function pickGuestFacingEventType(event?: any, invitation?: any) {
  return (
    firstRealString([invitation?.eventType, event?.eventType]) || "wedding"
  );
}

function pickLocationSource(event?: any, invitation?: any) {
  const invitationLoc = invitation?.location || {};
  const eventLoc = event?.location || {};
  const invitationHasPlace =
    cleanString(invitationLoc.name) ||
    cleanString(invitationLoc.address) ||
    cleanString(invitationLoc.formattedAddress) ||
    cleanString(invitationLoc.placeName);
  return invitationHasPlace ? invitationLoc : eventLoc || invitationLoc;
}

/**
 * Fields written from the live invitation onto Event on every client save.
 * Never copies placeholder titles or 00:00 as if they were real details.
 */
export function buildEventCoreSyncFromInvitation(invitation: any) {
  const title = firstRealString([invitation?.title, invitation?.eventTitle], isPlaceholderEventTitle);
  const date = normalizeEventDateValue(
    invitation?.eventDate || invitation?.date
  );
  const time = firstRealString(
    [invitation?.eventTime, invitation?.time],
    isPlaceholderEventTime
  );
  const eventType = cleanString(invitation?.eventType);
  const loc = invitation?.location || {};

  const eventSet: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (title) eventSet.title = title;
  if (date) eventSet.date = date;
  if (time) eventSet.time = time;
  if (eventType) eventSet.eventType = eventType;

  if (invitation?.hostsNames !== undefined) {
    eventSet.hostsNames = cleanString(invitation.hostsNames);
  }
  if (invitation?.receptionTime !== undefined) {
    eventSet.receptionTime = cleanString(invitation.receptionTime);
  }
  if (invitation?.ceremonyTime !== undefined) {
    eventSet.ceremonyTime = cleanString(invitation.ceremonyTime);
  }
  if (invitation?.guestNote !== undefined) {
    eventSet.guestNote = cleanString(invitation.guestNote);
  }
  if (invitation?.city !== undefined) {
    eventSet.city = cleanString(invitation.city);
  }
  if (invitation?.googleMapsUrl !== undefined) {
    eventSet.googleMapsUrl = cleanString(invitation.googleMapsUrl);
  }
  if (invitation?.parkingNotes !== undefined) {
    eventSet.parkingNotes = cleanString(invitation.parkingNotes);
  }

  if (
    loc &&
    (cleanString(loc.name) ||
      cleanString(loc.address) ||
      loc.lat != null ||
      loc.lng != null)
  ) {
    eventSet["location.name"] = cleanString(loc.name);
    eventSet["location.address"] = cleanString(loc.address);
    eventSet["location.lat"] = loc.lat ?? null;
    eventSet["location.lng"] = loc.lng ?? null;
    eventSet["location.placeId"] = cleanString(loc.placeId);
    eventSet["location.placeName"] = cleanString(loc.placeName);
    eventSet["location.formattedAddress"] = cleanString(loc.formattedAddress);
    eventSet["location.wazeLat"] = loc.wazeLat ?? null;
    eventSet["location.wazeLng"] = loc.wazeLng ?? null;
    eventSet["location.wazeUrl"] = cleanString(loc.wazeUrl);
  }

  return eventSet;
}

export type GuestEventFieldMismatch = {
  field: string;
  eventValue: string;
  invitationValue: string;
  guestWouldSee: string;
};

export function detectGuestEventDetailsMismatch(event?: any, invitation?: any) {
  const resolved = resolveCentralEventDetails(event, invitation);
  const fields: GuestEventFieldMismatch[] = [];

  const compare = (
    field: string,
    eventValue: unknown,
    invitationValue: unknown,
    guestWouldSee: string
  ) => {
    const eventClean = cleanString(eventValue);
    const invitationClean = cleanString(invitationValue);
    if (!invitationClean) return;
    if (eventClean === invitationClean) return;
    if (
      field === "date" &&
      normalizeEventDateValue(eventValue) &&
      normalizeEventDateValue(eventValue) ===
        normalizeEventDateValue(invitationValue)
    ) {
      return;
    }
    if (
      field === "time" &&
      isPlaceholderEventTime(eventValue) &&
      isPlaceholderEventTime(invitationValue)
    ) {
      return;
    }
    fields.push({
      field,
      eventValue: eventClean,
      invitationValue: invitationClean,
      guestWouldSee,
    });
  };

  compare("title", event?.title, invitation?.title, resolved.title);
  compare(
    "date",
    event?.date || event?.eventDate,
    invitation?.eventDate || invitation?.date,
    resolved.date
  );
  compare(
    "time",
    event?.time || event?.eventTime,
    invitation?.eventTime || invitation?.time,
    resolved.time
  );
  compare("eventType", event?.eventType, invitation?.eventType, resolved.eventType);

  const eventVenue = cleanString(event?.location?.name);
  const invitationVenue = cleanString(invitation?.location?.name);
  compare("venueName", eventVenue, invitationVenue, resolved.venueName);

  return fields;
}

export function toHttpUrl(value: unknown) {
  const raw = cleanString(value);
  if (!raw) return "";
  if (/^javascript:/i.test(raw)) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("//") && raw.length > 4) return `https:${raw}`;
  if (/^www\./i.test(raw)) return `https://${raw}`;
  if (/^[a-z0-9.-]+\.[a-z]{2,}([/?#]|$)/i.test(raw)) return `https://${raw}`;
  return "";
}

export function isValidHttpUrl(value: unknown) {
  const url = toHttpUrl(value);
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/** Israeli mobile: 05X-XXXXXXX / +9725XXXXXXXX / 9725XXXXXXXX */
export function isValidIsraeliPhone(value: unknown) {
  const raw = cleanString(value).replace(/[\s\-()]/g, "");
  if (!raw) return false;
  if (/^05\d{8}$/.test(raw)) return true;
  if (/^\+9725\d{8}$/.test(raw)) return true;
  if (/^9725\d{8}$/.test(raw)) return true;
  return false;
}

export function normalizeBitPhone(value: unknown) {
  const raw = cleanString(value).replace(/[\s\-()]/g, "");
  if (/^\+9725\d{8}$/.test(raw)) return `0${raw.slice(4)}`;
  if (/^9725\d{8}$/.test(raw)) return `0${raw.slice(3)}`;
  return raw;
}

export function validateCentralGifts(gifts: CentralGiftOptions): string[] {
  const errors: string[] = [];

  if (gifts.creditEnabled && !isValidHttpUrl(gifts.creditUrl)) {
    errors.push("יש להזין קישור תשלום באשראי תקין כאשר המתנה באשראי מופעלת");
  }

  if (gifts.payboxEnabled && !isValidHttpUrl(gifts.payboxUrl)) {
    errors.push("יש להזין קישור PayBox תקין כאשר PayBox מופעל");
  }

  if (gifts.bitEnabled && !isValidIsraeliPhone(gifts.bitPhone)) {
    errors.push("יש להזין מספר טלפון ישראלי תקין לקבלת מתנות ב-Bit");
  }

  return errors;
}

export function normalizeCentralGifts(input: any): CentralGiftOptions {
  const creditEnabled =
    input?.creditEnabled === true || input?.creditEnabled === "true";
  const payboxEnabled =
    input?.payboxEnabled === true || input?.payboxEnabled === "true";
  const bitPhone = normalizeBitPhone(input?.bitPhone);
  const bitEnabled =
    input?.bitEnabled === true ||
    input?.bitEnabled === "true" ||
    (input?.bitEnabled == null && Boolean(bitPhone));

  return {
    creditEnabled,
    creditUrl: creditEnabled ? toHttpUrl(input?.creditUrl) : "",
    payboxEnabled,
    payboxUrl: payboxEnabled ? toHttpUrl(input?.payboxUrl) : "",
    bitEnabled,
    bitPhone: bitEnabled ? bitPhone : "",
  };
}

/**
 * Resolve gifts preferring Event.gifts (central), then Invitation mirrors.
 * Only enabled+configured methods are returned as public URLs/phones.
 */
export function resolveCentralGifts(event?: any, invitation?: any) {
  const fromEvent = event?.gifts;
  const giftOptions = invitation?.giftOptions || {};
  const publicGifts = invitation?.publicEventPage?.gifts || {};
  const hasCentralEventGifts =
    fromEvent &&
    (typeof fromEvent.creditEnabled === "boolean" ||
      typeof fromEvent.payboxEnabled === "boolean" ||
      typeof fromEvent.bitEnabled === "boolean" ||
      cleanString(fromEvent.creditUrl) ||
      cleanString(fromEvent.payboxUrl) ||
      cleanString(fromEvent.bitPhone));

  // When Event.gifts is populated, respect its enable flags strictly.
  if (hasCentralEventGifts) {
    const creditUrl = fromEvent.creditEnabled
      ? toHttpUrl(fromEvent.creditUrl)
      : "";
    const payboxUrl = fromEvent.payboxEnabled
      ? toHttpUrl(fromEvent.payboxUrl)
      : "";
    const bitPhone = fromEvent.bitEnabled
      ? normalizeBitPhone(fromEvent.bitPhone)
      : "";

    return {
      creditEnabled: Boolean(creditUrl),
      creditUrl,
      payboxEnabled: Boolean(payboxUrl),
      payboxUrl,
      bitEnabled: Boolean(bitPhone),
      bitPhone,
    } satisfies CentralGiftOptions;
  }

  // Legacy invitation mirrors (pre-migration): giftOptions toggles + public fallbacks.
  const creditUrlFromOptions = giftOptions.creditEnabled
    ? toHttpUrl(giftOptions.creditUrl)
    : "";
  const payboxUrlFromOptions = giftOptions.payboxEnabled
    ? toHttpUrl(giftOptions.payboxUrl)
    : "";

  const creditUrl =
    creditUrlFromOptions ||
    toHttpUrl(publicGifts.creditUrl) ||
    toHttpUrl(event?.giftCreditUrl);

  const payboxUrl =
    payboxUrlFromOptions || toHttpUrl(publicGifts.payboxUrl);

  const bitPhone = normalizeBitPhone(publicGifts.bitPhone);

  return {
    creditEnabled: Boolean(creditUrl),
    creditUrl,
    payboxEnabled: Boolean(payboxUrl),
    payboxUrl,
    bitEnabled: Boolean(bitPhone),
    bitPhone,
  } satisfies CentralGiftOptions;
}

export function resolveCentralEventDetails(
  event?: any,
  invitation?: any
): CentralEventDetails {
  const gifts = resolveCentralGifts(event, invitation);
  const loc = pickLocationSource(event, invitation);
  const publicPage = invitation?.publicEventPage || {};
  const parking = publicPage.parking || {};

  const venueName =
    cleanString(loc.name) ||
    cleanString(loc.placeName) ||
    cleanString(invitation?.venueHallName) ||
    cleanString(event?.venueHallName);

  const address =
    cleanString(loc.address) ||
    cleanString(loc.formattedAddress);

  const city =
    cleanString(event?.city) ||
    cleanString(invitation?.city) ||
    extractCityFromAddress(address);

  const coupleImage = publicPage.coupleImage || {};
  const eventImageUrl =
    cleanString(event?.eventImage?.url) ||
    (coupleImage.enabled ? cleanString(coupleImage.url) : "") ||
    cleanString(coupleImage.url);

  const invitationImageUrl =
    cleanString(invitation?.headerImageUrl) ||
    cleanString(invitation?.previewImageUrl) ||
    cleanString(invitation?.previewImage) ||
    cleanString(invitation?.imageUrl);

  const guestNote =
    cleanString(event?.guestNote) ||
    (publicPage.note?.enabled ? cleanString(publicPage.note?.text) : "") ||
    cleanString(publicPage.note?.text);

  const scheduleItems = Array.isArray(publicPage.schedule?.items)
    ? publicPage.schedule.items
    : [];

  const receptionFromSchedule = scheduleItems.find((item: any) =>
    /קבלת פנים|reception/i.test(cleanString(item?.title))
  );
  const ceremonyFromSchedule = scheduleItems.find((item: any) =>
    /חופה|טקס|ceremony|chuppah/i.test(cleanString(item?.title))
  );

  return {
    title: pickGuestFacingTitle(event, invitation),
    eventType: pickGuestFacingEventType(event, invitation),
    hostsNames:
      cleanString(event?.hostsNames) ||
      cleanString(invitation?.hostsNames) ||
      "",
    date: pickGuestFacingDate(event, invitation),
    time: pickGuestFacingTime(event, invitation),
    receptionTime:
      cleanString(event?.receptionTime) ||
      cleanString(receptionFromSchedule?.time),
    ceremonyTime:
      cleanString(event?.ceremonyTime) ||
      cleanString(ceremonyFromSchedule?.time),
    guestNote,
    venueName,
    address,
    city,
    wazeUrl: toHttpUrl(loc.wazeUrl) || toHttpUrl(event?.wazeUrl),
    googleMapsUrl:
      toHttpUrl(event?.googleMapsUrl) ||
      toHttpUrl(publicPage?.navigation?.googleMapsUrl),
    parkingNotes:
      cleanString(event?.parkingNotes) ||
      cleanString(parking.instructions),
    eventImageUrl,
    invitationImageUrl,
    gifts,
  };
}

function extractCityFromAddress(address: string) {
  if (!address) return "";
  const parts = address
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .filter((p) => !/^ישראל$/i.test(p) && !/^\d{5,7}$/.test(p));
  if (parts.length >= 2) return parts[parts.length - 1] || "";
  return "";
}

/** Build Invitation mirrors from central gifts (dual-write). */
export function giftsToInvitationMirrors(gifts: CentralGiftOptions) {
  return {
    giftOptions: {
      creditEnabled: gifts.creditEnabled,
      creditUrl: gifts.creditEnabled ? gifts.creditUrl : "",
      payboxEnabled: gifts.payboxEnabled,
      payboxUrl: gifts.payboxEnabled ? gifts.payboxUrl : "",
    },
    publicGifts: {
      creditUrl: gifts.creditEnabled ? gifts.creditUrl : "",
      payboxUrl: gifts.payboxEnabled ? gifts.payboxUrl : "",
      bitPhone: gifts.bitEnabled ? gifts.bitPhone : "",
      bitUrl: "",
    },
    giftCreditUrl: gifts.creditEnabled ? gifts.creditUrl : "",
  };
}

export function eventTypeHeadline(
  eventType: string,
  hostsNames: string,
  title: string
) {
  const hosts = cleanString(hostsNames);
  const name = hosts || cleanString(title) || "האירוע";

  switch (eventType) {
    case "wedding":
      return hosts ? `החתונה של ${hosts}` : title || "החתונה";
    case "bar-mitzvah":
      return hosts ? `בר המצווה של ${hosts}` : title || "בר מצווה";
    case "bat-mitzvah":
      return hosts ? `בת המצווה של ${hosts}` : title || "בת מצווה";
    case "brit":
      return hosts ? `הברית של ${hosts}` : title || "ברית";
    case "brita":
      return hosts ? `הבריתה של ${hosts}` : title || "בריתה";
    case "henna":
      return hosts ? `החינה של ${hosts}` : title || "חינה";
    default:
      return title || name;
  }
}

export function eventTypeGreeting(eventType: string) {
  switch (eventType) {
    case "wedding":
      return "מחכים לחגוג איתכם!";
    case "bar-mitzvah":
    case "bat-mitzvah":
      return "שמחים לחגוג איתכם!";
    case "brit":
    case "brita":
      return "שמחים לחלוק איתכם את השמחה!";
    default:
      return "נשמח לראותכם!";
  }
}

/**
 * Merge gifts from legacy sources for migration.
 * Prefer Invitation.giftOptions enabled flags; fill Bit from publicEventPage.
 * Do not invent conflicting winners — document conflicts.
 */
export function mergeGiftsForMigration(event?: any, invitation?: any) {
  const giftOptions = invitation?.giftOptions || {};
  const publicGifts = invitation?.publicEventPage?.gifts || {};
  const existing = event?.gifts || {};

  const creditUrl =
    toHttpUrl(existing.creditUrl) ||
    toHttpUrl(giftOptions.creditUrl) ||
    toHttpUrl(publicGifts.creditUrl) ||
    toHttpUrl(event?.giftCreditUrl);

  const payboxUrl =
    toHttpUrl(existing.payboxUrl) ||
    toHttpUrl(giftOptions.payboxUrl) ||
    toHttpUrl(publicGifts.payboxUrl);

  const bitPhone =
    normalizeBitPhone(existing.bitPhone) ||
    normalizeBitPhone(publicGifts.bitPhone);

  const creditEnabled =
    existing.creditEnabled === true ||
    giftOptions.creditEnabled === true ||
    Boolean(creditUrl && (giftOptions.creditEnabled !== false));

  const payboxEnabled =
    existing.payboxEnabled === true ||
    giftOptions.payboxEnabled === true ||
    Boolean(payboxUrl && (giftOptions.payboxEnabled !== false));

  const bitEnabled =
    existing.bitEnabled === true || Boolean(bitPhone);

  const conflicts: string[] = [];
  const creditCandidates = [
    toHttpUrl(giftOptions.creditUrl),
    toHttpUrl(publicGifts.creditUrl),
    toHttpUrl(event?.giftCreditUrl),
  ].filter(Boolean);
  if (new Set(creditCandidates).size > 1) {
    conflicts.push("creditUrl");
  }
  const payboxCandidates = [
    toHttpUrl(giftOptions.payboxUrl),
    toHttpUrl(publicGifts.payboxUrl),
  ].filter(Boolean);
  if (new Set(payboxCandidates).size > 1) {
    conflicts.push("payboxUrl");
  }

  return {
    gifts: normalizeCentralGifts({
      creditEnabled: creditEnabled && Boolean(creditUrl),
      creditUrl,
      payboxEnabled: payboxEnabled && Boolean(payboxUrl),
      payboxUrl,
      bitEnabled: bitEnabled && Boolean(bitPhone),
      bitPhone,
    }),
    conflicts,
  };
}
