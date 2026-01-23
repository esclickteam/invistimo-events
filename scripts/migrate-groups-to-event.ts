import "dotenv/config"; // ⬅️ חובה כאן


import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Group from "@/models/Group";
import Invitation from "@/models/Invitation";
import Event from "@/models/Event";

async function migrateGroupsToEvent() {
  await dbConnect();

  console.log("🚀 Starting groups migration...");

  // 1️⃣ מציאת כל הקבוצות שאין להן eventId
  const groups = await Group.find({
    eventId: { $exists: false },
    invitationId: { $exists: true },
  });

  console.log(`🔍 Found ${groups.length} groups to migrate`);

  let migrated = 0;
  let skipped = 0;

  for (const group of groups) {
    try {
      // 2️⃣ מציאת ההזמנה
      const invitation = await Invitation.findById(group.invitationId).lean();
      if (!invitation) {
        console.warn(`⚠️ Invitation not found for group ${group._id}`);
        skipped++;
        continue;
      }

      // 3️⃣ מציאת האירוע
      const eventId = invitation.eventId;
      if (!eventId) {
        console.warn(`⚠️ No eventId on invitation ${invitation._id}`);
        skipped++;
        continue;
      }

      // 4️⃣ עדכון הקבוצה
      await Group.updateOne(
        { _id: group._id },
        {
          $set: { eventId },
        }
      );

      migrated++;
    } catch (err) {
      console.error(`❌ Failed migrating group ${group._id}`, err);
      skipped++;
    }
  }

  console.log("✅ Migration finished");
  console.log(`✔️ Migrated: ${migrated}`);
  console.log(`⏭️ Skipped: ${skipped}`);

  await mongoose.disconnect();
}

// הרצה
migrateGroupsToEvent()
  .then(() => {
    console.log("🎉 Done");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Migration crashed", err);
    process.exit(1);
  });
