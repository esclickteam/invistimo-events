import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User";

dotenv.config({ path: ".env" });

console.log("CWD:", process.cwd());
console.log("MONGO_URI:", process.env.MONGO_URI);

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
async function addIsActiveToUsers() {
  console.log("🚀 Starting isActive migration...");

  try {
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB");

    const result = await User.updateMany(
      { isActive: { $exists: false } }, // 🔒 רק יוזרים קיימים
      {
        $set: {
          isActive: true,
        },
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
addIsActiveToUsers().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
