/**
 * Fix E11000 on invitationguests.checkInToken_1 when many guests have
 * checkInToken: null (sparse unique still indexes null).
 *
 * 1) $unset null/empty checkInToken
 * 2) drop legacy unique sparse index
 * 3) create partial unique index on non-empty string tokens
 */
import fs from "fs";
import mongoose from "mongoose";

function loadEnv(path) {
  if (!fs.existsSync(path)) return;
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
    if (!process.env[k]) process.env[k] = v;
  }
}

function toDirectMongoUri(input) {
  const m = String(input || "").match(
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

loadEnv(process.env.ENV_FILE || ".env.vercel.prod.tmp");
loadEnv(".env.local");
loadEnv(".env.local.bak-agent-20260805102145");

const uri = toDirectMongoUri(process.env.MONGO_URI || process.env.MONGODB_URI);
if (!uri) {
  console.error("Missing MONGO_URI / MONGODB_URI");
  process.exit(1);
}

await mongoose.connect(uri, { serverSelectionTimeoutMS: 25000 });
const col = mongoose.connection.db.collection("invitationguests");

const beforeNull = await col.countDocuments({
  checkInToken: { $type: "null" },
});
const beforeEmpty = await col.countDocuments({ checkInToken: "" });
console.log("guests with null checkInToken:", beforeNull);
console.log("guests with empty checkInToken:", beforeEmpty);

const unsetResult = await col.updateMany(
  { $or: [{ checkInToken: { $type: "null" } }, { checkInToken: "" }] },
  { $unset: { checkInToken: "" } }
);
console.log("unset modified:", unsetResult.modifiedCount);

const indexes = await col.indexes();
console.log(
  "indexes:",
  indexes.map((i) => i.name)
);

const legacy = indexes.find((i) => i.name === "checkInToken_1");
if (legacy) {
  await col.dropIndex("checkInToken_1");
  console.log("dropped checkInToken_1");
}

const partialName = "checkInToken_partial_unique";
const hasPartial = indexes.some((i) => i.name === partialName);
if (!hasPartial) {
  await col.createIndex(
    { checkInToken: 1 },
    {
      unique: true,
      name: partialName,
      partialFilterExpression: {
        checkInToken: { $type: "string", $gt: "" },
      },
    }
  );
  console.log("created", partialName);
} else {
  console.log(partialName, "already exists");
}

const afterNull = await col.countDocuments({
  checkInToken: { $type: "null" },
});
console.log("remaining null checkInToken:", afterNull);
console.log(
  "final indexes:",
  (await col.indexes()).map((i) => i.name)
);

await mongoose.disconnect();
console.log("done");
