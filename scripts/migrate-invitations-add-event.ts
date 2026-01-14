import "dotenv/config";
import db from "@/lib/db";
import Invitation from "@/models/Invitation";
import Event from "@/models/Event";
import User from "@/models/User";

/* ============================================================
   Normalize legacy eventType (Hebrew → enum)
============================================================ */
function normalizeEventType(raw?: string): string {
  if (!raw) return "wedding";

  const map: Record<string, string> = {
    "חתונה": "wedding",
    "ברית": "brit",
    "בר מצווה": "bar-mitzvah",
    "בת מצווה": "bat-mitzvah",
    "חינה": "henna",
  };

  // אם זה כבר ערך תקני באנגלית – נשאיר
  const allowed = [
    "wedding",
    "brit",
    "bar-mitzvah",
    "bat-mitzvah",
    "henna",
  ];

  if (allowed.includes(raw)) {
    return raw;
  }

  return map[raw] || "wedding";
}

/* ============================================================
   Migration
============================================================ */
async function migrateInvitations() {
  await db();

  console.log("🚀 Starting Invitation → Event migration");

  const brokenInvitations = await Invitation.find({
    $or: [{ eventId: { $exists: false } }, { eventId: null }],
  });

  console.log(`🔎 Found ${brokenInvitations.length} broken invitations`);

  for (const invitation of brokenInvitations) {
    try {
      console.log("🛠 Fixing invitation:", invitation._id.toString());

      const user = await User.findById(invitation.ownerId).lean();

      const event = await Event.create({
        userId: invitation.ownerId,
        email: user?.email || "noemail@migration.com",
        title: invitation.title || "אירוע משוחזר",
        eventType: normalizeEventType(invitation.eventType), // ✅ FIX
        status: "active",
        date: invitation.eventDate || new Date(),
        time: invitation.eventTime || "00:00",
        maxGuests: invitation.maxGuests || 100,
        location: invitation.location || {},
        createdFromMigration: true,
      });

      invitation.eventId = event._id;
      await invitation.save();

      console.log("✅ Fixed invitation:", invitation._id.toString());
    } catch (err) {
      console.error(
        "❌ Failed fixing invitation:",
        invitation._id.toString(),
        err
      );
    }
  }

  console.log("🏁 Migration finished successfully");
  process.exit(0);
}

/* ============================================================
   Run
============================================================ */
migrateInvitations().catch((err) => {
  console.error("🔥 Migration crashed:", err);
  process.exit(1);
});
