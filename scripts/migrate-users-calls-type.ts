/**
 * Backward-compatible migration:
 * - Set callsType = "human" for every existing user (only when missing/null).
 * - Never touch callRoundsSchedule.rounds.scheduledAt or any round dates.
 *
 * Usage:
 *   npx tsx scripts/migrate-users-calls-type.ts
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.resolve(__dirname, "../.env.local"),
});

const mongoUri =
  process.env.MONGODB_URI || process.env.MONGO_URI || "";

if (!mongoUri) {
  throw new Error("Missing MONGODB_URI / MONGO_URI");
}

async function migrate() {
  console.log("Starting callsType migration (default human)...");
  await mongoose.connect(mongoUri);

  const users = mongoose.connection.collection("users");

  const result = await users.updateMany(
    {
      $or: [
        { callsType: { $exists: false } },
        { callsType: null },
        { callsType: "" },
      ],
    },
    {
      $set: { callsType: "human" },
    }
  );

  console.log("Matched:", result.matchedCount);
  console.log("Modified:", result.modifiedCount);
  console.log(
    "Done. Existing schedules were not read or written — only callsType defaulted."
  );

  await mongoose.disconnect();
}

migrate().catch(async (err) => {
  console.error("Migration failed:", err);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
