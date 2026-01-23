import "dotenv/config";
import mongoose from "mongoose";

import Invitation from "@/models/Invitation";
import Guest from "@/models/Guest";

/* =========================
   InvitationGuest schema
   (קריאה בלבד)
========================= */
const InvitationGuestSchema = new mongoose.Schema(
  {
    invitationId: mongoose.Schema.Types.ObjectId,
    name: String,
    phone: String,
    token: String,
    relation: String,
    rsvp: String,
    guestsCount: Number,
    arrivedCount: Number,
    notes: String,
    tableName: String,
    tableNumber: Number,
    createdAt: Date,
    updatedAt: Date,
  },
  { collection: "invitationguests" }
);

const InvitationGuest =
  mongoose.models.InvitationGuest ||
  mongoose.model("InvitationGuest", InvitationGuestSchema);

/* =========================
   Migration
========================= */
async function migrate() {
  console.log("🔌 Connecting to DB...");
  await mongoose.connect(process.env.MONGODB_URI!);

  const invitationGuests = await InvitationGuest.find().lean();
  console.log(`📦 Found ${invitationGuests.length} invitation guests`);

  let created = 0;
  let skipped = 0;
  let noEvent = 0;

  for (const ig of invitationGuests) {
    if (!ig.invitationId || !ig.token) {
      skipped++;
      continue;
    }

    const invitation = await Invitation.findById(ig.invitationId)
      .select("eventId")
      .lean();

    if (!invitation?.eventId) {
      noEvent++;
      continue;
    }

    const exists = await Guest.findOne({
      invitationId: ig.invitationId,
      token: ig.token,
    }).lean();

    if (exists) {
      skipped++;
      continue;
    }

    await Guest.create({
      invitationId: ig.invitationId,
      eventId: invitation.eventId,

      name: ig.name,
      phone: ig.phone,
      token: ig.token,
      relation: ig.relation || null,

      rsvp: ig.rsvp || "pending",
      guestsCount: ig.guestsCount ?? 1,
      arrivedCount: ig.arrivedCount ?? 0,

      tableName: ig.tableName || null,
      tableNumber: ig.tableNumber ?? null,

      notes: ig.notes || "",
      createdAt: ig.createdAt,
      updatedAt: ig.updatedAt,
    });

    created++;
  }

  console.log("✅ Migration finished");
  console.log("➕ Created:", created);
  console.log("⏭️ Skipped:", skipped);
  console.log("⚠️ No eventId:", noEvent);

  await mongoose.disconnect();
}

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Migration failed", err);
    process.exit(1);
  });
