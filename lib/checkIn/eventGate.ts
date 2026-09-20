import mongoose from "mongoose";

import Event from "@/models/Event";
import { isEventLive, readEventLiveStatus, type EventLiveStatus } from "@/lib/checkIn/liveGate";

export type CheckInEventGate = {
  checkInEnabled: boolean;
  live: boolean;
  liveStatus: EventLiveStatus;
};

export async function loadEventCheckInGate(
  eventId: string
): Promise<CheckInEventGate> {
  if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
    return { checkInEnabled: false, live: false, liveStatus: "REGULAR" };
  }

  const event = await Event.findById(eventId)
    .select("checkInEnabled liveStatus")
    .lean();

  return {
    checkInEnabled: Boolean((event as { checkInEnabled?: boolean } | null)?.checkInEnabled),
    live: isEventLive(event as { liveStatus?: string } | null),
    liveStatus: readEventLiveStatus(event as { liveStatus?: string } | null),
  };
}

/**
 * Event entry (QR scan + manual search) is only for LIVE events
 * that purchased / enabled the Invistimo Check-in QR add-on.
 */
export function entryActionBlocked(gate: CheckInEventGate) {
  if (!gate.live) {
    return {
      error: "EVENT_NOT_LIVE",
      status: 403,
      message: "כניסה לאירוע זמינה רק במצב LIVE",
    };
  }
  if (!gate.checkInEnabled) {
    return {
      error: "CHECKIN_DISABLED",
      status: 403,
      message: "כניסה לאירוע זמינה רק עם חבילת QR",
    };
  }
  return null;
}

/** Alias — QR and manual entry share the same gate. */
export function checkInActionBlocked(gate: CheckInEventGate) {
  return entryActionBlocked(gate);
}
