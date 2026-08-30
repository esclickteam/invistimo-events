import type { WeddingDemoContent } from "@/types/weddingWebsite";

/** Fields the couple never edits directly; they mirror the event record. */
const IGNORED_KEYS = new Set([
  "weddingDate",
  "weddingTime",
  "venueName",
  "venueAddress",
  "venueLat",
  "venueLng",
  "coupleShort",
  "guestbookMessages",
]);

/** Keys whose value is a map of independently-edited entries. */
const MAP_KEYS = ["styles", "mobileStyles", "sectionStyles", "media", "copy", "sections"] as const;

function stable(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([key, item]) => `${key}:${stable(item)}`).join(",")}}`;
  }
  return String(value);
}

/**
 * Counts how many distinct things differ between the draft and what guests
 * currently see, so the publish button can say "פרסום 5 שינויים" instead of a
 * vague "there are changes".
 */
export function countContentChanges(
  draft?: Partial<WeddingDemoContent> | null,
  published?: Partial<WeddingDemoContent> | null
) {
  if (!draft) return 0;
  const left = draft as Record<string, unknown>;
  const right = (published || {}) as Record<string, unknown>;
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  let changes = 0;

  for (const key of keys) {
    if (IGNORED_KEYS.has(key)) continue;

    if ((MAP_KEYS as readonly string[]).includes(key)) {
      const a = (left[key] || {}) as Record<string, unknown>;
      const b = (right[key] || {}) as Record<string, unknown>;
      const inner = new Set([...Object.keys(a), ...Object.keys(b)]);
      for (const entry of inner) {
        if (stable(a[entry]) !== stable(b[entry])) changes += 1;
      }
      continue;
    }

    if (stable(left[key]) !== stable(right[key])) changes += 1;
  }

  return changes;
}

export function hasUnpublishedChanges(
  draft?: Partial<WeddingDemoContent> | null,
  published?: Partial<WeddingDemoContent> | null
) {
  return countContentChanges(draft, published) > 0;
}
