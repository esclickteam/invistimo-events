import InvitationGuest from "@/models/InvitationGuest";
import { resolveActualArrivedDelta } from "@/lib/liveArrivals/actualArrivedMath";

export { isArrivalOnlyPayload, resolveActualArrivedDelta } from "@/lib/liveArrivals/actualArrivedMath";

export async function persistActualArrivedCount(input: {
  guest: { _id: unknown; invitationId: unknown; actualArrivedCount?: unknown };
  actualArrivedCount?: unknown;
  actualArrivedDelta?: unknown;
}) {
  const guest = input.guest;
  if (!guest?._id || !guest.invitationId) return null;

  const filter = { _id: guest._id, invitationId: guest.invitationId };
  const delta = resolveActualArrivedDelta(input.actualArrivedDelta);
  const hasAbsolute =
    typeof input.actualArrivedCount === "number" &&
    Number.isFinite(input.actualArrivedCount) &&
    input.actualArrivedCount >= 0;

  if (delta == null && !hasAbsolute) return null;

  if (delta != null) {
    if (delta !== 0) {
      await InvitationGuest.updateOne(filter, {
        $inc: { actualArrivedCount: delta },
      });
      await InvitationGuest.updateOne(
        { ...filter, actualArrivedCount: { $lt: 0 } },
        { $set: { actualArrivedCount: 0 } }
      );
    }
  } else if (hasAbsolute) {
    await InvitationGuest.updateOne(filter, {
      $set: { actualArrivedCount: Math.floor(Number(input.actualArrivedCount)) },
    });
  }

  const fresh = await InvitationGuest.findOne(filter)
    .select("actualArrivedCount rsvp status arrivedCount amount guestsCount")
    .lean();

  const actualArrivedCount = Math.max(
    0,
    Math.floor(Number((fresh as any)?.actualArrivedCount || 0))
  );

  return {
    actualArrivedCount,
    rsvp: (fresh as any)?.rsvp,
    status: (fresh as any)?.status,
    arrivedCount: (fresh as any)?.arrivedCount,
    amount: (fresh as any)?.amount,
    guestsCount: (fresh as any)?.guestsCount,
  };
}
