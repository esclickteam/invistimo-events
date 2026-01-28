import db from "@/lib/db";
import mongoose from "mongoose";
import InvitationGuest from "@/models/InvitationGuest";
import Group from "@/models/Group";

export async function recalcGroupExpectedCount(groupId: string) {
  if (!groupId) {
    console.log("❌ recalcGroupExpectedCount: missing groupId");
    return;
  }

  try {
    console.log("♻️ recalcGroupExpectedCount called:", groupId);

    await db();

    // ✅ לוודא שזה ObjectId אמיתי (מונע חוסר התאמה בין string/ObjectId)
    const gid = mongoose.Types.ObjectId.isValid(groupId)
      ? new mongoose.Types.ObjectId(groupId)
      : null;

    if (!gid) {
      console.log("❌ recalcGroupExpectedCount: invalid ObjectId:", groupId);
      return;
    }

    const guests = await InvitationGuest.find({
      groupId: gid,
      rsvp: "yes",
    })
      .select("guestsCount rsvp groupId")
      .lean();

    console.log(
      "👥 found YES guests:",
      guests.length,
      guests.map((g: any) => ({
        guestsCount: g.guestsCount,
        rsvp: g.rsvp,
        groupId: String(g.groupId),
      }))
    );

    const expectedCount = guests.reduce((sum: number, g: any) => {
      const n = Number(g.guestsCount ?? 1);
      return sum + (Number.isFinite(n) && n > 0 ? n : 1);
    }, 0);

    console.log("✅ computed expectedCount:", expectedCount);

    const updatedGroup = await Group.findByIdAndUpdate(
      gid,
      { expectedCount },
      { new: true }
    ).lean();

    console.log("✅ group updated:", {
      _id: String(updatedGroup?._id),
      expectedCount: updatedGroup?.expectedCount,
    });
  } catch (err) {
    console.error("❌ recalcGroupExpectedCount error:", err);
  }
}
