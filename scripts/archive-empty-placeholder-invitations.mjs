/**
 * Archive empty placeholder duplicate invitations that can steal
 * primary selection from a real invitation with guests.
 *
 * Safe rule:
 * - title is placeholder ("הזמנה חדשה" / empty)
 * - zero InvitationGuest docs
 * - same owner already has another invitation with guests > 0
 */
import fs from "fs";
import mongoose from "mongoose";

function loadEnv(path) {
  const raw = fs.readFileSync(path, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    process.env[k] = v;
  }
}

function toDirectMongoUri(input) {
  const m = String(input).match(
    /^mongodb\+srv:\/\/([^@]+)@([^/]+)\/([^?]*)(\?.*)?$/i
  );
  if (!m) return input;
  const [, creds, , dbName, qs = ""] = m;
  const hosts = [
    "cluster0-shard-00-00.iit5n.mongodb.net:27017",
    "cluster0-shard-00-01.iit5n.mongodb.net:27017",
    "cluster0-shard-00-02.iit5n.mongodb.net:27017",
  ].join(",");
  const params = new URLSearchParams(qs.startsWith("?") ? qs.slice(1) : qs);
  params.set("ssl", "true");
  params.set("authSource", "admin");
  params.set("replicaSet", "atlas-3i3h0q-shard-0");
  params.delete("appName");
  return `mongodb://${creds}@${hosts}/${dbName}?${params.toString()}`;
}

function isPlaceholderTitle(title) {
  const t = String(title || "").trim();
  return t === "" || t === "הזמנה חדשה";
}

const DRY_RUN = process.argv.includes("--dry-run");
loadEnv(".env.local.bak-agent-20260805102145");
await mongoose.connect(toDirectMongoUri(process.env.MONGO_URI), {
  serverSelectionTimeoutMS: 25000,
});
const db = mongoose.connection.db;

const invitations = await db
  .collection("invitations")
  .find({
    ownerId: { $exists: true, $ne: null },
    standaloneGame: { $ne: true },
  })
  .project({ _id: 1, ownerId: 1, title: 1, updatedAt: 1, eventId: 1 })
  .toArray();

const byOwner = new Map();
for (const inv of invitations) {
  const ownerId = String(inv.ownerId);
  const list = byOwner.get(ownerId) || [];
  list.push(inv);
  byOwner.set(ownerId, list);
}

const toArchive = [];

for (const [ownerId, list] of byOwner) {
  if (list.length < 2) continue;

  const counts = await db
    .collection("invitationguests")
    .aggregate([
      { $match: { invitationId: { $in: list.map((i) => i._id) } } },
      { $group: { _id: "$invitationId", count: { $sum: 1 } } },
    ])
    .toArray();
  const countById = new Map(counts.map((r) => [String(r._id), r.count]));

  const hasReal = list.some((inv) => (countById.get(String(inv._id)) || 0) > 0);
  if (!hasReal) continue;

  for (const inv of list) {
    const guestCount = countById.get(String(inv._id)) || 0;
    if (guestCount > 0) continue;
    if (!isPlaceholderTitle(inv.title)) continue;
    toArchive.push({
      ownerId,
      invitationId: String(inv._id),
      title: inv.title,
      updatedAt: inv.updatedAt,
    });
  }
}

console.log(
  JSON.stringify({ dryRun: DRY_RUN, archiveCount: toArchive.length, sample: toArchive.slice(0, 20) }, null, 2)
);

if (!DRY_RUN && toArchive.length) {
  const ids = toArchive.map((row) => new mongoose.Types.ObjectId(row.invitationId));
  const result = await db.collection("invitations").updateMany(
    { _id: { $in: ids } },
    {
      $set: {
        standaloneGame: true,
        title: "הזמנה חדשה (ארכיון — לא בשימוש)",
      },
    }
  );
  console.log("UPDATED", result.modifiedCount);
}

await mongoose.disconnect();
