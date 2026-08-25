/**
 * Controlled Venue Suite pilot entitlement (venue-layer only).
 *
 * Safety Contract: venue-layer only — does not modify global auth helpers or /api/me.
 *
 * Env:
 * - VENUE_PILOT_MODE=1|true → enforce allowlist
 * - VENUE_PILOT_OWNER_IDS=comma-separated User ids (hall owners)
 * - VENUE_PILOT_HALL_IDS=comma-separated VenueHall.id values (string `id` and/or ObjectId)
 *
 * When pilot mode is OFF (default): all venue membership/owner checks apply as usual.
 * When pilot mode is ON:
 * - If BOTH owner and hall allowlists are set → require BOTH (AND). This prevents a
 *   listed owner from accessing a second non-listed hall.
 * - If only one list is set → that list alone gates access.
 * Admins bypass the pilot gate (still subject to requireVenueAccess RBAC).
 * Creating new halls is blocked when a hall allowlist is configured.
 */

function parseList(raw: string | undefined) {
  return String(raw || "")
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isVenuePilotModeEnabled() {
  const v = String(process.env.VENUE_PILOT_MODE || "")
    .trim()
    .toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

export function getVenuePilotOwnerIds() {
  return parseList(process.env.VENUE_PILOT_OWNER_IDS);
}

export function getVenuePilotHallIds() {
  return parseList(process.env.VENUE_PILOT_HALL_IDS);
}

export function isVenuePilotAllowed(params: {
  ownerId: string;
  hallId: string;
  isAdmin?: boolean;
}): { allowed: boolean; reason?: string } {
  if (!isVenuePilotModeEnabled()) {
    return { allowed: true };
  }

  if (params.isAdmin) {
    return { allowed: true };
  }

  const ownerIds = getVenuePilotOwnerIds();
  const hallIds = getVenuePilotHallIds();

  if (!ownerIds.length && !hallIds.length) {
    return {
      allowed: false,
      reason:
        "מצב פיילוט פעיל אך לא הוגדרה רשימת אולמות מאושרים (VENUE_PILOT_OWNER_IDS / VENUE_PILOT_HALL_IDS)",
    };
  }

  const ownerOk =
    ownerIds.length > 0 && ownerIds.includes(String(params.ownerId));
  const hallOk =
    hallIds.length > 0 && hallIds.includes(String(params.hallId));

  // Both lists configured → require intersection (one approved owner + one approved hall)
  if (ownerIds.length > 0 && hallIds.length > 0) {
    if (ownerOk && hallOk) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: "האולם אינו ברשימת הפיילוט המאושרת",
    };
  }

  if (ownerOk || hallOk) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: "האולם אינו ברשימת הפיילוט המאושרת",
  };
}

export function isVenuePilotOwnerAllowed(params: {
  ownerId: string;
  isAdmin?: boolean;
}): { allowed: boolean; reason?: string } {
  if (!isVenuePilotModeEnabled()) {
    return { allowed: true };
  }
  if (params.isAdmin) {
    return { allowed: true };
  }

  // Controlled one-hall pilot: never allow creating additional halls once a
  // hall allowlist is in force.
  if (getVenuePilotHallIds().length) {
    return {
      allowed: false,
      reason: "יצירת אולם חדש חסומה במצב פיילוט (רק אולמות ברשימה)",
    };
  }

  const ownerIds = getVenuePilotOwnerIds();
  if (!ownerIds.length) {
    return {
      allowed: false,
      reason: "מצב פיילוט פעיל ללא VENUE_PILOT_OWNER_IDS",
    };
  }
  if (ownerIds.includes(String(params.ownerId))) {
    return { allowed: true };
  }
  return {
    allowed: false,
    reason: "המשתמש אינו ברשימת בעלי האולמות לפיילוט",
  };
}
