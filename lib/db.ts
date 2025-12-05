import mongoose from "mongoose";

const MONGO_URI = process.env.MONGO_URI as string;

if (!MONGO_URI) {
  throw new Error("❌ MONGO_URI is missing from environment variables!");
}

export const connectDB = async () => {
  // אם יש כבר חיבור פעיל – לא נבצע שוב
  if (mongoose.connection.readyState >= 1) return;

  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB connected");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
  }
};

// ⭐ כדי שהייבוא שלך יעבוד:
// import dbConnect from "@/lib/db";
export default connectDB;
