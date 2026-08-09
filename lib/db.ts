import mongoose from "mongoose";
import { assertEnvironmentSafety } from "@/lib/env/safetyGuards";

const MONGO_URI = (process.env.MONGO_URI ||
  process.env.MONGODB_URI) as string;

if (!MONGO_URI) {
  throw new Error("❌ MONGO_URI is missing from environment variables!");
}

export const connectDB = async () => {
  // Isolation guards before any DB traffic
  assertEnvironmentSafety({ throwOnError: true });

  // אם יש כבר חיבור פעיל – לא נבצע שוב
  if (mongoose.connection.readyState >= 1) return;

  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB connected", {
      db:
        mongoose.connection.name ||
        "(from URI)",
    });
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    throw error;
  }
};

// ⭐ כדי שהייבוא שלך יעבוד:
// import dbConnect from "@/lib/db";
export default connectDB;
