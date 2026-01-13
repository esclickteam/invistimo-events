import "dotenv/config";

import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import ScheduledMessage from "@/models/ScheduledMessage";
import InvitationGuest from "@/models/InvitationGuest";
import Invitation from "@/models/Invitation";
import User from "@/models/User";

const SMS_API_URL = "https://api.sms4free.co.il/ApiSMS/v2/SendSMS";

async function run() {
  console.log("⏱️ Scheduled SMS executor started");

  await connectDB();

  const now = new Date();

  const messages = await ScheduledMessage.find({
    status: "scheduled",
    scheduledAt: { $lte: now },
  });

  console.log(`📬 Found ${messages.length} scheduled messages`);

  for (const msg of messages) {
    try {
      const user = await User.findById(msg.userId);
      if (!user) {
        console.warn("⚠️ User not found, skipping message", msg._id);
        continue;
      }

      /* ================= SMS BALANCE CHECK ================= */
      let remaining =
        user.isTrial
          ? (user.planLimits?.smsLimit ?? 0) - (user.smsUsed ?? 0)
          : user.remainingMessages ?? 0;

      if (remaining <= 0) {
        await ScheduledMessage.findByIdAndUpdate(msg._id, {
          status: "failed",
          failReason: "NO_SMS_BALANCE",
        });
        continue;
      }

      /* ================= LOAD INVITATION ================= */
      const invitation = await Invitation.findById(msg.invitationId).lean();
      if (!invitation) {
        await ScheduledMessage.findByIdAndUpdate(msg._id, {
          status: "failed",
          failReason: "INVITATION_NOT_FOUND",
        });
        continue;
      }

      /* ================= BUILD GUEST QUERY ================= */
      const query: any = { invitationId: msg.invitationId };
      if (msg.filter === "pending") query.rsvp = "pending";
      if (msg.filter === "withTable")
        query.tableName = { $exists: true, $ne: "" };

      const guests = await InvitationGuest.find(query).lean();
      if (!guests.length) {
        await ScheduledMessage.findByIdAndUpdate(msg._id, {
          status: "sent",
          sentCount: 0,
        });
        continue;
      }

      const guestsToSend = guests.slice(0, remaining);

      /* ================= NAVIGATION ================= */
      const hasLocation =
        invitation.location?.lat && invitation.location?.lng;

      const navigationLink = hasLocation
        ? `https://www.google.com/maps?q=${invitation.location.lat},${invitation.location.lng}\n\n` +
          `https://waze.com/ul?ll=${invitation.location.lat},${invitation.location.lng}&navigate=yes`
        : "";

      let sent = 0;

      for (const guest of guestsToSend) {
        let phone = (guest.phone || "").replace(/\D/g, "");
        if (!phone) continue;

        if (phone.startsWith("0")) phone = "972" + phone.slice(1);
        else if (!phone.startsWith("972")) phone = "972" + phone;

        const finalText = msg.text
          .replace(/{{name}}/g, guest.name || "")
          .replace(
            /{{rsvpLink}}/g,
            `https://www.invistimo.com/invite/${invitation.shareId}?token=${guest.token}`
          )
          .replace(/{{tableName}}/g, guest.tableName || "")
          .replace(/{{navigationLink}}/g, navigationLink);

        if (!finalText.trim()) continue;

        const payload = {
          key: process.env.SMS4FREE_KEY,
          user: process.env.SMS4FREE_USER,
          pass: process.env.SMS4FREE_PASS,
          sender: process.env.SMS4FREE_SENDER,
          recipient: phone,
          msg: finalText,
        };

        try {
          const res = await fetch(SMS_API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          const data = await res.json();
          const success =
            res.ok &&
            (data?.status === 0 ||
              data?.status === "0" ||
              data?.success === true ||
              data?.message === "OK");

          if (success) sent++;
        } catch (err) {
          console.error("❌ SMS send error", err);
        }
      }

      /* ================= UPDATE DB ================= */
      if (sent > 0) {
        if (user.isTrial) {
          await User.findByIdAndUpdate(user._id, {
            $inc: { smsUsed: sent },
          });
        } else {
          await User.findByIdAndUpdate(user._id, {
            $inc: { remainingMessages: -sent },
          });
        }
      }

      await ScheduledMessage.findByIdAndUpdate(msg._id, {
        status: "sent",
        sentCount: sent,
        executedAt: new Date(),
      });

      console.log(
        `✅ ScheduledMessage ${msg._id} sent (${sent}/${guests.length})`
      );
    } catch (err) {
      console.error("🔥 ScheduledMessage fatal error", err);
      await ScheduledMessage.findByIdAndUpdate(msg._id, {
        status: "failed",
        failReason: "EXECUTOR_ERROR",
      });
    }
  }

  console.log("🏁 Scheduled SMS executor finished");
  process.exit(0);
}

run();
