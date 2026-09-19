import { DEFAULT_PUBLIC_ORIGIN } from "@/lib/guestInviteUrl";

export function buildEventDetailsPath(shareId: unknown): string {
  const clean = String(shareId || "").trim();
  return clean ? `/e/${encodeURIComponent(clean)}` : "";
}

export function shouldOpenCheckInQrFirst({
  checkInEnabled,
  guestToken,
  details,
}: {
  checkInEnabled?: unknown;
  guestToken?: unknown;
  details?: unknown;
}): boolean {
  if (!checkInEnabled) return false;
  if (!String(guestToken || "").trim()) return false;
  const flag = String(details || "").trim().toLowerCase();
  return flag !== "1" && flag !== "true";
}

/**
 * The regular reminder "event details" URL.
 * When Check-in is on, append the guest token so /e/[shareId] can show QR first.
 * Template wording stays the same — only the destination behind {{navigationLink}}.
 */
export function buildReminderNavigationUrl({
  shareId,
  guestToken,
  checkInEnabled,
  origin = DEFAULT_PUBLIC_ORIGIN,
}: {
  shareId: unknown;
  guestToken?: unknown;
  checkInEnabled?: unknown;
  origin?: string | null;
}): string {
  const path = buildEventDetailsPath(shareId);
  if (!path) return "";

  const originValue = String(origin || DEFAULT_PUBLIC_ORIGIN).replace(/\/$/, "");
  const base = `${originValue}${path}`;
  const token = String(guestToken || "").trim();

  if (checkInEnabled && token) {
    return `${base}?token=${encodeURIComponent(token)}`;
  }

  return base;
}

export function buildEventDetailsAfterQrUrl({
  shareId,
  guestToken,
}: {
  shareId: unknown;
  guestToken?: unknown;
}): string {
  const path = buildEventDetailsPath(shareId);
  if (!path) return "";
  const token = String(guestToken || "").trim();
  if (!token) return path;
  return `${path}?token=${encodeURIComponent(token)}&details=1`;
}
