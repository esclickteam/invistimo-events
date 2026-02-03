import dbConnect from "@/lib/db";
import ScheduledMessage from "@/models/ScheduledMessage";
import InvitationGuest from "@/models/InvitationGuest";
import Invitation from "@/models/Invitation";
import Event from "@/models/Event";
import User from "@/models/User";
import { shortenUrl } from "@/lib/shortenUrl";


/* ======================================================
   WORKER
====================================================== */

export async function sendScheduledSms() {
  await dbConnect();

  const now = new Date();

  let processed = 0;
  let sentTotal = 0;
  let failed = 0;

  /* ======================================================
     FETCH CANDIDATES
  ====================================================== */
  const candidates = await ScheduledMessage.find({
    status: "scheduled",
    scheduledAt: { $lte: now },
  })
    .sort({ scheduledAt: 1 })
    .limit(10)
    .lean();

  for (const candidate of candidates) {
    processed++;

    // 🔒 Atomic lock
    const msg = await ScheduledMessage.findOneAndUpdate(
      { _id: candidate._id, status: "scheduled" },
      { $set: { status: "sending" } },
      { new: true }
    );

    if (!msg) continue;

    try {
      /* ======================================================
         INVITATION + EVENT + USER
      ====================================================== */
      const invitation = await Invitation.findById(msg.invitationId).lean();
      const event = invitation?.eventId
        ? await Event.findById(invitation.eventId).lean()
        : null;
      const user = await User.findById(msg.userId);

      if (!invitation || !user) {
        throw new Error("INVITATION_OR_USER_NOT_FOUND");
      }

      /* ======================================================
         GUESTS – SOURCE OF TRUTH
      ====================================================== */
      let guests: any[] = [];

      if (Array.isArray(msg.guestIds) && msg.guestIds.length > 0) {
        // ⭐️ מקור אמת – קהל נעול
        guests = await InvitationGuest.find({
          _id: { $in: msg.guestIds },
          invitationId: msg.invitationId,
        }).lean();
      } else {
        // 🔁 fallback להודעות ישנות בלבד
        const query: any = { invitationId: msg.invitationId };

        if (msg.filter === "pending") query.rsvp = "pending";

        if (msg.filter === "withTable") {
          query.$or = [
            { tableName: { $exists: true, $ne: "" } },
            { tableNumber: { $exists: true } },
          ];
        }

        guests = await InvitationGuest.find(query).lean();
      }

      if (!guests.length) {
        msg.status = "sent";
        msg.sentCount = 0;
        msg.sentAt = new Date();
        await msg.save();
        continue;
      }

      /* ======================================================
         SMS LIMIT
      ====================================================== */
      let allowedToSend = guests.length;

      if (user.isTrial) {
        const remaining =
          (user.planLimits?.smsLimit ?? 0) - (user.smsUsed ?? 0);
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
         LOCATION / NAVIGATION
      ====================================================== */
      const location =
        invitation.eventLocation ?? event?.location;

      const hasLocation = !!(location?.lat && location?.lng);

      let navigationLink = "";

if (hasLocation) {
  const wazeUrl = `https://waze.com/ul?ll=${location.lat},${location.lng}&navigate=yes`;
  navigationLink = await shortenUrl(wazeUrl);
}


      /* ======================================================
         SEND (SOURCE OF TRUTH = messageContent)
      ====================================================== */
      let sent = 0;

      for (const guest of guestsToSend) {
        let phone = (guest.phone || "").replace(/\D/g, "");
        if (!phone) continue;

        if (phone.startsWith("0")) phone = "972" + phone.slice(1);
        else if (!phone.startsWith("972")) phone = "972" + phone;

        const tableName =
          guest.tableName ||
          (typeof guest.tableNumber === "number"
            ? `שולחן ${guest.tableNumber}`
            : "");

        const personalRsvpUrl =
  `https://www.invistimo.com/invite/${invitation.shareId}?token=${guest.token}`;

const shortRsvpUrl = await shortenUrl(personalRsvpUrl);

let finalText = msg.messageContent
  .replace(/{{name}}/g, guest.name || "")
  .replace(/{{rsvpLink}}/g, shortRsvpUrl)
  .replace(/{{tableName}}/g, tableName)
  .replace(/{{navigationLink}}/g, navigationLink);


        if (!finalText.trim()) continue;

        try {
          const res = await fetch(
            "https://api.sms4free.co.il/ApiSMS/v2/SendSMS",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                key: process.env.SMS4FREE_KEY,
                user: process.env.SMS4FREE_USER,
                pass: process.env.SMS4FREE_PASS,
                sender: process.env.SMS4FREE_SENDER,
                recipient: phone,
                msg: finalText,
              }),
            }
          );

          if (res.ok) sent++;
        } catch (err) {
          console.error("❌ SMS SEND ERROR:", err);
        }
      }

      /* ======================================================
         UPDATE STATUS
      ====================================================== */
      msg.status = "sent";
      msg.sentCount = sent;
      msg.sentAt = new Date();
      await msg.save();

      sentTotal += sent;

      if (sent > 0) {
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

  return {
    processed,
    sent: sentTotal,
    failed,
  };
}
