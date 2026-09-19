import CheckInLog from "@/models/CheckInLog";
import InvitationGuest from "@/models/InvitationGuest";
import {
  checkedInGuestCount,
  confirmedGuestCount,
} from "@/lib/checkIn/status";

export type CheckInMethod = "QR" | "MANUAL";

export type ApplyCheckInInput = {
  guest: any;
  quantityAdded: number;
  scannedByUserId: string;
  method: CheckInMethod;
  allowOverride?: boolean;
  deviceSession?: string | null;
  eventId?: string | null;
  invitationId?: string | null;
};

export type ApplyCheckInResult =
  | {
      ok: true;
      guest: any;
      previousCheckedInCount: number;
      newCheckedInCount: number;
      quantityAdded: number;
      confirmed: number;
      overridden: boolean;
      logId: string;
    }
  | {
      ok: false;
      error: string;
      code:
        | "INVALID_QUANTITY"
        | "EXCEEDS_CONFIRMED"
        | "GUEST_NOT_FOUND"
        | "SAVE_FAILED";
      confirmed?: number;
      previousCheckedInCount?: number;
    };

export async function applyCheckIn(
  input: ApplyCheckInInput
): Promise<ApplyCheckInResult> {
  const guest = input.guest;
  if (!guest) {
    return { ok: false, error: "אורח לא נמצא", code: "GUEST_NOT_FOUND" };
  }

  const quantity = Math.floor(Number(input.quantityAdded));
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return {
      ok: false,
      error: "כמות לא תקינה",
      code: "INVALID_QUANTITY",
    };
  }

  const previous = checkedInGuestCount(guest);
  const confirmed = confirmedGuestCount(guest);
  const next = previous + quantity;
  const overridden = Boolean(input.allowOverride) && next > confirmed;

  if (next > confirmed && !input.allowOverride) {
    return {
      ok: false,
      error: "לא ניתן לסמן יותר מהמאושרים ללא אישור מיוחד",
      code: "EXCEEDS_CONFIRMED",
      confirmed,
      previousCheckedInCount: previous,
    };
  }

  guest.actualArrivedCount = next;

  try {
    await guest.save();
  } catch (err) {
    console.error("❌ applyCheckIn save failed:", err);
    return { ok: false, error: "שמירה נכשלה", code: "SAVE_FAILED" };
  }

  const eventId =
    input.eventId ||
    guest.eventId ||
    null;
  const invitationId =
    input.invitationId ||
    guest.invitationId ||
    null;

  const log = await CheckInLog.create({
    eventId: eventId || undefined,
    invitationId: invitationId || undefined,
    invitationGuestId: guest._id,
    scannedByUserId: input.scannedByUserId,
    scannedAt: new Date(),
    quantityAdded: quantity,
    previousCheckedInCount: previous,
    newCheckedInCount: next,
    method: input.method,
    deviceSession: input.deviceSession || null,
    overridden,
  });

  return {
    ok: true,
    guest,
    previousCheckedInCount: previous,
    newCheckedInCount: next,
    quantityAdded: quantity,
    confirmed,
    overridden,
    logId: String(log._id),
  };
}

export async function setCheckedInCountAbsolute(input: {
  guest: any;
  nextCount: number;
  scannedByUserId: string;
  allowOverride?: boolean;
  deviceSession?: string | null;
  eventId?: string | null;
  invitationId?: string | null;
}): Promise<ApplyCheckInResult> {
  const guest = input.guest;
  if (!guest) {
    return { ok: false, error: "אורח לא נמצא", code: "GUEST_NOT_FOUND" };
  }

  const next = Math.max(0, Math.floor(Number(input.nextCount)));
  if (!Number.isFinite(next)) {
    return {
      ok: false,
      error: "כמות לא תקינה",
      code: "INVALID_QUANTITY",
    };
  }

  const previous = checkedInGuestCount(guest);
  const confirmed = confirmedGuestCount(guest);
  const quantityAdded = next - previous;
  const overridden = Boolean(input.allowOverride) && next > confirmed;

  if (next > confirmed && !input.allowOverride) {
    return {
      ok: false,
      error: "לא ניתן לסמן יותר מהמאושרים ללא אישור מיוחד",
      code: "EXCEEDS_CONFIRMED",
      confirmed,
      previousCheckedInCount: previous,
    };
  }

  if (quantityAdded === 0) {
    return {
      ok: true,
      guest,
      previousCheckedInCount: previous,
      newCheckedInCount: previous,
      quantityAdded: 0,
      confirmed,
      overridden: false,
      logId: "",
    };
  }

  guest.actualArrivedCount = next;

  try {
    await guest.save();
  } catch (err) {
    console.error("❌ setCheckedInCountAbsolute save failed:", err);
    return { ok: false, error: "שמירה נכשלה", code: "SAVE_FAILED" };
  }

  const log = await CheckInLog.create({
    eventId: input.eventId || guest.eventId || undefined,
    invitationId: input.invitationId || guest.invitationId || undefined,
    invitationGuestId: guest._id,
    scannedByUserId: input.scannedByUserId,
    scannedAt: new Date(),
    quantityAdded,
    previousCheckedInCount: previous,
    newCheckedInCount: next,
    method: "MANUAL",
    deviceSession: input.deviceSession || null,
    overridden,
  });

  return {
    ok: true,
    guest,
    previousCheckedInCount: previous,
    newCheckedInCount: next,
    quantityAdded,
    confirmed,
    overridden,
    logId: String(log._id),
  };
}

export async function ensureGuestCheckInToken(guest: any): Promise<string> {
  if (guest.checkInToken && String(guest.checkInToken).trim()) {
    return String(guest.checkInToken);
  }

  const { generateCheckInToken } = await import("@/lib/checkIn/token");
  guest.checkInToken = generateCheckInToken();
  await InvitationGuest.updateOne(
    { _id: guest._id },
    { $set: { checkInToken: guest.checkInToken } }
  );
  return String(guest.checkInToken);
}
