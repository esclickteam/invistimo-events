import InvitationGuest from "@/models/InvitationGuest";

export const LINK_OPEN_DEDUP_MS = 5 * 60 * 1000;

const BOT_UA_RE =
  /bot|crawler|spider|crawling|preview|facebookexternalhit|facebot|whatsapp|telegrambot|slackbot|twitterbot|linkedinbot|embedly|pinterest|vkshare|discordbot|googlebot|bingbot|yandex|baiduspider|duckduckbot|applebot|semrush|ahrefs|petalbot|bytespider|vercel-screenshot|vercelbot|headlesschrome|phantomjs|prerender/i;

export type GuestLinkOpenState = {
  _id?: unknown;
  firstOpenedAt?: Date | string | null;
  lastOpenedAt?: Date | string | null;
  openCount?: number | null;
};

export type GuestLinkOpenNextState = {
  firstOpenedAt: Date;
  lastOpenedAt: Date;
  openCount: number;
  counted: boolean;
};

export type GuestLinkTimelineItem = {
  at: Date;
  label: string;
};

function toDate(value: unknown): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function shouldSkipGuestLinkTracking(input: {
  userAgent?: string | null;
  isPreview?: boolean;
  token?: string | null;
  purpose?: string | null;
}): boolean {
  if (input.isPreview) return true;
  if (!String(input.token || "").trim()) return true;

  const purpose = String(input.purpose || "").trim().toLowerCase();
  if (purpose === "prefetch" || purpose === "preview") return true;

  const userAgent = String(input.userAgent || "").trim();
  if (userAgent && BOT_UA_RE.test(userAgent)) return true;

  return false;
}

export function nextGuestLinkOpenState(
  current: GuestLinkOpenState | null | undefined,
  nowInput: Date = new Date()
): GuestLinkOpenNextState {
  const now = nowInput instanceof Date ? nowInput : new Date(nowInput);
  const firstOpenedAt = toDate(current?.firstOpenedAt);
  const lastOpenedAt = toDate(current?.lastOpenedAt);
  const openCount = Math.max(0, Number(current?.openCount || 0));

  const withinDedup =
    Boolean(lastOpenedAt) &&
    now.getTime() - lastOpenedAt!.getTime() >= 0 &&
    now.getTime() - lastOpenedAt!.getTime() < LINK_OPEN_DEDUP_MS;

  if (!firstOpenedAt) {
    return {
      firstOpenedAt: now,
      lastOpenedAt: now,
      openCount: Math.max(1, openCount + 1),
      counted: true,
    };
  }

  if (withinDedup) {
    return {
      firstOpenedAt,
      lastOpenedAt: now,
      openCount: Math.max(1, openCount),
      counted: false,
    };
  }

  return {
    firstOpenedAt,
    lastOpenedAt: now,
    openCount: openCount + 1,
    counted: true,
  };
}

export function guestLinkWasOpened(guest?: {
  firstOpenedAt?: unknown;
  openCount?: unknown;
} | null): boolean {
  if (!guest) return false;
  if (toDate(guest.firstOpenedAt)) return true;
  return Number(guest.openCount || 0) > 0;
}

export function matchesGuestLinkOpenFilter(
  guest: { firstOpenedAt?: unknown; openCount?: unknown } | null | undefined,
  filter: string
): boolean {
  if (filter === "opened") return guestLinkWasOpened(guest);
  if (filter === "notOpened") return !guestLinkWasOpened(guest);
  return true;
}

export function formatGuestLinkOpenedAt(value: unknown): string {
  const date = toDate(value);
  if (!date) return "";

  const parts = new Intl.DateTimeFormat("he-IL", {
    timeZone: "Asia/Jerusalem",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value || "";

  return `${get("day")}.${get("month")} ${get("hour")}:${get("minute")}`;
}

export function buildGuestLinkTimeline(guest?: {
  firstOpenedAt?: unknown;
  lastOpenedAt?: unknown;
  openCount?: unknown;
  rsvp?: unknown;
  arrivedCount?: unknown;
  guestsCount?: unknown;
  rsvpRespondedAt?: unknown;
  respondedAt?: unknown;
  rsvpUpdatedAt?: unknown;
  lastResponseAt?: unknown;
} | null): GuestLinkTimelineItem[] {
  if (!guest) return [];

  const items: GuestLinkTimelineItem[] = [];
  const firstOpenedAt = toDate(guest.firstOpenedAt);
  const lastOpenedAt = toDate(guest.lastOpenedAt);
  const openCount = Math.max(0, Number(guest.openCount || 0));

  if (firstOpenedAt) {
    items.push({ at: firstOpenedAt, label: "פתח את הקישור" });
  }

  if (
    lastOpenedAt &&
    openCount >= 2 &&
    (!firstOpenedAt || lastOpenedAt.getTime() !== firstOpenedAt.getTime())
  ) {
    items.push({ at: lastOpenedAt, label: "פתח שוב את הקישור" });
  }

  const rsvpAt =
    toDate(guest.rsvpRespondedAt) ||
    toDate(guest.respondedAt) ||
    toDate(guest.rsvpUpdatedAt) ||
    toDate(guest.lastResponseAt);

  if (guest.rsvp === "yes" && rsvpAt) {
    const arriving = Number(guest.arrivedCount || guest.guestsCount || 0);
    items.push({
      at: rsvpAt,
      label: `אישר הגעה, ${arriving} מגיעים`,
    });
  } else if (guest.rsvp === "no" && rsvpAt) {
    items.push({ at: rsvpAt, label: "סימן שלא מגיע" });
  }

  return items.sort((a, b) => a.at.getTime() - b.at.getTime());
}

/**
 * Best-effort write. Never throws to callers.
 * Does not touch RSVP, notes, seating, or updatedAt.
 */
export async function recordGuestLinkOpen(input: {
  token?: string | null;
  invitationId?: unknown;
  userAgent?: string | null;
  isPreview?: boolean;
  purpose?: string | null;
}): Promise<boolean> {
  try {
    const token = String(input.token || "").trim();
    if (
      shouldSkipGuestLinkTracking({
        token,
        userAgent: input.userAgent,
        isPreview: input.isPreview,
        purpose: input.purpose,
      })
    ) {
      return false;
    }

    if (!input.invitationId) return false;

    const guest = await InvitationGuest.findOne({
      token,
      invitationId: input.invitationId,
    })
      .select("_id firstOpenedAt lastOpenedAt openCount")
      .lean();

    if (!guest?._id) return false;

    const next = nextGuestLinkOpenState(guest, new Date());

    await InvitationGuest.updateOne(
      { _id: guest._id },
      {
        $set: {
          firstOpenedAt: next.firstOpenedAt,
          lastOpenedAt: next.lastOpenedAt,
          openCount: next.openCount,
        },
      },
      { timestamps: false }
    );

    return true;
  } catch (error) {
    console.warn("[guest-link-open] best-effort skipped", error);
    return false;
  }
}
