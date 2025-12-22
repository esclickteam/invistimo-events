import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User";

async function createDemoUser() {
  try {
    // 🔍 בדיקה (אפשר להשאיר עד שעובד)
    console.log("MONGO_URI =", process.env.MONGO_URI);

    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing");
    }

    await mongoose.connect(process.env.MONGO_URI, {
      dbName: "invite",
    });

    const email = "demo-internal@invistimo.com";

    const exists = await User.findOne({ email });
    if (exists) {
      console.log("⚠️ Demo user already exists");
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash("Demo1234!", 10);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    await User.create({
      name: "Invistimo Demo (Internal)",
      email,
      password: hashedPassword,
      role: "admin",

      isTrial: true,
      trialStartedAt: now,
      trialExpiresAt: expiresAt,
    });

    console.log("✅ Demo user created successfully (24h)");
    process.exit(0);
  } catch (err) {
    console.error("❌ Failed to create demo user:", err);
    process.exit(1);
  }
}

createDemoUser();
