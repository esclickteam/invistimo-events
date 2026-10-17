/**
 * Guest-facing event location text.
 *
 * Google often stores a bilingual hall name ("עברית | English") in `name`
 * and again inside `address` / `formattedAddress`, sometimes once per language.
 * The previous guard only skipped prepending the name when the address
 * contained that exact full string, so a second copy — or the English half
 * alone — still reached WhatsApp.
 *
 * This module keeps the hall name once and keeps an address part only when it
 * adds words that are not already in the hall name. Coordinates, place ids and
 * Waze links are never touched here.
 */

export type StoredLocationText = {
  name: string;
  address: string;
  placeName: string;
  formattedAddress: string;
};

function cleanString(value: unknown) {
  return String(value ?? "")
    .replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeLocationKey(value: string) {
  return cleanString(value)
    .toLowerCase()
    .replace(/[\u0591-\u05C7]/g, "")
    .replace(/[|∣│｜]/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokensOf(value: string) {
  return normalizeLocationKey(value)
    .split(" ")
    .filter((token) => token.length >= 2 || /\d/.test(token));
}

function tokenKey(value: string) {
  return [...new Set(tokensOf(value))].sort().join(" ");
}

function isCountry(value: string) {
  const key = normalizeLocationKey(value);
  return key === "ישראל" || key === "israel";
}

function isTokenSubset(smaller: Set<string>, larger: Set<string>) {
  if (smaller.size === 0 || smaller.size >= larger.size) return false;
  for (const token of smaller) {
    if (!larger.has(token)) return false;
  }
  return true;
}

/** "Name Name" (the same phrase twice, with or without a separator) → "Name". */
export function collapseRepeatedPhrase(value: string) {
  let current = cleanString(value);
  for (let guard = 0; guard < 4; guard += 1) {
    const words = current.split(" ").filter(Boolean);
    if (words.length < 2 || words.length % 2 !== 0) break;
    const mid = words.length / 2;
    const left = words.slice(0, mid).join(" ");
    const right = words.slice(mid).join(" ");
    if (!normalizeLocationKey(left) || normalizeLocationKey(left) !== normalizeLocationKey(right)) {
      break;
    }
    current = left;
  }
  return current;
}

function splitSegments(value: string) {
  return cleanString(value)
    .split(/[,،\n]+/)
    .map((part) => collapseRepeatedPhrase(part))
    .filter(Boolean);
}

function stripCountryAndPostal(segment: string) {
  return cleanString(
    segment
      .replace(/,?\s*ישראל/gi, " ")
      .replace(/\bisrael\b/gi, " ")
      .replace(/\b\d{5,7}\b/g, " ")
  );
}

/** Full bilingual name plus each language side ("עברית | English" → both). */
export function locationNameVariants(value: string) {
  const full = collapseRepeatedPhrase(value);
  if (!full) return [];
  const sides = full
    .split(/\s*[|∣│｜]\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
  return [full, ...sides];
}

function variantKeys(values: string[]) {
  const keys = new Set<string>();
  for (const value of values) {
    for (const variant of locationNameVariants(value)) {
      const key = tokenKey(variant) || normalizeLocationKey(variant);
      if (key) keys.add(key);
    }
  }
  return keys;
}

function dedupeSegments(
  segments: string[],
  options: { stripCountry: boolean; coveredBy?: string[] }
) {
  const cleaned = segments
    .map((segment) =>
      options.stripCountry ? stripCountryAndPostal(segment) : cleanString(segment)
    )
    .filter(Boolean);

  const tokenSets = cleaned.map((segment) => new Set(tokensOf(segment)));
  const covered = variantKeys(options.coveredBy || []);
  const drop = new Set<number>();

  for (let i = 0; i < cleaned.length; i += 1) {
    const key = tokenKey(cleaned[i]) || normalizeLocationKey(cleaned[i]);
    if (!key || (options.stripCountry && isCountry(cleaned[i]))) {
      drop.add(i);
      continue;
    }
    if (covered.has(key)) {
      drop.add(i);
      continue;
    }
    for (let j = 0; j < cleaned.length; j += 1) {
      if (i !== j && isTokenSubset(tokenSets[i], tokenSets[j])) {
        drop.add(i);
        break;
      }
    }
  }

  const seen = new Set<string>();
  const kept: string[] = [];
  for (let i = 0; i < cleaned.length; i += 1) {
    if (drop.has(i)) continue;
    const key = tokenKey(cleaned[i]) || normalizeLocationKey(cleaned[i]);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    kept.push(cleaned[i]);
  }
  return kept;
}

function segmentsOf(values: Array<string | null | undefined>) {
  return values.flatMap((value) => splitSegments(String(value || "")));
}

/**
 * One guest-facing line: hall name once, then address parts that add information.
 * Trailing "ישראל" and postal codes stay off the WhatsApp parameter, as before.
 */
export function composeGuestLocationLabel(
  ...parts: Array<string | null | undefined>
) {
  return dedupeSegments(segmentsOf(parts), { stripCountry: true }).join(", ");
}

/** Flat string already assembled for a template variable or a manual location. */
export function dedupeGuestLocationText(value: unknown) {
  return composeGuestLocationLabel(typeof value === "string" ? value : String(value ?? ""));
}

/** Address lines with the hall name removed, for a second display line. Country is kept. */
export function addressRemainder(
  venueNames: Array<string | null | undefined>,
  ...addressParts: Array<string | null | undefined>
) {
  return dedupeSegments(segmentsOf(addressParts), {
    stripCountry: false,
    coveredBy: venueNames.filter((value): value is string => Boolean(cleanString(value))),
  }).join(", ");
}

export function dedupeLocationField(value: unknown) {
  return dedupeSegments(splitSegments(String(value ?? "")), {
    stripCountry: false,
  }).join(", ");
}

/**
 * Remove repeated hall-name copies from stored text fields.
 * Does not receive or return coordinates, placeId, or Waze fields.
 * Unique address words, including a single "ישראל", are kept.
 */
export function sanitizeStoredLocationText(
  input: Partial<StoredLocationText> | null | undefined
): StoredLocationText {
  const name = dedupeLocationField(input?.name);
  const placeName = dedupeLocationField(input?.placeName);
  const coveredBy = [name, placeName].filter(Boolean);
  return {
    name,
    placeName,
    address: dedupeSegments(splitSegments(String(input?.address || "")), {
      stripCountry: false,
      coveredBy,
    }).join(", "),
    formattedAddress: dedupeSegments(
      splitSegments(String(input?.formattedAddress || "")),
      { stripCountry: false, coveredBy }
    ).join(", "),
  };
}
