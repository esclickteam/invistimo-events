import InvitationGuest from "@/models/InvitationGuest";
import WeddingChallengeConfig from "@/models/WeddingChallengeConfig";
import WeddingChallengeGuest from "@/models/WeddingChallengeGuest";
import { pickWeightedWinner } from "./giveaway";
import { userHasWeddingChallengesGiveawayEntitlement } from "./entitlement";
import { loadEventChallengeContext } from "./service";
import { normalizeWeddingChallengeSettings } from "./settings";

export async function drawWeddingChallengesGiveaway(params: {
  eventId: string;
  reset?: boolean;
}) {
  const context = await loadEventChallengeContext(params.eventId);
  if (!context) return { ok: false as const, error: "EVENT_NOT_FOUND" };

  if (
    !userHasWeddingChallengesGiveawayEntitlement(context.owner) ||
    !context.settings.giveaway.enabled
  ) {
    return { ok: false as const, error: "GIVEAWAY_DISABLED" };
  }

  const current = normalizeWeddingChallengeSettings(context.config.settings);
  const locked = Boolean(current.giveaway.locked || current.giveaway.drawnAt);
  if (locked && !params.reset) {
    return {
      ok: false as const,
      error: "DRAW_LOCKED",
      winner: {
        guestId: current.giveaway.winnerGuestId,
        name: current.giveaway.winnerName,
        prizeText: current.giveaway.prizeText,
      },
    };
  }

  if (params.reset) {
    context.config.settings.giveaway.winnerGuestId = null;
    context.config.settings.giveaway.winnerName = "";
    context.config.settings.giveaway.drawnAt = null;
    context.config.settings.giveaway.locked = false;
    await context.config.save();
    return { ok: true as const, reset: true as const, winner: null };
  }

  const claimed = await WeddingChallengeConfig.findOneAndUpdate(
    {
      _id: context.config._id,
      "settings.giveaway.locked": { $ne: true },
      $or: [
        { "settings.giveaway.drawnAt": null },
        { "settings.giveaway.drawnAt": { $exists: false } },
      ],
    },
    { $set: { "settings.giveaway.locked": true } },
    { new: true }
  );

  if (!claimed) {
    return { ok: false as const, error: "DRAW_LOCKED" };
  }

  const rows = await WeddingChallengeGuest.find({ eventId: params.eventId }).lean();
  const guests = await InvitationGuest.find({
    _id: { $in: rows.map((row) => row.guestId) },
  })
    .select("name")
    .lean();
  const names = new Map(
    guests.map((guest) => [String(guest._id), String(guest.name || "אורח")])
  );

  const winner = pickWeightedWinner(
    rows.map((row) => ({
      guestId: String(row.guestId),
      guestName: names.get(String(row.guestId)) || "אורח",
      entries: Number(row.giveawayEntries || 0),
    }))
  );

  if (!winner) {
    claimed.settings.giveaway.locked = false;
    await claimed.save();
    return { ok: false as const, error: "NO_ENTRIES" };
  }

  claimed.settings.giveaway.winnerGuestId = winner.guestId;
  claimed.settings.giveaway.winnerName = winner.guestName;
  claimed.settings.giveaway.drawnAt = new Date();
  claimed.settings.giveaway.locked = true;
  await claimed.save();

  return {
    ok: true as const,
    winner: {
      guestId: winner.guestId,
      name: winner.guestName,
      entries: winner.entries,
      prizeText: claimed.settings.giveaway.prizeText,
    },
  };
}
