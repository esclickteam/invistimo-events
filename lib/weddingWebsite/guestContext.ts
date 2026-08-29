import InvitationGuest from "@/models/InvitationGuest";
import { hasGuestMessagesFeature } from "@/lib/features/entitlements";

export type PublicGuestActions = {
  authenticated: true;
  rsvp: "yes" | "no" | "pending";
  arrivedCount: number;
  guestsCount: number;
  notes: string;
  canRsvp: true;
  canMessage: boolean;
};

function notesToString(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean)
      .join(", ");
  }
  return "";
}

export async function resolvePublicGuestActions({
  invitationId,
  token,
  owner,
}: {
  invitationId: unknown;
  token?: string | null;
  owner?: { features?: { weddingWebsite?: boolean; guestMessages?: boolean } } | null;
}): Promise<PublicGuestActions | null> {
  const cleanToken = String(token || "").trim();
  if (!cleanToken || !invitationId) return null;

  const guest = await InvitationGuest.findOne({
    invitationId,
    token: cleanToken,
  })
    .select("rsvp status arrivedCount guestsCount notes")
    .lean();

  if (!guest) return null;

  const rsvp =
    guest.rsvp === "yes" || guest.rsvp === "no" || guest.rsvp === "pending"
      ? guest.rsvp
      : guest.status === "yes" || guest.status === "no"
        ? guest.status
        : "pending";

  return {
    authenticated: true,
    rsvp,
    arrivedCount: Number(guest.arrivedCount || 0),
    guestsCount: Number(guest.guestsCount || 1),
    notes: notesToString(guest.notes),
    canRsvp: true,
    canMessage: hasGuestMessagesFeature(owner),
  };
}
