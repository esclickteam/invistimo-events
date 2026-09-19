export type GuestPassPhase = "qr" | "welcome";

export type GuestPassPayload = {
  token: string;
  guestName: string;
  eventTitle: string;
  coupleNames: string;
  tableLabel: string;
  confirmedGuestCount: number;
  checkedInGuestCount: number;
  remaining: number;
  fullyArrived: boolean;
  giftCreditUrl: string;
  detailsUrl: string;
  qrSrc: string;
};

export type GuestPassView = {
  phase: GuestPassPhase;
  showWelcome: boolean;
  showQr: boolean;
  showShowQrAgain: boolean;
  fullyArrived: boolean;
  remaining: number;
};

/**
 * Guest phone UI after a host confirms entry.
 * Opening the QR page never marks arrival — only actualArrivedCount does.
 */
export function guestPassView(input: {
  checkedInCount: number;
  confirmedCount: number;
  showQrAgain?: boolean;
}): GuestPassView {
  const checkedIn = Math.max(0, Math.floor(Number(input.checkedInCount) || 0));
  const confirmed = Math.max(0, Math.floor(Number(input.confirmedCount) || 0));
  const remaining = Math.max(0, confirmed - checkedIn);
  const arrived = checkedIn > 0;
  const fullyArrived = confirmed > 0 && checkedIn >= confirmed;
  const showQrAgain = Boolean(input.showQrAgain) && arrived && !fullyArrived;

  return {
    phase: arrived && !showQrAgain ? "welcome" : "qr",
    showWelcome: arrived && !showQrAgain,
    showQr: !arrived || showQrAgain,
    showShowQrAgain: arrived && !fullyArrived,
    fullyArrived,
    remaining,
  };
}

export function hostRemainingOptions(
  confirmedCount: number,
  checkedInCount: number
): number[] {
  const remaining = Math.max(
    0,
    Math.floor(Number(confirmedCount) || 0) -
      Math.floor(Number(checkedInCount) || 0)
  );
  return Array.from({ length: remaining }, (_, i) => i + 1);
}

export function hostScanIsFullyArrived(
  confirmedCount: number,
  checkedInCount: number
): boolean {
  const confirmed = Math.floor(Number(confirmedCount) || 0);
  const checkedIn = Math.floor(Number(checkedInCount) || 0);
  return confirmed > 0 && checkedIn >= confirmed;
}

export function giftUrlIfConfigured(url?: unknown): string {
  const value = String(url || "").trim();
  if (!value) return "";
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    return parsed.toString();
  } catch {
    return "";
  }
}

export function formatTableLabel(input: {
  tableName?: unknown;
  tableNumber?: unknown;
}): string {
  const name = String(input.tableName || "").trim();
  if (name) {
    return name.startsWith("שולחן") ? name : `שולחן ${name}`;
  }
  const n = Number(input.tableNumber);
  if (Number.isFinite(n) && n > 0) return `שולחן ${Math.floor(n)}`;
  return "";
}
