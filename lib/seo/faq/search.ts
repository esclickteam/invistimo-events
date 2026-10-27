/**
 * Client-side Hebrew-aware FAQ search — no external AI / paid dependency.
 * Supports synonyms, light spelling variants, and token matching.
 */

const HEBREW_NIQQUD = /[\u0591-\u05C7]/g;

/** Common Hebrew ↔ Latin / spelling variants for Invistimo product terms */
const SYNONYM_GROUPS: string[][] = [
  ["וואטסאפ", "ווטסאפ", "וטסאפ", "whatsapp", "whats app", "וואטסאפ"],
  ["אישורי הגעה", "אישור הגעה", "rsvp", "אישורי־הגעה", "אישורי הגעה"],
  ["הושבה", "שיבוץ", "שולחנות", "מפת שולחנות", "סידורי הושבה", "seating"],
  ["הזמנה", "הזמנות", "הזמנה דיגיטלית", "invitation"],
  ["save the date", "סייב דה דייט", "סייב דהייט", "שמירת תאריך"],
  ["sms", "סמס", "הודעת טקסט"],
  ["qr", "קיו אר", "ברקוד", "בר קוד"],
  ["bit", "ביט"],
  ["paybox", "פייבוקס", "pay box"],
  ["מחיר", "מחירים", "עלות", "כמה עולה", "תמחור", "חבילה", "חבילות"],
  ["מוזמנים", "אורחים", "רשימת מוזמנים", "רשומה", "רשומות"],
  ["תמיכה", "עזרה", "תקלה", "שירות לקוחות"],
  ["פרטיות", "אבטחה", "מחיקה", "נתונים"],
  ["invistimo", "אינוויסטימו", "אינבסטימו", "אינויסטימו"],
];

function stripNiqqud(value: string) {
  return value.replace(HEBREW_NIQQUD, "");
}

/** Collapse whitespace, strip niqqud, lowercase Latin, normalize quotes/dashes */
export function normalizeFaqText(value: string): string {
  return stripNiqqud(value)
    .toLowerCase()
    .replace(/['ʼ׳`״"]/g, "")
    .replace(/[־–—-]/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function expandWithSynonyms(token: string): string[] {
  const out = new Set<string>([token]);
  for (const group of SYNONYM_GROUPS) {
    const normalizedGroup = group.map((g) => normalizeFaqText(g));
    if (normalizedGroup.some((g) => g === token || g.includes(token) || token.includes(g))) {
      for (const g of normalizedGroup) out.add(g);
    }
  }
  return [...out];
}

/** Soft Hebrew spelling: treat ו/ב and כ/ק swaps lightly via alternate forms */
function softSpellingVariants(token: string): string[] {
  if (token.length < 3) return [token];
  const variants = new Set<string>([token]);
  // Drop doubled letters (וואטסאפ → ואטסאפ)
  variants.add(token.replace(/(.)\1+/g, "$1"));
  return [...variants];
}

export function buildFaqSearchBlob(parts: string[]): string {
  return normalizeFaqText(parts.filter(Boolean).join(" "));
}

/**
 * Returns true when every query token matches the haystack
 * (directly or via synonym / soft spelling).
 */
export function faqTextMatches(query: string, haystackNormalized: string): boolean {
  const q = normalizeFaqText(query);
  if (!q) return true;

  const tokens = q.split(" ").filter((t) => t.length > 0);
  return tokens.every((token) => {
    const candidates = [
      ...expandWithSynonyms(token),
      ...softSpellingVariants(token).flatMap((v) => expandWithSynonyms(v)),
    ];
    return candidates.some((c) => c.length > 0 && haystackNormalized.includes(c));
  });
}

/** Highlight matched query substrings in display text (returns React-friendly parts). */
export function highlightFaqMatch(
  text: string,
  query: string
): Array<{ text: string; match: boolean }> {
  const q = normalizeFaqText(query);
  if (!q || !text) return [{ text, match: false }];

  const tokens = q
    .split(" ")
    .filter((t) => t.length >= 2)
    .flatMap((t) => expandWithSynonyms(t))
    .filter((t, i, arr) => arr.indexOf(t) === i)
    .sort((a, b) => b.length - a.length);

  if (tokens.length === 0) return [{ text, match: false }];

  // Build a case-/niqqud-insensitive scan over original text by walking chars
  const source = text;
  const normMap: number[] = []; // index in source for each char in normalized stream
  let normalized = "";
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    const n = normalizeFaqText(ch);
    if (!n && /\s/.test(ch)) {
      if (normalized.slice(-1) !== " ") {
        normalized += " ";
        normMap.push(i);
      }
      continue;
    }
    for (const c of n) {
      normalized += c;
      normMap.push(i);
    }
  }

  const hitRanges: Array<[number, number]> = [];
  for (const token of tokens) {
    let from = 0;
    while (from < normalized.length) {
      const idx = normalized.indexOf(token, from);
      if (idx === -1) break;
      const startSrc = normMap[idx];
      const endSrc = normMap[idx + token.length - 1];
      if (startSrc !== undefined && endSrc !== undefined) {
        hitRanges.push([startSrc, endSrc + 1]);
      }
      from = idx + token.length;
    }
  }

  if (hitRanges.length === 0) return [{ text, match: false }];

  hitRanges.sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [];
  for (const range of hitRanges) {
    const last = merged[merged.length - 1];
    if (last && range[0] <= last[1]) {
      last[1] = Math.max(last[1], range[1]);
    } else {
      merged.push([...range] as [number, number]);
    }
  }

  const parts: Array<{ text: string; match: boolean }> = [];
  let cursor = 0;
  for (const [start, end] of merged) {
    if (cursor < start) parts.push({ text: source.slice(cursor, start), match: false });
    parts.push({ text: source.slice(start, end), match: true });
    cursor = end;
  }
  if (cursor < source.length) parts.push({ text: source.slice(cursor), match: false });
  return parts;
}
