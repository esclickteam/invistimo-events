import mongoose from "mongoose";

import Event from "@/models/Event";
import Invitation from "@/models/Invitation";
import {
  planSharedIdentityMirror,
  type SharedIdentityPatch,
  type SharedIdentitySource,
  type SharedIdentityWriteResult,
} from "@/lib/eventDetails/sharedEventIdentity";

function idString(value: unknown) {
  return value ? String(value) : "";
}

export async function loadLinkedInvitations(eventId: unknown) {
  const id = idString(eventId);
  if (!id || !mongoose.Types.ObjectId.isValid(id)) return [];
  return Invitation.find({
    $or: [{ eventId: id }, { productionEventId: id }, { linkedEventId: id }],
    standaloneGame: { $ne: true },
  }).lean();
}

async function persistSharedIdentityMirrorInner(input: {
  source: SharedIdentitySource;
  incoming: SharedIdentityPatch;
  eventId?: string | null;
  invitationId?: string | null;
  event?: any | null;
  invitations?: any[];
}): Promise<SharedIdentityWriteResult> {
  let event = input.event || null;
  const eventId = idString(input.eventId || event?._id);

  if (!event && eventId && mongoose.Types.ObjectId.isValid(eventId)) {
    event = await Event.findById(eventId).lean();
  }

  let invitations = Array.isArray(input.invitations) ? [...input.invitations] : [];
  if (!invitations.length && eventId) {
    invitations = await loadLinkedInvitations(eventId);
  }

  if (input.invitationId) {
    const already = invitations.some(
      (row) => idString(row?._id) === idString(input.invitationId)
    );
    if (!already) {
      const extra = await Invitation.findById(input.invitationId).lean();
      if (extra) invitations.push(extra);
    }
  }

  const plan = planSharedIdentityMirror({
    source: input.source,
    incoming: input.incoming,
    event,
    invitations,
    sourceInvitationId: input.invitationId || undefined,
  });

  let eventUpdated = false;
  if (
    eventId &&
    mongoose.Types.ObjectId.isValid(eventId) &&
    Object.keys(plan.eventSet).length > 1
  ) {
    await Event.updateOne(
      { _id: new mongoose.Types.ObjectId(eventId) },
      { $set: plan.eventSet }
    );
    eventUpdated = true;
  }

  let invitationsUpdated = 0;
  for (const update of plan.invitationUpdates) {
    if (!mongoose.Types.ObjectId.isValid(update.id)) continue;
    await Invitation.collection.updateOne(
      { _id: new mongoose.Types.ObjectId(update.id) },
      { $set: update.set }
    );
    invitationsUpdated += 1;
  }

  return {
    ...plan,
    eventUpdated,
    invitationsUpdated,
  };
}

export async function persistSharedIdentityMirror(input: {
  source: SharedIdentitySource;
  incoming: SharedIdentityPatch;
  eventId?: string | null;
  invitationId?: string | null;
  event?: any | null;
  invitations?: any[];
}): Promise<SharedIdentityWriteResult> {
  try {
    return await persistSharedIdentityMirrorInner(input);
  } catch (err) {
    console.error("persistSharedIdentityMirror failed:", err);
    return {
      eventSet: {},
      invitationUpdates: [],
      conflicts: [],
      eventUpdated: false,
      invitationsUpdated: 0,
    };
  }
}
