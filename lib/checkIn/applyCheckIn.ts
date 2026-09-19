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
        | "GUEST_NOT_FOUND"
        | "SAVE_FAILED"
        | "CONCURRENT_UPDATE";
      confirmed?: number;
      previousCheckedInCount?: number;
      currentCheckedInCount?: number;
    };

/**
 * Atomic check-in: never auto-increments without quantityAdded,
 * and uses optimistic locking on actualArrivedCount to prevent
 * double writes from two devices scanning the same QR.
 */
export async function applyCheckIn(
  input: ApplyCheckInInput
): Promise<ApplyCheckInResult> {
  const guest = input.guest;
  if (!guest?._id) {
    return { ok: false, error: "אורח לא נמצא", code: "GUEST_NOT_FOUND" };
  }

  const quantity = Math.floor(Number(input.quantityAdded));
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return {
      ok: false,
      error: "כמות לא תקינה — יש לבחור כמה נוספים הגיעו",
      code: "INVALID_QUANTITY",
    };
  }

  const previous = checkedInGuestCount(guest);
  const confirmed = confirmedGuestCount(guest);
  const next = previous + quantity;
  const overridden = next > confirmed;

  // Optimistic lock: only write if actualArrivedCount is still `previous`
  const updated = await InvitationGuest.findOneAndUpdate(
    {
      _id: guest._id,
      $or: [
        { actualArrivedCount: previous },
        ...(previous === 0
          ? [{ actualArrivedCount: { $exists: false } }, { actualArrivedCount: null }]
          : []),
      ],
    },
    {
      $set: { actualArrivedCount: next },
    },
    { new: true }
  );

  if (!updated) {
    const fresh = await InvitationGuest.findById(guest._id)
      .select("actualArrivedCount arrivedCount rsvp guestsCount")
      .lean();
    return {
      ok: false,
      error:
        "האורח עודכן במקביל ממכשיר אחר. רעננו והזינו שוב כמה נוספים הגיעו.",
      code: "CONCURRENT_UPDATE",
      confirmed,
      previousCheckedInCount: previous,
      currentCheckedInCount: checkedInGuestCount(fresh || {}),
    };
  }

  guest.actualArrivedCount = next;

  const eventId = input.eventId || guest.eventId || null;
  const invitationId = input.invitationId || guest.invitationId || null;

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
    guest: updated,
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
  if (!guest?._id) {
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
  const overridden = next > confirmed;

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

  const updated = await InvitationGuest.findOneAndUpdate(
    {
      _id: guest._id,
      $or: [
        { actualArrivedCount: previous },
        ...(previous === 0
          ? [{ actualArrivedCount: { $exists: false } }, { actualArrivedCount: null }]
          : []),
      ],
    },
    { $set: { actualArrivedCount: next } },
    { new: true }
  );

  if (!updated) {
    const fresh = await InvitationGuest.findById(guest._id)
      .select("actualArrivedCount arrivedCount rsvp guestsCount")
      .lean();
    return {
      ok: false,
      error:
        "האורח עודכן במקביל ממכשיר אחר. רעננו והזינו שוב.",
      code: "CONCURRENT_UPDATE",
      confirmed,
      previousCheckedInCount: previous,
      currentCheckedInCount: checkedInGuestCount(fresh || {}),
    };
  }

  guest.actualArrivedCount = next;

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
    guest: updated,
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

export async function undoCheckIn(input: {
  guest: any;
  quantity: number;
  scannedByUserId: string;
  method?: CheckInMethod;
  deviceSession?: string | null;
  eventId?: string | null;
  invitationId?: string | null;
}): Promise<ApplyCheckInResult> {
  const guest = input.guest;
  if (!guest?._id) {
    return { ok: false, error: "אורח לא נמצא", code: "GUEST_NOT_FOUND" };
  }

  const quantity = Math.floor(Number(input.quantity));
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return {
      ok: false,
      error: "כמות לא תקינה",
      code: "INVALID_QUANTITY",
    };
  }

  const previous = checkedInGuestCount(guest);
  const next = previous - quantity;
  if (next < 0) {
    return {
      ok: false,
      error: "לא ניתן לבטל יותר ממה שנרשם",
      code: "INVALID_QUANTITY",
      previousCheckedInCount: previous,
    };
  }

  const confirmed = confirmedGuestCount(guest);
  const updated = await InvitationGuest.findOneAndUpdate(
    {
      _id: guest._id,
      $or: [
        { actualArrivedCount: previous },
        ...(previous === 0
          ? [{ actualArrivedCount: { $exists: false } }, { actualArrivedCount: null }]
          : []),
      ],
    },
    { $set: { actualArrivedCount: next } },
    { new: true }
  );

  if (!updated) {
    const fresh = await InvitationGuest.findById(guest._id)
      .select("actualArrivedCount arrivedCount rsvp guestsCount")
      .lean();
    return {
      ok: false,
      error: "האורח עודכן במקביל ממכשיר אחר.",
      code: "CONCURRENT_UPDATE",
      confirmed,
      previousCheckedInCount: previous,
      currentCheckedInCount: checkedInGuestCount(fresh || {}),
    };
  }

  guest.actualArrivedCount = next;

  const log = await CheckInLog.create({
    eventId: input.eventId || guest.eventId || undefined,
    invitationId: input.invitationId || guest.invitationId || undefined,
    invitationGuestId: guest._id,
    scannedByUserId: input.scannedByUserId,
    scannedAt: new Date(),
    quantityAdded: -quantity,
    previousCheckedInCount: previous,
    newCheckedInCount: next,
    method: input.method || "QR",
    deviceSession: input.deviceSession || null,
    overridden: false,
  });

  return {
    ok: true,
    guest: updated,
    previousCheckedInCount: previous,
    newCheckedInCount: next,
    quantityAdded: -quantity,
    confirmed,
    overridden: false,
    logId: String(log._id),
  };
}
