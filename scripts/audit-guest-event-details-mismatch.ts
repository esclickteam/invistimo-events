/**
 * Dry-run audit: find active invitations whose Event shell no longer
 * matches the client-edited invitation (title / date / time / type / venue).
 *
 *   npx tsx scripts/audit-guest-event-details-mismatch.ts
 *
 * Read-only. Does not write to the database.
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import Event from "../models/Event";
import Invitation from "../models/Invitation";
import {
  detectGuestEventDetailsMismatch,
  resolveCentralEventDetails,
} from "../lib/eventDetails/centralEventDetails";

dotenv.config({ path: ".env.local" });

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
      "NO_DB: missing MONGO_URI / MONGODB_URI. Skipping live scan."
    );
    process.exit(0);
  }

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
      fields: fields.map((row) => row.field),
      guestTitle: resolved.title,
      guestDate: resolved.date,
      guestTime: resolved.time,
      active,
    });
  }

  const activeMismatches = mismatches.filter((row) => row.active);
  console.log(
    JSON.stringify(
      {
        scannedInvitations: invitations.length,
        mismatchedTotal: mismatches.length,
        mismatchedActive: activeMismatches.length,
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
