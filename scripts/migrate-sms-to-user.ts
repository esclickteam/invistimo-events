import "dotenv/config";

import mongoose from "mongoose";
import connectDB from "../lib/mongodb";
import Invitation from "../models/Invitation";
import User from "../models/User";

async function migrateSmsToUser() {
  console.log("🚀 Starting SMS → User migration...");

  await connectDB();

  const invitations = await Invitation.find({
    maxMessages: { $gt: 0 },
  }).lean();

  console.log(`🔍 Found ${invitations.length} invitations with SMS data`);

  let updatedUsers = 0;
  let skippedUsers = 0;

  for (const invitation of invitations) {
    const userId = invitation.ownerId;

    const user = await User.findById(userId);
    if (!user) {
      console.warn("⚠️ User not found for invitation", invitation._id);
      continue;
    }

    const invMax = invitation.maxMessages ?? 0;
    const invRemaining = invitation.remainingMessages ?? 0;
    const invSent =
      typeof invitation.sentSmsCount === "number"
        ? invitation.sentSmsCount
        : invMax - invRemaining;

    // ⛔ אם ליוזר כבר יש SMS – לא נוגעים
    if (
      typeof user.maxMessages === "number" &&
      user.maxMessages > 0
    ) {
      skippedUsers++;
      continue;
    }

    user.maxMessages = invMax;
    user.remainingMessages = invRemaining;
    user.smsUsed = invSent;

    await user.save();
    updatedUsers++;

    console.log(
      `✅ User ${user.email} updated: max=${invMax}, remaining=${invRemaining}, used=${invSent}`
    );
  }

  console.log("🎉 Migration finished");
  console.log(`✅ Updated users: ${updatedUsers}`);
  console.log(`⏭️ Skipped users: ${skippedUsers}`);

  await mongoose.disconnect();
  console.log("🔌 Disconnected from MongoDB");
}

migrateSmsToUser().catch((err) => {
  console.error("❌ Migration failed", err);
  process.exit(1);
});
