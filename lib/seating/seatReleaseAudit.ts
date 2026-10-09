/**
 * Audit trail for explicit "שחרור כיסאות" actions.
 * Additive only — never mutates arrival / RSVP fields.
 */

export type SeatReleaseAuditEntry = {
  at: string;
  guestId: string;
  guestName?: string;
  eventId?: string;
  invitationId?: string;
  allocatedBefore: number;
  actualArrivedCount: number;
  released: number;
  allocatedAfter: number;
  actorUserId?: string;
  actorRole?: string;
  source: "syncSeatsToActual" | "releaseSeatsToActual";
};

export function buildSeatReleaseAuditEntry(
  input: Omit<SeatReleaseAuditEntry, "at" | "allocatedAfter"> & {
    allocatedAfter?: number;
  }
): SeatReleaseAuditEntry {
  const released = Math.max(0, Math.floor(Number(input.released || 0)));
  const allocatedBefore = Math.max(
    0,
    Math.floor(Number(input.allocatedBefore || 0))
  );
  const allocatedAfter =
    input.allocatedAfter !== undefined
      ? Math.max(0, Math.floor(Number(input.allocatedAfter || 0)))
      : Math.max(0, allocatedBefore - released);

  return {
    at: new Date().toISOString(),
    guestId: String(input.guestId || ""),
    guestName: input.guestName,
    eventId: input.eventId,
    invitationId: input.invitationId,
    allocatedBefore,
    actualArrivedCount: Math.max(
      0,
      Math.floor(Number(input.actualArrivedCount || 0))
    ),
    released,
    allocatedAfter,
    actorUserId: input.actorUserId,
    actorRole: input.actorRole,
    source: input.source,
  };
}

export function logSeatReleaseAudit(entry: SeatReleaseAuditEntry) {
  console.info("[seatReleaseAudit]", entry);
  return entry;
}
