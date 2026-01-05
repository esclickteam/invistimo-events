import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User";

dotenv.config({ path: ".env.local" });
console.log("CWD:", process.cwd());
console.log("ENV:", process.env.MONGODB_URI);

/* =====================================================
   Environment
===================================================== */
const mongoUriEnv = process.env.MONGO_URI;


if (!mongoUriEnv) {
  throw new Error("❌ Missing MONGODB_URI");
}

const mongoUri: string = mongoUriEnv; // 👈 זה מה שסוגר את השגיאה

/* =====================================================
   Migration
===================================================== */
async function migrateCreditGifts() {
  console.log("🚀 Starting credit gifts migration...");

  try {
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB");

    const result = await User.updateMany(
      { includeCreditGifts: { $exists: false } },
      {
        $set: {
          includeCreditGifts: false,
          creditGiftsAddonPrice: 0,
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
migrateCreditGifts().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
