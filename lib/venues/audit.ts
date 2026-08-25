import VenueAuditLog from "@/models/VenueAuditLog";

export async function writeVenueAudit(params: {
  venueId: string;
  ownerId?: string | null;
  actorUserId: string;
  action: string;
  targetType: string;
  targetId?: string;
  meta?: Record<string, unknown>;
}) {
  try {
    await VenueAuditLog.create({
      venueId: params.venueId,
      ownerId: params.ownerId || null,
      actorUserId: params.actorUserId,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId || "",
      meta: params.meta || {},
    });
  } catch (error) {
    console.error("venue audit write failed:", error);
  }
}
