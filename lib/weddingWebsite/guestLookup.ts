import { phoneCoreDigits, phoneLookupVariants } from "@/lib/auth/phoneLookup";

export type GuestLookupMatch = {
  token: string;
  name: string;
  guestsCount: number;
  rsvp: "yes" | "no" | "pending" | "";
  /** Masked phone for UI disambiguation only — never full list dump */
  phoneHint: string;
};

function maskPhone(phone: string): string {
  const d = String(phone || "").replace(/\D/g, "");
  if (d.length < 4) return "";
  return `***${d.slice(-4)}`;
}

function normalizeRsvp(v: unknown): GuestLookupMatch["rsvp"] {
  if (v === "yes" || v === "no" || v === "pending") return v;
  return "";
}

export function buildPhoneMatchQuery(rawPhone: string) {
  const variants = phoneLookupVariants(rawPhone);
  const core = phoneCoreDigits(rawPhone);
  if (!variants.length && !core) return null;

  const ors: Record<string, unknown>[] = [];
  if (variants.length) {
    ors.push({ phone: { $in: variants } });
  }
  // Loose ends-with match on core digits (event-scoped caller must still filter invitationId)
  if (core && core.length >= 7) {
    ors.push({ phone: { $regex: `${core}$` } });
  }
  return ors.length ? { $or: ors } : null;
}

export function sanitizeNameQuery(raw: string) {
  return String(raw || "")
    .trim()
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .slice(0, 64);
}

export function toPublicMatches(
  guests: Array<{
    token?: string;
    name?: string;
    phone?: string;
    guestsCount?: number;
    rsvp?: string;
    status?: string;
  }>
): GuestLookupMatch[] {
  return guests
    .filter((g) => Boolean(g?.token))
    .slice(0, 5)
    .map((g) => ({
      token: String(g.token),
      name: String(g.name || "אורח/ת"),
      guestsCount: Math.max(1, Number(g.guestsCount) || 1),
      rsvp: normalizeRsvp(g.rsvp || g.status),
      phoneHint: maskPhone(String(g.phone || "")),
    }));
}
