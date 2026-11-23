import mongoose from "mongoose";
import CallTask from "@/models/CallTask";
import { isUntouchedPendingCallTask } from "@/lib/calls/callRoundEligibility";

const FINAL_RSVP = new Set(["yes", "no"]);

export { isUntouchedPendingCallTask };

/**
 * When a guest confirms or declines, drop them from extra-round queues
 * that have not been called yet. The task row is cancelled, not deleted.
 */
export async function withdrawPendingExtraRoundTasksForFinalRsvp(input: {
  guestId: unknown;
  rsvp: unknown;
}) {
  const rsvp = String(input.rsvp || "").trim().toLowerCase();
  if (!FINAL_RSVP.has(rsvp)) return { withdrawn: 0 };

  const id = String(input.guestId || "");
  if (!mongoose.Types.ObjectId.isValid(id)) return { withdrawn: 0 };

  const result = await CallTask.updateMany(
    {
      guestId: new mongoose.Types.ObjectId(id),
      round: { $gte: 4 },
      status: "pending",
      startedAt: null,
      completedAt: null,
      $or: [
        { attemptsCount: { $in: [0, null] } },
        { attemptsCount: { $exists: false } },
      ],
    },
    {
      $set: {
        status: "cancelled",
        adminNote:
          "הוסר מתור הסבב כי התקבל אישור או סירוב, בלי למחוק היסטוריית שיחות",
        updatedAt: new Date(),
      },
    }
  );

  return { withdrawn: Number(result.modifiedCount || 0) };
}
