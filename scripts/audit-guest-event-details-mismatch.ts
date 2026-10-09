/**
 * Dry-run audit: classify Event/Invitation shared-identity mismatches.
 *
 *   npx tsx scripts/audit-guest-event-details-mismatch.ts
 *
 * Read-only. Does not write to the database.
 */

import fs from "node:fs";
import path from "node:path";

function loadLocalEnv() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

loadLocalEnv();

const mongoUri =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  process.env.DATABASE_URL ||
  "";

function toIsoDay(value: unknown) {
  if (!value) return "";
  const date = new Date(value as string | Date);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

async function audit() {
  if (!mongoUri) {
    console.log(
      JSON.stringify(
        {
          scannedInvitations: 0,
          mismatchedTotal: 0,
          mismatchedActive: 0,
          byClass: {},
          note: "NO_DB: missing MONGO_URI / MONGODB_URI. Read-only scan skipped.",
          livePublicSample: "use /api/invite/{shareId} + classifySharedIdentity",
        },
        null,
        2
      )
    );
    return;
  }

  const mongoose = (await import("mongoose")).default;
  const Event = (await import("../models/Event")).default;
  const Invitation = (await import("../models/Invitation")).default;
  const {
    detectGuestEventDetailsMismatch,
    resolveCentralEventDetails,
  } = await import("../lib/eventDetails/centralEventDetails");
  const { classifySharedIdentity } = await import(
    "../lib/eventDetails/sharedEventIdentity"
  );

  await mongoose.connect(mongoUri);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const invitations = await Invitation.find({
    eventId: { $ne: null },
    standaloneGame: { $ne: true },
    shareId: { $exists: true, $ne: "" },
  })
    .select(
      "_id shareId eventId title eventType eventDate eventTime location reminderSentAt rsvpRound1SentAt"
    )
    .lean();

  const mismatches: Array<{
    shareId: string;
    invitationId: string;
    eventId: string;
    class: string;
    fields: string[];
    guestTitle: string;
    guestDate: string;
    guestTime: string;
    active: boolean;
  }> = [];

  for (const invitation of invitations as any[]) {
    const event = await Event.findById(invitation.eventId)
      .select("title eventType date time location status")
      .lean();
    if (!event) continue;

    const fields = detectGuestEventDetailsMismatch(event, invitation);
    if (!fields.length) continue;

    const eventDay =
      toIsoDay(invitation.eventDate) || toIsoDay((event as any).date);
    const active = !eventDay || eventDay >= today.toISOString().slice(0, 10);
    const resolved = resolveCentralEventDetails(event, invitation);

    mismatches.push({
      shareId: String(invitation.shareId || ""),
      invitationId: String(invitation._id),
      eventId: String(invitation.eventId),
      class: classifySharedIdentity(event, invitation),
      fields: fields.map((row) => row.field),
      guestTitle: resolved.title,
      guestDate: resolved.date,
      guestTime: resolved.time,
      active,
    });
  }

  const activeMismatches = mismatches.filter((row) => row.active);
  const byClass = mismatches.reduce<Record<string, number>>((acc, row) => {
    acc[row.class] = (acc[row.class] || 0) + 1;
    return acc;
  }, {});

  console.log(
    JSON.stringify(
      {
        scannedInvitations: invitations.length,
        mismatchedTotal: mismatches.length,
        mismatchedActive: activeMismatches.length,
        byClass,
        note: "Read-only. event-shell-invitation-real is safe to heal Event later. real-conflict must not be auto-overwritten.",
        active: activeMismatches,
      },
      null,
      2
    )
  );

  await mongoose.disconnect();
}

audit().catch((err) => {
  console.error(err);
  process.exit(1);
});
