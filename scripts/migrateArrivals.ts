import "dotenv/config";

import dbConnect from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";
import LiveArrival from "@/models/LiveArrival";
import Invitation from "@/models/Invitation";
import Event from "@/models/Event";

async function migrateArrivals() {
  await dbConnect();

  const guests = await InvitationGuest.find({
    arrivedCount: { $gt: 0 },
  }).select("_id invitationId arrivedCount");

  let created = 0;
  let skipped = 0;

  // cache כדי לא לפנות ל־DB שוב ושוב
  const invitationToProducer = new Map<string, string>();

  for (const g of guests) {
    const invitationId = String(g.invitationId);

    // אם כבר קיים LiveArrival – מדלגים
    const exists = await LiveArrival.findOne({
      invitationId: g.invitationId,
      guestId: g._id,
    });

    if (exists) {
      skipped++;
      continue;
    }

    // מציאת המפיק דרך Invitation → Event
    let producerId = invitationToProducer.get(invitationId);

    if (!producerId) {
      const invitation = await Invitation.findById(invitationId)
        .select("eventId")
        .lean();

      if (!invitation?.eventId) {
        console.warn("⚠️ No event for invitation:", invitationId);
        continue;
      }

      const event = await Event.findById(invitation.eventId)
        .select("producerId")
        .lean();

      if (!event?.producerId) {
        console.warn("⚠️ No producer for event:", invitation.eventId);
        continue;
      }

      producerId = String(event.producerId);
      invitationToProducer.set(invitationId, producerId);
    }

    // יצירת LiveArrival (מפיק בלבד)
    await LiveArrival.create({
      invitationId: g.invitationId,
      guestId: g._id,
      arrivedCount: g.arrivedCount,
      updatedBy: producerId, // 👈 המפיק האמיתי
    });

    created++;
  }

  console.log("✅ Migration finished");
  console.log("Created:", created);
  console.log("Skipped:", skipped);

  process.exit(0);
}

migrateArrivals().catch((e) => {
  console.error("❌ Migration failed", e);
  process.exit(1);
});
