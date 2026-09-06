import WeddingChallengeConfig from "@/models/WeddingChallengeConfig";
import { sendWeddingChallengesOpeningSms } from "./sendOpeningSms";
import { drawWeddingChallengesGiveaway } from "./draw";
import { normalizeWeddingChallengeSettings } from "./settings";

export async function processWeddingChallengesJobs(now = new Date()) {
  const smsDue = await WeddingChallengeConfig.find({
    "settings.sms.status": "scheduled",
    "settings.sms.scheduledAt": { $lte: now },
    $or: [{ "settings.sms.sentAt": null }, { "settings.sms.sentAt": { $exists: false } }],
  })
    .select("eventId")
    .lean();

  const drawDue = await WeddingChallengeConfig.find({
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
    .lean();

  const sms = { processed: 0, sent: 0, failed: 0 };
  for (const row of smsDue) {
    sms.processed += 1;
    try {
      const result = await sendWeddingChallengesOpeningSms({
        eventId: String(row.eventId),
      });
      if (result.ok) sms.sent += result.sent;
      else sms.failed += 1;
    } catch {
      sms.failed += 1;
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
