import db from "@/lib/db";              // ✅ להוסיף
import InvitationGuest from "@/models/InvitationGuest";
import Group from "@/models/Group";

export async function recalcGroupExpectedCount(groupId: string) {
  if (!groupId) return;

  await db();                           // ✅ להוסיף

  const guests = await InvitationGuest.find({
    groupId,
    rsvp: "yes",
  })
    .select("guestsCount")
    .lean();

  const expectedCount = guests.reduce((sum, g: any) => {
    const n = Number(g.guestsCount ?? 1);
    return sum + (Number.isFinite(n) && n > 0 ? n : 1);
  }, 0);

  await Group.findByIdAndUpdate(groupId, { expectedCount });
}
