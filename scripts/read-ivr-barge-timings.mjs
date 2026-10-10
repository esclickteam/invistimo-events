/**
 * Read Telnyx barge-in timestamps for one IVR attempt.
 * Does not dial, does not open a round, and does not write.
 *
 * Usage:
 *   npx tsx scripts/read-ivr-barge-timings.mjs <attemptId-or-phone>
 *
 * Prints:
 * - stored bargeDigitAt / bargeStoppedAt / bargeFollowUpStartedAt
 * - the same deltas rebuilt from timeline occurred_at values
 */
import fs from "fs";
import mongoose from "mongoose";

const target = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
if (!target || process.argv.includes("--dial")) {
  console.error("Usage: npx tsx scripts/read-ivr-barge-timings.mjs <attemptId-or-phone>");
  console.error("This script only reads. It does not place a call.");
  process.exit(1);
}

function loadEnv(path) {
  if (!fs.existsSync(path)) return;
  for (const line of fs.readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index < 0) continue;
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv(".env.local");
loadEnv(".env");

function ms(value) {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

function fromTimeline(timeline) {
  const events = Array.isArray(timeline) ? timeline : [];
  const digit = events.find((event) => {
    const key = String(event?.digit || "").replace(/\D/g, "").slice(0, 1);
    return event?.eventType === "call.dtmf.received" && (key === "1" || key === "2" || key === "3");
  });
  const digitMs = ms(digit?.at);
  if (digitMs == null) return null;
  const stopped = events.find((event) => {
    const at = ms(event?.at);
    const ended = event?.eventType === "call.playback.ended" || event?.eventType === "call.speak.ended";
    const stage = String(event?.stage || "");
    return ended && at != null && at >= digitMs && (stage === "intro" || stage === "invalid_choice" || stage === "");
  });
  const followUp = events.find((event) => {
    const at = ms(event?.at);
    const started = event?.eventType === "call.playback.started" || event?.eventType === "call.speak.started";
    const stage = String(event?.stage || "");
    return started && at != null && at >= digitMs && (stage === "ask_count" || stage === "thanks");
  });
  const stoppedMs = ms(stopped?.at);
  const followMs = ms(followUp?.at);
  return {
    digit: String(digit.digit || "").slice(0, 1),
    digitAt: digit.at,
    stoppedAt: stopped?.at || null,
    followUpAt: followUp?.at || null,
    stopMs: stoppedMs == null ? null : stoppedMs - digitMs,
    followUpMs: followMs == null ? null : followMs - digitMs,
    overlap: stoppedMs != null && followMs != null && followMs < stoppedMs,
  };
}

const uri = process.env.MONGO_URI || process.env.MONGODB_URI || "";
if (!uri) {
  console.error("MONGO_URI is missing. No call was placed.");
  process.exit(1);
}

await mongoose.connect(uri);
const attempts = mongoose.connection.collection("ivrcallattempts");
const query = mongoose.isValidObjectId(target)
  ? { _id: new mongoose.Types.ObjectId(target) }
  : { $or: [{ toPhone: target }, { fromPhone: target }, { phone: target }] };
const row = await attempts.find(query).sort({ createdAt: -1 }).limit(1).next();
if (!row) {
  console.error("No IVR attempt found. No call was placed.");
  await mongoose.disconnect();
  process.exit(1);
}

const timeline = fromTimeline(row.timeline);
const report = {
  attemptId: String(row._id),
  phone: row.toPhone || row.phone || "",
  phase: row.phase || "",
  choiceDigit: row.choiceDigit || "",
  pendingChoice: row.pendingChoice || "",
  rsvpResult: row.rsvpResult || "",
  rsvpApplied: row.rsvpApplied === true,
  attendingCount: row.attendingCount ?? null,
  stored: {
    digit: row.bargeDigit || "",
    digitAt: row.bargeDigitAt || null,
    stoppedAt: row.bargeStoppedAt || null,
    followUpAt: row.bargeFollowUpStartedAt || null,
    stopMs: row.bargeStopMs ?? null,
    followUpMs: row.bargeFollowUpMs ?? null,
    overlap: row.bargeOverlap === true,
  },
  fromTelnyxTimeline: timeline,
};
console.log(JSON.stringify(report, null, 2));
await mongoose.disconnect();
