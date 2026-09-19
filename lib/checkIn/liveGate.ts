export type EventLiveStatus = "REGULAR" | "LIVE";

export function readEventLiveStatus(event: {
  liveStatus?: unknown;
} | null | undefined): EventLiveStatus {
  return String(event?.liveStatus || "").toUpperCase() === "LIVE"
    ? "LIVE"
    : "REGULAR";
}

export function isEventLive(event: {
  liveStatus?: unknown;
} | null | undefined) {
  return readEventLiveStatus(event) === "LIVE";
}

/** Add-on on, and the event is actually live. */
export function canPerformCheckIn(event: {
  checkInEnabled?: unknown;
  liveStatus?: unknown;
} | null | undefined) {
  return Boolean(event?.checkInEnabled) && isEventLive(event);
}
