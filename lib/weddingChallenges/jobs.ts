import dbConnect from "@/lib/db";
import WeddingChallengeConfig from "@/models/WeddingChallengeConfig";
import { sendWeddingChallengesOpeningSms } from "./sendOpeningSms";
import { WEDDING_CHALLENGES_GIVEAWAY_AVAILABLE } from "./constants";
import { drawWeddingChallengesGiveaway } from "./draw";
import { normalizeWeddingChallengeSettings } from "./settings";
import {
  dueWeddingChallengesSmsFilter,
  logWeddingChallengesSms,
  logWeddingChallengesSmsError,
} from "./openingSms";

export async function processWeddingChallengesJobs(now = new Date()) {
  await dbConnect();

  const smsDue = await WeddingChallengeConfig.find(dueWeddingChallengesSmsFilter(now))
    .select("eventId settings")
    .lean();

  logWeddingChallengesSms("cron picked up event", {
    now: now.toISOString(),
    count: smsDue.length,
    eventIds: smsDue.map((row) => String(row.eventId)),
  });

  const drawDue = WEDDING_CHALLENGES_GIVEAWAY_AVAILABLE
    ? await WeddingChallengeConfig.find({
        "settings.giveaway.enabled": true,
        "settings.giveaway.drawMode": "AUTO_DRAW_AT_TIME",
        "settings.giveaway.drawAt": { $lte: now },
        $or: [
          { "settings.giveaway.drawnAt": null },
          { "settings.giveaway.drawnAt": { $exists: false } },
        ],
        "settings.giveaway.locked": { $ne: true },
      })
        .select("eventId settings")
        .lean()
    : [];

  const sms = { processed: 0, sent: 0, failed: 0 };
  for (const row of smsDue) {
    sms.processed += 1;
    try {
      const result = await sendWeddingChallengesOpeningSms({
        eventId: String(row.eventId),
        source: "cron",
      });
      if (result.ok) sms.sent += result.sent;
      else {
        sms.failed += 1;
        logWeddingChallengesSmsError("cron send failed", {
          eventId: String(row.eventId),
          code: result.error,
          lastError: "lastError" in result ? result.lastError : null,
        });
      }
    } catch (err) {
      sms.failed += 1;
      logWeddingChallengesSmsError("cron send threw", {
        eventId: String(row.eventId),
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const draws = { processed: 0, drawn: 0, failed: 0 };
  for (const row of drawDue) {
    const settings = normalizeWeddingChallengeSettings(row.settings);
    if (settings.giveaway.drawMode !== "AUTO_DRAW_AT_TIME") continue;
    draws.processed += 1;
    try {
      const result = await drawWeddingChallengesGiveaway({
        eventId: String(row.eventId),
      });
      if (result.ok && result.winner) draws.drawn += 1;
      else draws.failed += 1;
    } catch {
      draws.failed += 1;
    }
  }

  return { sms, draws };
}
