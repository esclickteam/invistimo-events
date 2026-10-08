/**
 * מקור מידע מרכזי לפרטי אירוע ואפשרויות מתנה.
 *
 * Event הוא מקור האמת. Invitation.giftOptions / publicEventPage.gifts /
 * Event.giftCreditUrl נשארים לתאימות לאחור ומסונכרנים בכתיבה.
 */

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
  const loc = event?.location || invitation?.location || {};
  const publicPage = invitation?.publicEventPage || {};
  const parking = publicPage.parking || {};

  const venueName =
    cleanString(loc.name) ||
    cleanString(loc.placeName) ||
    cleanString(event?.venueHallName) ||
    cleanString(invitation?.venueHallName);

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
    title:
      cleanString(event?.title) ||
      cleanString(invitation?.title) ||
      "האירוע",
    eventType:
      cleanString(event?.eventType) ||
      cleanString(invitation?.eventType) ||
      "wedding",
    hostsNames:
      cleanString(event?.hostsNames) ||
      cleanString(invitation?.hostsNames) ||
      "",
    date: String(
      event?.date ||
        invitation?.eventDate ||
        invitation?.date ||
        ""
    ),
    time:
      cleanString(event?.time) ||
      cleanString(invitation?.eventTime) ||
      cleanString(invitation?.time),
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
