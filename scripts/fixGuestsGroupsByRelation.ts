import "dotenv/config"; // ⬅️ חובה כאן


import db from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";
import Group from "@/models/Group";

/* ======================================================
   NORMALIZE STRING
====================================================== */
function normalize(str: string) {
  return String(str || "")
    .replace(/\u00A0/g, " ") // רווחים לא תקינים
    .trim()
    .toLowerCase();
}

/* ======================================================
   MAIN SCRIPT
====================================================== */
async function fixGuestsGroupsByRelation() {
  await db();

  console.log("🚀 Starting fixGuestsGroupsByRelation...");

  // 🔥 רק אורחים בלי קבוצה אבל עם קרבה
  const guests = await InvitationGuest.find({
    $or: [{ groupId: null }, { groupId: { $exists: false } }],
    relation: { $ne: null },
  });

  console.log(`👥 Found ${guests.length} guests to fix`);

  let updated = 0;
  let createdGroups = 0;

  for (const guest of guests) {
    const relationRaw = guest.relation;
    const relationKey = normalize(relationRaw);

    if (!relationKey) continue;

    let group;

    try {
      // 🔥 יצירה בטוחה בלי כפילויות
      group = await Group.findOneAndUpdate(
        {
          invitationId: guest.invitationId,
          name: relationKey,
        },
        {
          $setOnInsert: {
            invitationId: guest.invitationId,
            eventId: guest.eventId,
            name: relationKey,
          },
        },
        {
          upsert: true,
          new: true,
        }
      );

      // אם נוצר חדש
      if (group && group.isNew) {
        createdGroups++;
      }
    } catch (err: any) {
      // 🔥 duplicate → להביא קיים
      if (err.code === 11000) {
        group = await Group.findOne({
          invitationId: guest.invitationId,
          name: relationKey,
        });
      } else {
        console.error("❌ Group error:", err);
        continue;
      }
    }

    if (!group) continue;

    // 🔥 עדכון האורח
    await InvitationGuest.updateOne(
      { _id: guest._id },
      { $set: { groupId: group._id } }
    );

    updated++;
  }

  console.log("✅ Done!");
  console.log("📊 Summary:");
  console.log("➡️ Guests updated:", updated);
  console.log("➡️ Groups created:", createdGroups);

  process.exit(0);
}

/* ======================================================
   RUN
====================================================== */
fixGuestsGroupsByRelation().catch((err) => {
  console.error("💥 Script failed:", err);
  process.exit(1);
});