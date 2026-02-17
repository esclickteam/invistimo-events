import "dotenv/config"; // ⬅️ חובה כאן


import mongoose from "mongoose";
import db from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";
import Invitation from "@/models/Invitation";
import Group from "@/models/Group";
import { recalcGroupExpectedCount } from "@/lib/recalcGroupExpectedCount";

async function migrate() {
  try {
    console.log("🚀 Starting migration: relation → group");

    await db();

    const guests = await InvitationGuest.find({
      $or: [{ groupId: { $exists: false } }, { groupId: null }],
      relation: { $exists: true, $ne: "" },
    });

    console.log(`🔎 Found ${guests.length} guests to process`);

    let createdGroups = 0;
    let updatedGuests = 0;

    for (const guest of guests) {
      const relation = guest.relation?.trim();
      if (!relation) continue;

      const invitation = await Invitation.findById(guest.invitationId);
      if (!invitation) continue;

      let group = await Group.findOne({
        invitationId: invitation._id,
        name: relation,
      });

      if (!group) {
        group = await Group.create({
  invitationId: invitation._id,
  eventId: invitation.eventId, // 👈 זה מה שחסר
  name: relation,
});

        createdGroups++;
        console.log(`➕ Created group "${relation}"`);
      }

      guest.groupId = group._id;
      await guest.save();
      updatedGuests++;
    }

    console.log("🔄 Recalculating group expected counts...");

    const allGroups = await Group.find();
    for (const group of allGroups) {
      await recalcGroupExpectedCount(group._id.toString());
    }

    console.log("✅ Migration finished");
    console.log(`👥 Updated guests: ${updatedGuests}`);
    console.log(`📂 Created groups: ${createdGroups}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

migrate();
