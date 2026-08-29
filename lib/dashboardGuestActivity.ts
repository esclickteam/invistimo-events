export type GuestActivityPatch = {
  id: string;
  token?: string;
  firstOpenedAt?: string | null;
  lastOpenedAt?: string | null;
  openCount?: number;
  rsvp?: "yes" | "no" | "pending";
  arrivedCount?: number;
  guestsCount?: number;
  notes?: string;
  rsvpUpdatedAt?: string | null;
  rsvpRespondedAt?: string | null;
  lastResponseAt?: string | null;
};

export type GuestActivitySnapshot = {
  guests: GuestActivityPatch[];
  unreadGuestMessages?: number;
  updatedAt?: string;
};

function isoOrNull(value: unknown) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function sameText(a: unknown, b: unknown) {
  return String(a || "") === String(b || "");
}

export function guestActivityFingerprint(input: {
  guests: GuestActivityPatch[];
  unreadGuestMessages?: number;
}) {
  const guests = [...(input.guests || [])]
    .map((guest) =>
      [
        guest.id,
        isoOrNull(guest.firstOpenedAt) || "",
        isoOrNull(guest.lastOpenedAt) || "",
        Number(guest.openCount || 0),
        guest.rsvp || "",
        Number(guest.arrivedCount || 0),
        Number(guest.guestsCount || 0),
        String(guest.notes || ""),
        isoOrNull(guest.rsvpUpdatedAt) || "",
      ].join(":")
    )
    .sort()
    .join("|");

  return `${guests}#${Number(input.unreadGuestMessages || 0)}`;
}

export function mergeGuestActivity<T extends {
  _id?: unknown;
  id?: unknown;
  token?: string;
  firstOpenedAt?: unknown;
  lastOpenedAt?: unknown;
  openCount?: unknown;
  rsvp?: unknown;
  arrivedCount?: unknown;
  guestsCount?: unknown;
  notes?: unknown;
  rsvpUpdatedAt?: unknown;
  rsvpRespondedAt?: unknown;
  lastResponseAt?: unknown;
}>(
  guests: T[],
  patches: GuestActivityPatch[]
): T[] {
  if (!Array.isArray(guests) || guests.length === 0 || !Array.isArray(patches) || patches.length === 0) {
    return guests;
  }

  const byId = new Map<string, GuestActivityPatch>();
  const byToken = new Map<string, GuestActivityPatch>();

  for (const patch of patches) {
    const id = String(patch.id || "").trim();
    const token = String(patch.token || "").trim();
    if (id) byId.set(id, patch);
    if (token) byToken.set(token, patch);
  }

  let changed = false;

  const next = guests.map((guest) => {
    const id = String(guest._id || guest.id || "").trim();
    const token = String(guest.token || "").trim();
    const patch = (id && byId.get(id)) || (token && byToken.get(token));
    if (!patch) return guest;

    const firstOpenedAt = isoOrNull(patch.firstOpenedAt);
    const lastOpenedAt = isoOrNull(patch.lastOpenedAt);
    const openCount = Number(patch.openCount || 0);
    const rsvp = patch.rsvp || guest.rsvp;
    const arrivedCount = Number(patch.arrivedCount ?? guest.arrivedCount ?? 0);
    const guestsCount = Number(patch.guestsCount ?? guest.guestsCount ?? 0);
    const notes = patch.notes ?? guest.notes;
    const rsvpUpdatedAt = isoOrNull(patch.rsvpUpdatedAt) ?? guest.rsvpUpdatedAt;
    const rsvpRespondedAt = isoOrNull(patch.rsvpRespondedAt) ?? guest.rsvpRespondedAt;
    const lastResponseAt = isoOrNull(patch.lastResponseAt) ?? guest.lastResponseAt;

    if (
      sameText(isoOrNull(guest.firstOpenedAt), firstOpenedAt) &&
      sameText(isoOrNull(guest.lastOpenedAt), lastOpenedAt) &&
      Number(guest.openCount || 0) === openCount &&
      guest.rsvp === rsvp &&
      Number(guest.arrivedCount || 0) === arrivedCount &&
      Number(guest.guestsCount || 0) === guestsCount &&
      sameText(guest.notes, notes)
    ) {
      return guest;
    }

    changed = true;
    return {
      ...guest,
      firstOpenedAt,
      lastOpenedAt,
      openCount,
      rsvp,
      arrivedCount,
      guestsCount,
      notes,
      rsvpUpdatedAt,
      rsvpRespondedAt,
      lastResponseAt,
    };
  });

  return changed ? next : guests;
}
