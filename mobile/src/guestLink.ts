import type { Guest, Invitation } from "@/src/api";

const PUBLIC_ORIGIN = "https://www.invistimo.com";

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

export function formatTimelineTime(value: Date) {
  return new Intl.DateTimeFormat("he-IL", {
    timeZone: "Asia/Jerusalem",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value);
}

export function buildGuestLinkTimeline(guest?: Guest | null) {
  if (!guest) return [] as { at: Date; label: string }[];

  const items: { at: Date; label: string }[] = [];
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

export function formatGuestPhone(phone?: string) {
  if (!phone) return "";
  const digits = String(phone).replace(/\D/g, "");
  if (digits.startsWith("0")) return digits;
  if (digits.length === 9 && digits.startsWith("5")) return `0${digits}`;
  if (digits.startsWith("972") && digits.length >= 11) return `0${digits.slice(3)}`;
  return digits;
}

export function guestTableLabel(guest: Pick<Guest, "tableName" | "tableNumber">) {
  if (guest.tableName && String(guest.tableName).trim()) {
    return String(guest.tableName).trim();
  }
  if (guest.tableNumber) return String(guest.tableNumber);
  return "—";
}

function invitationRsvpSiteMode(invitation?: Invitation | null) {
  const settings = invitation?.invitationSettings || {};
  return (
    settings.rsvpSiteMode ||
    settings.guestExperienceType ||
    invitation?.rsvpSiteMode ||
    invitation?.guestExperienceType
  );
}

function isPersonalRsvpSite(mode: unknown) {
  const value = String(mode || "").trim().toLowerCase();
  return value === "wedding_website" || value === "wedding-website" || value === "personal";
}

export function getGuestInvitationUrl(invitation: Invitation | null | undefined, guest: Guest) {
  const shareId = String(invitation?.shareId || "").trim();
  if (!shareId) return "";
  const mode = invitationRsvpSiteMode(invitation);
  const path = isPersonalRsvpSite(mode) ? `/w/${shareId}` : `/invite/${shareId}`;
  const token = String(guest.token || "").trim();
  const origin = String(invitation?.origin || PUBLIC_ORIGIN).replace(/\/$/, "") || PUBLIC_ORIGIN;
  if (!token) return `${origin}${path}`;
  return `${origin}${path}?token=${encodeURIComponent(token)}`;
}

export function whatsappInviteUrl(guest: Guest, inviteLink: string) {
  const digits = String(guest.phone || "").replace(/\D/g, "").replace(/^0/, "");
  if (!digits) return "";
  const message = `היי ${guest.name}! 💛\nהזמנה אישית מחכה לך 🎉\n${inviteLink}`;
  return `https://wa.me/972${digits}?text=${encodeURIComponent(message)}`;
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}
