import dbConnect from "@/lib/db";
import ScheduledMessage from "@/models/ScheduledMessage";
import InvitationGuest from "@/models/InvitationGuest";
import Invitation from "@/models/Invitation";
import User from "@/models/User";

/* ======================================================
   Worker: Send Scheduled SMS
====================================================== */

export async function sendScheduledSms() {
  await dbConnect();

  const now = new Date();

  let processed = 0;
  let sentTotal = 0;
  let failed = 0;

  /* ======================================================
     שליפת הודעות שמוכנות לשליחה (בלי cancelled)
  ====================================================== */
  const candidates = await ScheduledMessage.find({
    status: "scheduled",
    scheduledAt: { $lte: now },
  })
    .sort({ scheduledAt: 1 })
    .limit(10)
    .select("_id")
    .lean();

  for (const c of candidates) {
    processed++;

    // 🔒 Atomic lock – מונע שליחה כפולה
    const msg = await ScheduledMessage.findOneAndUpdate(
      { _id: c._id, status: "scheduled" },
      { $set: { status: "sending" } },
      { new: true }
    );

    // אם מישהו אחר כבר לקח – מדלגים
    if (!msg) continue;

    try {
      const invitation = await Invitation.findById(msg.invitationId).lean();
      const user = await User.findById(msg.userId);

      if (!invitation || !user) {
        throw new Error("INVITATION_OR_USER_NOT_FOUND");
      }

      /* ======================================================
         בניית query לאורחים (RSVP בזמן אמת)
      ====================================================== */
      const query: any = { invitationId: msg.invitationId };

      if (msg.filter === "pending") query.rsvp = "pending";
      if (msg.filter === "withTable") {
        query.tableName = { $exists: true, $ne: "" };
      }

      const guests = await InvitationGuest.find(query).lean();

      if (!guests.length) {
        msg.status = "sent";
        msg.sentCount = 0;
        msg.sentAt = new Date();
        await msg.save();
        continue;
      }

      /* ======================================================
         בדיקת מגבלות SMS (Trial-safe)
      ====================================================== */
      let allowedToSend = guests.length;

      if (user.isTrial) {
        const remaining = user.planLimits.smsLimit - user.smsUsed;
        allowedToSend = Math.max(0, Math.min(remaining, guests.length));
      }

      if (allowedToSend === 0) {
        msg.status = "failed";
        msg.error = "SMS_LIMIT_REACHED";
        await msg.save();
        failed++;
        continue;
      }

      const guestsToSend = guests.slice(0, allowedToSend);

      /* ======================================================
         בניית ניווט
      ====================================================== */
      const hasLocation =
        invitation.location?.lat && invitation.location?.lng;

      const navigationLink = hasLocation
        ? `https://www.google.com/maps?q=${invitation.location.lat},${invitation.location.lng}\n\n` +
          `https://waze.com/ul?ll=${invitation.location.lat},${invitation.location.lng}&navigate=yes`
        : "";

      /* ======================================================
         שליחה בפועל
      ====================================================== */
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
          const res = await fetch(
            "https://api.sms4free.co.il/ApiSMS/v2/SendSMS",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            }
          );

          const data = await res.json();

          const isSuccess =
            res.ok &&
            (data?.status === 0 ||
              data?.status === "0" ||
              data?.success === true ||
              data?.message === "OK" ||
              data);

          if (isSuccess) sent++;
        } catch (err) {
          console.error("❌ SMS SEND ERROR:", err);
        }
      }

      /* ======================================================
         עדכון סטטוסים + מונים
      ====================================================== */
      msg.status = "sent";
      msg.sentCount = sent;
      msg.sentAt = new Date();
      await msg.save();

      sentTotal += sent;

      if (sent > 0) {
        await Invitation.updateOne(
          { _id: msg.invitationId },
          {
            $inc: {
              sentSmsCount: sent,
              remainingMessages: -sent,
            },
          }
        );

        await User.findByIdAndUpdate(user._id, {
          $inc: { smsUsed: sent },
        });
      }
    } catch (err: any) {
      console.error("💥 Scheduled SMS Worker Error:", err);

      msg.status = "failed";
      msg.error = err?.message || "UNKNOWN_ERROR";
      await msg.save();
      failed++;
    }
  }

  /* ======================================================
     Result (ללוגים של Cron)
  ====================================================== */
  return {
    processed,
    sent: sentTotal,
    failed,
  };
}
