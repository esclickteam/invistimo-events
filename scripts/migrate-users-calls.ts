import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import User from "../models/User";

/* =====================================================
   Load env (.env.local)
===================================================== */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.resolve(__dirname, "../.env.local"),
});

/* =====================================================
   Environment
===================================================== */
const mongoUriEnv = process.env.MONGO_URI;

if (!mongoUriEnv) {
  throw new Error("❌ Missing MONGO_URI");
}

const mongoUri: string = mongoUriEnv;

/* =====================================================
   Migration
===================================================== */
async function migrateUsersCalls() {
  console.log("🚀 Starting users calls migration...");

  try {
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB");

    /**
     * הוספת שדות שיחות ל-User
     * - לא דורס ערכים קיימים
     * - מוסיף רק אם חסר
     */
    const result = await User.updateMany(
      {},
      [
        {
          $set: {
            includeCalls: { $ifNull: ["$includeCalls", false] },
            callsAddonPrice: { $ifNull: ["$callsAddonPrice", 0] },
          },
        },
      ],
      {
        updatePipeline: true,
      }
    );

    console.log("✅ Migration done");
    console.log("Matched:", result.matchedCount);
    console.log("Updated:", result.modifiedCount);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }

  process.exit(0);
}

/* =====================================================
   Run
===================================================== */
migrateUsersCalls().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
