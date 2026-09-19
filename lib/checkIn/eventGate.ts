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

export function checkInActionBlocked(gate: CheckInEventGate) {
  if (!gate.checkInEnabled) {
    return {
      error: "CHECKIN_DISABLED",
      status: 403,
      message: "Invistimo Check-in אינו פעיל באירוע זה",
    };
  }
  if (!gate.live) {
    return {
      error: "EVENT_NOT_LIVE",
      status: 403,
      message: "סריקה אפשרית רק כאשר האירוע במצב LIVE",
    };
  }
  return null;
}
