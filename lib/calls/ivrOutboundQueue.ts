import User from "@/models/User";
import Invitation from "@/models/Invitation";
import IvrCallAttempt from "@/models/IvrCallAttempt";
import { fillIvrRoundCapacity } from "@/lib/calls/ivrDialer";
import { continueKosherMessageDials } from "@/lib/kosherPhones/dispatch";
import { KOSHER_MESSAGE_ROUND_ORIGIN } from "@/lib/kosherPhones/match";
import {
  countActiveOutboundByUser,
  planFairDialGrants,
} from "@/lib/calls/ivrCapacity";

function openRoundNumber(user: {
  callRoundsSchedule?: { rounds?: Array<Record<string, unknown>> };
}) {
  const rounds = Array.isArray(user.callRoundsSchedule?.rounds)
    ? user.callRoundsSchedule.rounds
    : [];
  for (const raw of rounds) {
    const status = String(raw?.status || "")
      .trim()
      .toLowerCase();
    if (status !== "in_progress" && status !== "opened") continue;
    const round = Number(raw.roundNumber || raw.round || 0);
    if (round === 1 || round === 2 || round === 3) return round;
  }
  return 0;
}

/**
 * One freed channel starts one waiting call.
 * The event with the fewest active calls is chosen, across regular IVR and kosher.
 */
export async function fillOneSharedOutboundSlot(hint?: {
  userId?: string;
  invitationId?: string;
  round?: number;
}) {
  const activeByUser = await countActiveOutboundByUser();
  const ivrUsers = (await User.find({
    includeCalls: true,
    callsType: "ivr",
    "callRoundsSchedule.rounds.status": { $in: ["in_progress", "opened"] },
  })
    .select("_id callRoundsSchedule.rounds.roundNumber callRoundsSchedule.rounds.round callRoundsSchedule.rounds.status")
    .limit(40)
    .lean()) as Array<{
    _id: unknown;
    callRoundsSchedule?: { rounds?: Array<Record<string, unknown>> };
  }>;

  const ownerIds = ivrUsers.map((user) => user._id);
  const invitations = await Invitation.find({ ownerId: { $in: ownerIds } })
    .select("_id ownerId")
    .sort({ eventDate: 1, createdAt: -1 })
    .lean();
  const invitationByOwner = new Map<string, string>();
  for (const invitation of invitations) {
    const owner = String(invitation.ownerId || "");
    if (owner && !invitationByOwner.has(owner)) {
      invitationByOwner.set(owner, String(invitation._id));
    }
  }

  const kosherGroups = await IvrCallAttempt.aggregate([
    { $match: { origin: KOSHER_MESSAGE_ROUND_ORIGIN, status: "queued" } },
    { $group: { _id: "$userId", n: { $sum: 1 } } },
  ]);

  const sources: Array<{
    id: string;
    kind: "ivr" | "kosher";
    userId: string;
    waiting: number;
    active: number;
    invitationId: string;
    round: number;
  }> = [];

  for (const user of ivrUsers) {
    const userId = String(user._id);
    const round = openRoundNumber(user);
    const invitationId =
      invitationByOwner.get(userId) ||
      (hint?.userId === userId ? String(hint.invitationId || "") : "");
    if (!round || !invitationId) continue;
    sources.push({
      id: `ivr:${userId}:${round}`,
      kind: "ivr",
      userId,
      waiting: 1,
      active: activeByUser.get(userId) || 0,
      invitationId,
      round,
    });
  }

  for (const group of kosherGroups) {
    const userId = String(group._id || "");
    const waiting = Number(group.n) || 0;
    if (!userId || waiting < 1) continue;
    sources.push({
      id: `kosher:${userId}`,
      kind: "kosher",
      userId,
      waiting,
      active: activeByUser.get(userId) || 0,
      invitationId: hint?.userId === userId ? String(hint.invitationId || "") : "",
      round: hint?.userId === userId ? Number(hint.round || 1) : 1,
    });
  }

  if (!sources.length) return { dialed: 0 };

  const grants = planFairDialGrants({ budget: 1, sources });
  const chosen = sources.find((source) => grants[source.id] === 1) || sources[0];

  if (chosen.kind === "ivr") {
    const filled = await fillIvrRoundCapacity({
      userId: chosen.userId,
      invitationId: chosen.invitationId,
      round: chosen.round,
      maxCalls: 1,
    });
    const dialed = Number(filled?.dialed || 0);
    if (dialed > 0) return { dialed };
  }

  const kosher = await continueKosherMessageDials({ maxCalls: 1 });
  return { dialed: Number(kosher?.dialed || 0) };
}
