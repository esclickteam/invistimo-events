import dbConnect from "@/lib/db";
import ScheduledMessage from "@/models/ScheduledMessage";
import InvitationGuest from "@/models/InvitationGuest";
import Invitation from "@/models/Invitation";
import Event from "@/models/Event";
import User from "@/models/User";
import { shortenUrl } from "@/lib/shortenUrl";

/* ====================================================== */

function countBusinessSms(text: string) {
  const length = [...text].length;
  if (length <= 200) return 1;
  if (length <= 320) return 2;
  return -1;
}

/* ====================================================== */

export async function sendScheduledSms() {
  await dbConnect();

  const now = new Date();
  let processed = 0;
  let sentTotal = 0;
  let failed = 0;

  /* ======================================================
     🔥 מביאים את כל ההודעות לשליחה (בלי limit)
  ====================================================== */

  const messages = await ScheduledMessage.find({
    status: "scheduled",
    scheduledAt: { $lte: now },
  });

  for (const msg of messages) {
    processed++;

    try {
      const invitation = await Invitation.findById(msg.invitationId).lean();
      const event = invitation?.eventId
        ? await Event.findById(invitation.eventId).lean()
        : null;

      const user = await User.findById(msg.userId).lean();

      if (!invitation || !user) {
        throw new Error("INVITATION_OR_USER_NOT_FOUND");
      }

      /* ================= LOAD ALL GUESTS ================= */

      let guests: any[] = [];

      if (Array.isArray(msg.guestIds) && msg.guestIds.length > 0) {
        guests = await InvitationGuest.find({
          _id: { $in: msg.guestIds },
          invitationId: msg.invitationId,
        }).lean();
      } else {
        const query: any = { invitationId: msg.invitationId };
        if (msg.filter === "pending") query.rsvp = "pending";
        guests = await InvitationGuest.find(query).lean();
      }

      /* ================= SEND ALL (NO LIMIT) ================= */

      let sent = 0;
      let charged = 0;

      const sentGuestIds: any[] = [];

      for (const guest of guests) {
        let phone = String(guest.phone || "").replace(/\D/g, "");
        if (!phone) continue;

        if (phone.startsWith("0")) phone = "972" + phone.slice(1);
        else if (!phone.startsWith("972")) phone = "972" + phone;

        const personalUrl = `https://www.invistimo.com/invite/${invitation.shareId}?token=${guest.token}`;
        const shortUrl = await shortenUrl(personalUrl);

        let text = String(msg.messageContent || "")
          .replace(/{{name}}/g, guest.name || "")
          .replace(/{{rsvpLink}}/g, shortUrl);

        const parts = countBusinessSms(text);
        if (parts === -1) continue;

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
                msg: text,
              }),
            }
          );

          if (res.ok) {
            sent++;
            charged += parts;
            sentGuestIds.push(guest._id);
          }
        } catch {}
      }

      /* ================= UPDATE ================= */

      await ScheduledMessage.updateOne(
        { _id: msg._id },
        {
          $set: {
            status: "sent",
            sentAt: new Date(),
          },
          $inc: {
            sentCount: sent,
          },
          $push: {
            sentGuestIds: { $each: sentGuestIds },
          },
        }
      );

      sentTotal += sent;

      if (!user.isActive && charged > 0) {
        await User.updateOne(
          { _id: msg.userId },
          { $inc: { smsUsed: charged } }
        );
      }
    } catch (err: any) {
      console.error("💥 Worker error:", err);

      await ScheduledMessage.updateOne(
        { _id: msg._id },
        {
          $set: {
            status: "failed",
            error: err?.message || "UNKNOWN_ERROR",
          },
        }
      );

      failed++;
    }
  }

  return {
    processed,
    sent: sentTotal,
    failed,
  };
}