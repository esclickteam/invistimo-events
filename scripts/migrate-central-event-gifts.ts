/**
 * מיגרציה חוזרת ובטוחה: העברת פרטי מתנה ופרטי אירוע למקור המרכזי ב-Event.
 *
 * שימוש:
 *   npx tsx scripts/migrate-central-event-gifts.ts --dry-run
 *   npx tsx scripts/migrate-central-event-gifts.ts --write
 *
 * לא מוחק שדות ישנים. במקרה של ערכים סותרים — מעדיף giftOptions פעיל
 * ומתעד conflicts ללוג.
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import Event from "../models/Event";
import Invitation from "../models/Invitation";
import {
  giftsToInvitationMirrors,
  mergeGiftsForMigration,
} from "../lib/eventDetails/centralEventDetails";

dotenv.config({ path: ".env.local" });

const mongoUri =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  process.env.DATABASE_URL ||
  "";

if (!mongoUri) {
  throw new Error("Missing MONGO_URI / MONGODB_URI");
}

const write = process.argv.includes("--write");

function cleanString(value: unknown) {
  return String(value || "").trim();
}

async function migrate() {
  console.log(write ? "🚀 WRITE mode" : "👀 DRY-RUN mode");
  await mongoose.connect(mongoUri);
  console.log("✅ Connected");

  const invitations = await Invitation.find({})
    .select(
      "_id eventId title eventType eventDate eventTime location giftOptions publicEventPage hostsNames receptionTime ceremonyTime guestNote city googleMapsUrl"
    )
    .lean();

  let updated = 0;
  let skipped = 0;
  let conflicts = 0;

  for (const invitation of invitations as any[]) {
    const eventId = invitation.eventId;
    if (!eventId) {
      skipped += 1;
      continue;
    }

    const event = await Event.findById(eventId).lean();
    if (!event) {
      skipped += 1;
      continue;
    }

    const merged = mergeGiftsForMigration(event, invitation);
    if (merged.conflicts.length) {
      conflicts += 1;
      console.warn(
        `⚠️ conflict event=${eventId} invitation=${invitation._id}: ${merged.conflicts.join(",")}`
      );
    }

    const already =
      (event as any).gifts?.creditEnabled === merged.gifts.creditEnabled &&
      (event as any).gifts?.creditUrl === merged.gifts.creditUrl &&
      (event as any).gifts?.payboxEnabled === merged.gifts.payboxEnabled &&
      (event as any).gifts?.payboxUrl === merged.gifts.payboxUrl &&
      (event as any).gifts?.bitEnabled === merged.gifts.bitEnabled &&
      (event as any).gifts?.bitPhone === merged.gifts.bitPhone;

    const scheduleItems = invitation.publicEventPage?.schedule?.items || [];
    const receptionTime =
      cleanString((event as any).receptionTime) ||
      cleanString(
        scheduleItems.find((i: any) => /קבלת פנים/i.test(i?.title || ""))?.time
      );
    const ceremonyTime =
      cleanString((event as any).ceremonyTime) ||
      cleanString(
        scheduleItems.find((i: any) => /חופה|טקס/i.test(i?.title || ""))?.time
      );

    const eventSet: Record<string, unknown> = {
      gifts: merged.gifts,
      giftCreditUrl: merged.gifts.creditEnabled ? merged.gifts.creditUrl : "",
    };

    if (!(event as any).hostsNames && invitation.hostsNames) {
      eventSet.hostsNames = cleanString(invitation.hostsNames);
    }
    if (receptionTime) eventSet.receptionTime = receptionTime;
    if (ceremonyTime) eventSet.ceremonyTime = ceremonyTime;
    if (!(event as any).guestNote && invitation.publicEventPage?.note?.text) {
      eventSet.guestNote = cleanString(invitation.publicEventPage.note.text);
    }
    if (!(event as any).parkingNotes && invitation.publicEventPage?.parking?.instructions) {
      eventSet.parkingNotes = cleanString(
        invitation.publicEventPage.parking.instructions
      );
    }

    const mirrors = giftsToInvitationMirrors(merged.gifts);
    const invitationSet = {
      giftOptions: mirrors.giftOptions,
      "publicEventPage.gifts": mirrors.publicGifts,
    };

    if (already && Object.keys(eventSet).length <= 2) {
      // still dual-write mirrors if invitation out of sync
    }

    if (!write) {
      updated += 1;
      continue;
    }

    await Event.updateOne({ _id: eventId }, { $set: eventSet });
    await Invitation.updateOne(
      { _id: invitation._id },
      { $set: invitationSet }
    );
    updated += 1;
  }

  console.log("✅ Done");
  console.log({ updated, skipped, conflicts, write });
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
