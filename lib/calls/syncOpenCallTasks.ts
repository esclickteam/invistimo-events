import mongoose from "mongoose";
import CallTask from "@/models/CallTask";
import CallWorkOrder from "@/models/CallWorkOrder";
import InvitationGuest from "@/models/InvitationGuest";
import {
  callbackCarryTaskPatch,
  filterGuestsForCallRound,
  getGuestRsvpValue,
  getSourceAudienceByRound,
  hasFinalAttendanceRsvp,
  type CallRoundNumber,
} from "@/lib/calls/callRoundEligibility";

const OPEN_ORDER_STATUSES = ["scheduled", "open", "in_progress", "paused"];
const OPEN_TASK_STATUSES = ["pending", "in_progress", "open", "assigned", "active"];

function asRound(value: unknown): CallRoundNumber | null {
  const round = Number(value);
  if (round === 1 || round === 2 || round === 3) return round;
  return null;
}

export async function countMissingDialableGuests(workOrder: any) {
  const round = asRound(workOrder?.round);
  if (!round) return 0;
  if (!OPEN_ORDER_STATUSES.includes(String(workOrder?.status || ""))) return 0;
  const invitationId = workOrder.invitationId;
  const guests = await InvitationGuest.find({ invitationId }).lean();
  const dialable = filterGuestsForCallRound({ guests, round });
  const tasks = await CallTask.find({ workOrderId: workOrder._id, status: { $ne: "cancelled" } })
    .select("guestId")
    .lean();
  const covered = new Set(tasks.map((task: any) => String(task.guestId)));
  return dialable.filter((guest) => !covered.has(String(guest._id))).length;
}

export async function ensureOpenCallTasksForInvitation(invitationId: string) {
  if (!mongoose.Types.ObjectId.isValid(invitationId)) return { created: 0, withdrawn: 0 };
  const invitationObjectId = new mongoose.Types.ObjectId(invitationId);
  const orders = await CallWorkOrder.find({
    invitationId: invitationObjectId,
    type: "rsvp_calls",
    status: { $in: OPEN_ORDER_STATUSES },
  }).lean();
  const guests = await InvitationGuest.find({ invitationId: invitationObjectId }).lean();
  let created = 0;
  let withdrawn = 0;

  for (const order of orders) {
    const round = asRound((order as any).round);
    if (!round) continue;
    const dialable = filterGuestsForCallRound({ guests, round });
    for (const guest of dialable) {
      const carry = callbackCarryTaskPatch(guest);
      const now = new Date();
      const result = await CallTask.updateOne(
        { workOrderId: (order as any)._id, guestId: (guest as any)._id },
        {
          $setOnInsert: {
            type: "rsvp_call",
            workOrderId: (order as any)._id,
            invitationId: invitationObjectId,
            guestId: (guest as any)._id,
            clientName: (order as any).clientName || "",
            clientEmail: (order as any).clientEmail || "",
            eventName: (order as any).eventName || "",
            eventDate: (order as any).eventDate || null,
            guestName: guest.name || "",
            guestPhone: guest.phone || "",
            round,
            sourceAudience: getSourceAudienceByRound(round),
            workDate: (order as any).workDate || now,
            status: "pending",
            result: null,
            priority: carry.priority ?? 0,
            sortOrder: carry.callbackFromRound ? -1 : 0,
            callbackFromRound: carry.callbackFromRound ?? null,
            inclusionReason: carry.inclusionReason || "eligible_current_rsvp",
            attemptsCount: 0,
            rsvpStatus: getGuestRsvpValue(guest),
            createdAt: now,
            updatedAt: now,
          },
        },
        { upsert: true }
      );
      if (result.upsertedCount) created += 1;
    }

    for (const guest of guests) {
      if (!hasFinalAttendanceRsvp(guest)) continue;
      const openTask = await CallTask.findOne({
        workOrderId: (order as any)._id,
        guestId: (guest as any)._id,
        status: { $in: OPEN_TASK_STATUSES },
        attemptsCount: { $lte: 0 },
      });
      if (!openTask) continue;
      const { default: CallAttempt } = await import("@/models/CallAttempt");
      const attempt = await CallAttempt.findOne({ taskId: openTask._id }).select("_id").lean();
      if (attempt) continue;
      await CallTask.updateOne(
        { _id: openTask._id },
        {
          $set: {
            status: "cancelled",
            result: null,
            cancelReason: "guest_rsvp_final_before_dial",
            cancelledAt: new Date(),
            updatedAt: new Date(),
          },
        }
      );
      withdrawn += 1;
    }
  }

  return { created, withdrawn };
}
