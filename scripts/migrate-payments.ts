import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import Payment from "../models/Payment";

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
async function migratePayments() {
  console.log("🚀 Starting payments migration...");

  try {
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB");

    const result = await Payment.updateMany(
      {},
      [
        {
          $set: {
            installments: { $ifNull: ["$installments", 1] },
            isInstallments: { $ifNull: ["$isInstallments", false] },
            includeCreditGifts: {
              $ifNull: ["$includeCreditGifts", false],
            },
            creditGiftsAddonPrice: {
              $ifNull: ["$creditGiftsAddonPrice", 0],
            },
          },
        },
      ],
      {
        updatePipeline: true, // 👈 זה הפתרון
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
migratePayments().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
