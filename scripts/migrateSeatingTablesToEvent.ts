import "dotenv/config"; // ⬅️ חובה

import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import SeatingTable from "@/models/SeatingTable";
import Invitation from "@/models/Invitation";

async function migrateSeatingTablesToEvent() {
  await dbConnect();

  console.log("🚀 Starting seatingTables → eventId migration...");

  // 1️⃣ מציאת כל מסמכי seatingTables שאין להם eventId
  const seatingTables = await SeatingTable.find({
    eventId: { $exists: false },
    invitationId: { $exists: true },
  });

  console.log(`🔍 Found ${seatingTables.length} seatingTables to migrate`);

  let migrated = 0;
  let skipped = 0;

  for (const seating of seatingTables) {
    try {
      // 2️⃣ שליפת ההזמנה
      const invitation = await Invitation.findById(
        seating.invitationId
      ).lean();

      if (!invitation) {
        console.warn(
          `⚠️ Invitation not found for seatingTable ${seating._id}`
        );
        skipped++;
        continue;
      }

      // 3️⃣ בדיקת eventId
      if (!invitation.eventId) {
        console.warn(
          `⚠️ Invitation ${invitation._id} has no eventId`
        );
        skipped++;
        continue;
      }

      // 4️⃣ עדכון seatingTable
      await SeatingTable.updateOne(
        { _id: seating._id },
        {
          $set: {
            eventId: invitation.eventId,
          },
        }
      );

      migrated++;
      console.log(`✅ Updated seatingTable ${seating._id.toString()}`);
    } catch (err) {
      console.error(
        `❌ Failed migrating seatingTable ${seating._id}`,
        err
      );
      skipped++;
    }
  }

  console.log("🎉 Migration finished");
  console.log(`✔️ Migrated: ${migrated}`);
  console.log(`⏭️ Skipped: ${skipped}`);

  await mongoose.disconnect();
}

// ▶️ הרצה
migrateSeatingTablesToEvent()
  .then(() => {
    console.log("🏁 Done");
    process.exit(0);
  })
  .catch((err) => {
    console.error("💥 Migration crashed", err);
    process.exit(1);
  });
