import User from "@/models/User";
import Invitation from "@/models/Invitation";
import {
  getCallRoundDateKeyInIsrael,
  parseCallRoundScheduledAt,
} from "@/lib/calls/callRoundScheduleTime";
import {
  getSourceAudienceByRound,
  type CallRoundNumber,
} from "@/lib/calls/callRoundEligibility";

export type ListedScheduledCallRound = {
  key: string;
  invitationId: string;
  userId: string;
  clientName: string;
  clientEmail: string;
  eventName: string;
  eventDate: Date | null;
  round: CallRoundNumber;
  scheduledAt: Date;
  sourceAudience: ReturnType<typeof getSourceAudienceByRound>;
};

function cleanStr(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStatus(status: unknown) {
  return String(status || "").trim().toLowerCase();
}

function isRoundCancelled(round: any) {
  const status = normalizeStatus(round?.status);
  return (
    status === "cancelled" ||
    status === "canceled" ||
    status === "בוטל" ||
    status === "מבוטל" ||
    round?.cancelled === true ||
    round?.canceled === true ||
    round?.enabled === false
  );
}

function getEventTitle(invitation: any) {
  return (
    invitation?.eventName ||
    invitation?.eventTitle ||
    invitation?.invitationTitle ||
    invitation?.title ||
    invitation?.name ||
    invitation?.coupleName ||
    "אירוע ללא שם"
  );
}

function getEventDate(invitation: any) {
  const raw =
    invitation?.eventDate || invitation?.date || invitation?.event?.date || null;
  if (!raw) return null;
  const date = raw instanceof Date ? raw : new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * All non-cancelled call rounds whose scheduledAt falls on the Israel dateKey.
 * Matches admin "סבבי שיחות לביצוע" for that day, including later hours (22:00).
 */
export async function listScheduledCallRoundsForIsraelDate(
  dateKey: string
): Promise<ListedScheduledCallRound[]> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return [];

  const users = (await User.find({
    $or: [
      { includeCalls: true },
      { "callRoundsSchedule.rounds.scheduledAt": { $exists: true } },
    ],
  })
    .select("_id name email includeCalls callRoundsSchedule")
    .lean()) as any[];

  const relevant = users
    .map((user) => {
      const rounds = Array.isArray(user?.callRoundsSchedule?.rounds)
        ? user.callRoundsSchedule.rounds
        : [];

      const matching = rounds
        .map((round: any) => {
          const scheduledAt = parseCallRoundScheduledAt(round?.scheduledAt);
          const roundNumber = Number(round?.roundNumber || round?.round || 0);
          return { round, scheduledAt, roundNumber };
        })
        .filter((item: any) => {
          if (!item.scheduledAt) return false;
          if (isRoundCancelled(item.round)) return false;
          if (item.roundNumber !== 1 && item.roundNumber !== 2 && item.roundNumber !== 3) {
            return false;
          }
          return getCallRoundDateKeyInIsrael(item.scheduledAt) === dateKey;
        });

      return { user, matching };
    })
    .filter((item) => item.matching.length > 0);

  if (!relevant.length) return [];

  const userIds = relevant.map((item) => item.user._id);
  const invitations = await Invitation.find({
    ownerId: { $in: userIds },
  })
    .select(
      "_id ownerId eventName eventTitle invitationTitle title name coupleName eventDate date createdAt"
    )
    .sort({ eventDate: 1, createdAt: -1 })
    .lean();

  const invitationByOwner = new Map<string, any>();
  for (const invitation of invitations) {
    const ownerId = String(invitation?.ownerId || "");
    if (!ownerId || invitationByOwner.has(ownerId)) continue;
    invitationByOwner.set(ownerId, invitation);
  }

  const listed: ListedScheduledCallRound[] = [];

  for (const { user, matching } of relevant) {
    const ownerId = String(user._id);
    const invitation = invitationByOwner.get(ownerId);
    const invitationId = invitation?._id ? String(invitation._id) : "";

    for (const item of matching) {
      const round = item.roundNumber as CallRoundNumber;
      listed.push({
        key: `${ownerId}_${round}_${item.scheduledAt.getTime()}`,
        invitationId,
        userId: ownerId,
        clientName: cleanStr(user.name) || cleanStr(user.email) || "לקוח ללא שם",
        clientEmail: cleanStr(user.email),
        eventName: getEventTitle(invitation),
        eventDate: getEventDate(invitation),
        round,
        scheduledAt: item.scheduledAt,
        sourceAudience: getSourceAudienceByRound(round),
      });
    }
  }

  listed.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
  return listed;
}
