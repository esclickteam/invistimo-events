import rawPhoneMetadata from "libphonenumber-js/metadata.max.json";
import {
  getCountryCallingCode as callingCodeWithMetadata,
  getCountries as countriesWithMetadata,
  isSupportedCountry as supportedWithMetadata,
  parsePhoneNumberFromString as parseWithMetadata,
  type CountryCode,
  type MetadataJson,
} from "libphonenumber-js/core";

function phoneMetadata(): MetadataJson {
  const value = rawPhoneMetadata as MetadataJson & { default?: MetadataJson };
  if (value?.countries) return value;
  if (value?.default?.countries) return value.default;
  throw new Error("libphonenumber metadata failed to load");
}

const metadata = phoneMetadata();

function parsePhoneNumberFromString(text: string, country?: CountryCode) {
  return country
    ? parseWithMetadata(text, country, metadata)
    : parseWithMetadata(text, metadata);
}

function getCountries() {
  return countriesWithMetadata(metadata);
}

function getCountryCallingCode(country: CountryCode) {
  return callingCodeWithMetadata(country, metadata);
}

function isSupportedCountry(country: string): country is CountryCode {
  return supportedWithMetadata(country as CountryCode, metadata);
}

export function listPhoneCountries() {
  return getCountries();
}

export function countryCallingCode(country: CountryCode) {
  return getCountryCallingCode(country);
}

export type { CountryCode };

/**
 * Guest and WhatsApp numbers.
 * Israeli numbers without a country code stay Israeli.
 * A value that already has an international prefix is never rewritten to +972.
 * A national number of another country is accepted only when that country is explicit.
 */

export type PhoneParseOptions = {
  country?: string | null;
  countryExplicit?: boolean;
};

export type ParsedGuestPhone = {
  ok: true;
  e164: string;
  digits: string;
  country: CountryCode | "";
  callingCode: string;
  nationalNumber: string;
  type: string;
};

export type PhoneParseFailure = {
  ok: false;
  reason: "missing" | "invalid";
};

export type WhatsappRecipient =
  | {
      ok: true;
      to: string;
      e164: string;
      country: CountryCode | "";
      callingCode: string;
    }
  | {
      ok: false;
      reason: "missing" | "invalid" | "unsupported_country";
      message: string;
    };

export const INVALID_GUEST_PHONE_MESSAGE =
  "מספר הטלפון אינו תקין. בחרו את המדינה הנכונה, או הקלידו מספר מלא עם קידומת בינלאומית כמו +1.";

/**
 * WhatsApp is not offered in these countries (WhatsApp Help Center).
 * A valid number there can be stored, but it is not a WhatsApp recipient.
 */
export const WHATSAPP_UNAVAILABLE_COUNTRIES = new Set<CountryCode>([
  "CN",
  "CU",
  "IR",
  "KP",
  "SY",
]);

const NON_WHATSAPP_TYPES = new Set([
  "FIXED_LINE",
  "TOLL_FREE",
  "PREMIUM_RATE",
  "SHARED_COST",
  "PAGER",
  "VOICEMAIL",
  "UAN",
]);

const CALLING_CODE_DEFAULTS: Record<string, CountryCode> = {
  "1": "US",
  "44": "GB",
};

type PhoneNumberParsed = NonNullable<
  ReturnType<typeof parsePhoneNumberFromString>
>;

function digitsOnly(value: unknown) {
  return String(value ?? "").replace(/\D/g, "");
}

function cleanPhoneInput(value: unknown) {
  const compact = String(value ?? "")
    .trim()
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[().\-\s]/g, "");
  const plus = compact.startsWith("+");
  const idd00 = !plus && compact.startsWith("00");
  const digits = compact.replace(/\D/g, "");
  return { plus, idd00, digits };
}

export function asCountryCode(value: unknown): CountryCode | undefined {
  const code = String(value ?? "")
    .trim()
    .toUpperCase();
  if (isSupportedCountry(code)) return code;
  return undefined;
}

function countryLabel(code: string) {
  if (!code) return "";
  try {
    return new Intl.DisplayNames(["he"], { type: "region" }).of(code) || code;
  } catch {
    return code;
  }
}

function fromParsed(parsed: PhoneNumberParsed): ParsedGuestPhone {
  return {
    ok: true,
    e164: parsed.number,
    digits: String(parsed.number || "").replace(/\D/g, ""),
    country: parsed.country || "",
    callingCode: String(parsed.countryCallingCode || ""),
    nationalNumber: String(parsed.nationalNumber || ""),
    type: parsed.getType() || "",
  };
}

function invalid(reason: "missing" | "invalid"): PhoneParseFailure {
  return { ok: false, reason };
}

function acceptCountryParse(
  parsed: PhoneNumberParsed | undefined,
  selected: CountryCode
): ParsedGuestPhone | PhoneParseFailure {
  if (!parsed?.isValid()) return invalid("invalid");
  const selectedCode = getCountryCallingCode(selected);
  if (
    parsed.country !== selected &&
    parsed.countryCallingCode !== selectedCode
  ) {
    return invalid("invalid");
  }
  return fromParsed(parsed);
}

function acceptIsraeliLocal(digits: string): ParsedGuestPhone | null {
  const looksIsraeli =
    digits.startsWith("0") ||
    digits.startsWith("972") ||
    /^5\d{8}$/.test(digits);
  if (!looksIsraeli) return null;
  const parsed = parsePhoneNumberFromString(digits, "IL");
  if (!parsed?.isValid() || parsed.country !== "IL") return null;
  return fromParsed(parsed);
}

function acceptInternationalDigits(digits: string): ParsedGuestPhone | null {
  if (!digits || digits.startsWith("0")) return null;
  const parsed = parsePhoneNumberFromString(`+${digits}`);
  if (!parsed?.isValid()) return null;
  const e164Digits = String(parsed.number || "").replace(/\D/g, "");
  if (e164Digits !== digits) return null;
  if (!digits.startsWith(String(parsed.countryCallingCode || ""))) return null;
  return fromParsed(parsed);
}

export function parseGuestPhone(
  value: unknown,
  options?: PhoneParseOptions
): ParsedGuestPhone | PhoneParseFailure {
  const { plus, idd00, digits } = cleanPhoneInput(value);
  if (!digits) return invalid("missing");

  if (plus || idd00) {
    const international = idd00 ? digits.replace(/^00/, "") : digits;
    if (!international) return invalid("invalid");
    const parsed = acceptInternationalDigits(international);
    return parsed || invalid("invalid");
  }

  if (options?.countryExplicit) {
    const selected = asCountryCode(options.country);
    if (!selected) return invalid("invalid");
    return acceptCountryParse(
      parsePhoneNumberFromString(digits, selected),
      selected
    );
  }

  if (digits.startsWith("0") || digits.startsWith("972") || /^5\d{8}$/.test(digits)) {
    const israeli = acceptIsraeliLocal(digits);
    if (israeli) return israeli;
    return invalid("invalid");
  }

  return acceptInternationalDigits(digits) || invalid("invalid");
}

export function countryFromHint(value: unknown): CountryCode | undefined {
  const direct = asCountryCode(value);
  if (direct) return direct;

  const text = String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
  if (!text) return undefined;

  const calling = text.replace(/[^\d]/g, "");
  if (calling && (text.startsWith("+") || text === calling)) {
    if (CALLING_CODE_DEFAULTS[calling]) return CALLING_CODE_DEFAULTS[calling];
    const matches = getCountries().filter(
      (country) => getCountryCallingCode(country) === calling
    );
    if (matches.length === 1) return matches[0];
  }

  const needle = text.toLocaleLowerCase("he");
  try {
    const names = new Intl.DisplayNames(["he"], { type: "region" });
    for (const country of getCountries()) {
      const label = String(names.of(country) || "").toLocaleLowerCase("he");
      if (label && label === needle) return country;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

export function resolveStoredGuestPhone(
  phone: unknown,
  options?: PhoneParseOptions
): { ok: true; phone: string } | { ok: false; error: string } {
  const digits = digitsOnly(phone);
  if (!String(phone ?? "").trim() || !digits) {
    return { ok: true, phone: "" };
  }

  const parsed = parseGuestPhone(phone, {
    country: options?.country,
    countryExplicit: Boolean(options?.countryExplicit && options?.country),
  });

  if (!parsed.ok) {
    return { ok: false, error: INVALID_GUEST_PHONE_MESSAGE };
  }

  return { ok: true, phone: parsed.e164 };
}

export function guestPhoneQueryValues(
  phone: unknown,
  options?: PhoneParseOptions
) {
  const parsed = parseGuestPhone(phone, options);
  if (!parsed.ok) {
    const digits = digitsOnly(phone);
    return digits ? [digits, `+${digits}`] : [];
  }

  const values = new Set<string>([parsed.e164, parsed.digits]);
  if (parsed.callingCode === "972") {
    values.add(`0${parsed.nationalNumber}`);
    values.add(parsed.nationalNumber);
    values.add(`972${parsed.nationalNumber}`);
    values.add(`+972${parsed.nationalNumber}`);
  }
  return [...values].filter(Boolean);
}

export function sameGuestPhone(
  stored: unknown,
  query: unknown,
  queryOptions?: PhoneParseOptions
) {
  const left = parseGuestPhone(stored);
  const right = parseGuestPhone(query, queryOptions);
  return Boolean(left.ok && right.ok && left.e164 === right.e164);
}

export function phoneSearchMatches(stored: unknown, query: unknown) {
  const queryDigits = digitsOnly(query);
  if (!queryDigits) return false;

  const storedDigits = digitsOnly(stored);
  if (storedDigits && storedDigits.includes(queryDigits)) return true;
  if (sameGuestPhone(stored, query)) return true;

  const parsed = parseGuestPhone(stored);
  if (!parsed.ok) return false;

  const nationalQuery = queryDigits.replace(/^0+/, "");
  if (
    nationalQuery.length >= 3 &&
    (parsed.nationalNumber.includes(nationalQuery) ||
      parsed.digits.includes(nationalQuery))
  ) {
    return true;
  }

  return false;
}

function whatsappTypeAllowed(type: string) {
  if (!type) return true;
  return !NON_WHATSAPP_TYPES.has(type);
}

export function toWhatsappRecipient(
  phone: unknown,
  options?: PhoneParseOptions
): WhatsappRecipient {
  const parsed = parseGuestPhone(phone, options);
  if (!parsed.ok) {
    if (parsed.reason === "missing") {
      return { ok: false, reason: "missing", message: "חסר מספר טלפון." };
    }
    return {
      ok: false,
      reason: "invalid",
      message: INVALID_GUEST_PHONE_MESSAGE,
    };
  }

  if (
    parsed.country &&
    WHATSAPP_UNAVAILABLE_COUNTRIES.has(parsed.country as CountryCode)
  ) {
    const name = countryLabel(parsed.country);
    return {
      ok: false,
      reason: "unsupported_country",
      message: `לא ניתן לשלוח הודעת WhatsApp ל${name}. WhatsApp אינו זמין במדינה הזו.`,
    };
  }

  if (!whatsappTypeAllowed(parsed.type)) {
    return {
      ok: false,
      reason: "invalid",
      message: "המספר אינו מספר נייד שיכול לקבל הודעת WhatsApp.",
    };
  }

  return {
    ok: true,
    to: parsed.digits,
    e164: parsed.e164,
    country: parsed.country,
    callingCode: parsed.callingCode,
  };
}

export function toWhatsappDigits(
  phone: unknown,
  options?: PhoneParseOptions
) {
  const recipient = toWhatsappRecipient(phone, options);
  return recipient.ok ? recipient.to : "";
}

export function toSmsDigits(phone: unknown, options?: PhoneParseOptions) {
  const parsed = parseGuestPhone(phone, options);
  return parsed.ok ? parsed.digits : "";
}

export function guestRawPhone(guest: {
  phone?: unknown;
  phoneNumber?: unknown;
  mobile?: unknown;
  whatsapp?: unknown;
  contactPhone?: unknown;
} | null | undefined) {
  return String(
    guest?.phone ||
      guest?.phoneNumber ||
      guest?.mobile ||
      guest?.whatsapp ||
      guest?.contactPhone ||
      ""
  );
}

export function selectWhatsappRecipients<T>(
  guests: T[],
  options?: PhoneParseOptions
) {
  const accepted: Array<{
    guest: T;
    to: string;
    e164: string;
    country: CountryCode | "";
    callingCode: string;
  }> = [];
  const rejected: Array<{
    guest: T;
    reason: "missing" | "invalid" | "unsupported_country";
    message: string;
  }> = [];

  for (const guest of guests) {
    const destination = toWhatsappRecipient(guestRawPhone(guest as any), options);
    if (destination.ok) {
      accepted.push({
        guest,
        to: destination.to,
        e164: destination.e164,
        country: destination.country,
        callingCode: destination.callingCode,
      });
    } else {
      rejected.push({
        guest,
        reason: destination.reason,
        message: destination.message,
      });
    }
  }

  return { accepted, rejected };
}

export function phoneFieldError(
  value: unknown,
  country: string | null | undefined
) {
  const digits = digitsOnly(value);
  if (!String(value ?? "").trim() || !digits) return "";
  const { plus, idd00 } = cleanPhoneInput(value);
  const parsed = parseGuestPhone(value, {
    country,
    countryExplicit: !plus && !idd00,
  });
  if (!parsed.ok) return INVALID_GUEST_PHONE_MESSAGE;
  return "";
}

export function detectCountryFromInternationalInput(value: unknown) {
  const { plus, idd00, digits } = cleanPhoneInput(value);
  if (!plus && !idd00) return undefined;
  const parsed = parseGuestPhone(value);
  if (!parsed.ok || !parsed.country) return undefined;
  if (digits.length < parsed.callingCode.length + 6) return undefined;
  return parsed.country;
}

export type ImportedPhonePlan =
  | { status: "empty"; e164: "" }
  | { status: "invalid"; message: string }
  | { status: "duplicate"; e164: string }
  | { status: "ok"; e164: string };

export function prepareGuestImportPhone(
  raw: unknown,
  seenE164: Set<string>,
  countryHint?: unknown
): ImportedPhonePlan {
  if (!digitsOnly(raw)) return { status: "empty", e164: "" };

  const hinted = countryFromHint(countryHint);
  const { plus, idd00 } = cleanPhoneInput(raw);
  const parsed = parseGuestPhone(raw, {
    country: hinted,
    countryExplicit: Boolean(hinted) && !plus && !idd00,
  });

  if (!parsed.ok) {
    return { status: "invalid", message: INVALID_GUEST_PHONE_MESSAGE };
  }

  if (seenE164.has(parsed.e164)) {
    return { status: "duplicate", e164: parsed.e164 };
  }

  seenE164.add(parsed.e164);
  return { status: "ok", e164: parsed.e164 };
}

export function unsupportedWhatsappSummary(
  rejected: Array<{ reason: string; message: string }>
) {
  if (!rejected.length) return "";
  const reasons = new Set(rejected.map((item) => item.reason));
  const onlyBlockedOrMissing = [...reasons].every(
    (reason) => reason === "unsupported_country" || reason === "missing"
  );
  if (!onlyBlockedOrMissing || !reasons.has("unsupported_country")) return "";
  return (
    rejected.find((item) => item.reason === "unsupported_country")?.message ||
    ""
  );
}
