/**
 * SURGICAL incident recovery write — Production only when CONFIRM_REACTIVATE=1.
 *
 * Sets isActive=true for paid role=user customers who still have
 * Event + Invitation (and usually invitationguests), but were isActive=false.
 *
 * Does NOT create/delete Events, Invitations, or guests. Does NOT touch venues.
 */
import mongoose from "mongoose";
import { readFileSync, writeFileSync } from "fs";

const uri = readFileSync("/tmp/prod-mongo-uri.txt", "utf8").trim();
const confirm = process.env.CONFIRM_REACTIVATE === "1";
const dryRun = !confirm;

async function main() {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 20000 });
  const db = mongoose.connection.db!;
  if (db.databaseName !== "invite") {
    throw new Error(`REFUSING unexpected db=${db.databaseName}`);
  }

  const users = await db
    .collection("users")
    .find({ role: "user", isActive: false, hasPaid: true })
    .toArray();

  const targets = [];
  for (const u of users) {
    const inv = await db.collection("invitations").findOne({
      ownerId: u._id,
      eventId: { $ne: null },
    });
    if (!inv?.eventId) continue;
    const event = await db.collection("events").findOne({ _id: inv.eventId });
    if (!event) continue;
    const guests = await db
      .collection("invitationguests")
      .countDocuments({ invitationId: inv._id });
    targets.push({
      userId: String(u._id),
      email: u.email,
      eventId: String(event._id),
      invitationId: String(inv._id),
      guests,
      eventUserId: String(event.userId),
    });
  }

  const result = {
    generatedAt: new Date().toISOString(),
    dryRun,
    database: db.databaseName,
    targetCount: targets.length,
    targets,
    updated: [] as any[],
  };

  if (!dryRun) {
    for (const t of targets) {
      const upd = await db.collection("users").updateOne(
        {
          _id: new mongoose.Types.ObjectId(t.userId),
          role: "user",
          isActive: false,
          hasPaid: true,
        },
        {
          $set: {
            isActive: true,
            incidentReactivatedAt: new Date(),
            incidentReactivatedReason:
              "regular-event-access-incident-isActive-false",
          },
        }
      );
      result.updated.push({
        ...t,
        matched: upd.matchedCount,
        modified: upd.modifiedCount,
      });
    }
  }

  writeFileSync(
    "/tmp/incident/exports/reactivate-paid-inactive.json",
    JSON.stringify(result, null, 2)
  );
  console.log(JSON.stringify(result, null, 2));
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
