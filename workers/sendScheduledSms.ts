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

/* ================= WHATSAPP SEND ================= */

async function sendWhatsappTemplate({
  phone,
  templateName,
  payload,
}: any) {
  try {
    await fetch(
      `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: phone,
          type: "template",
          template: {
            name: templateName,
            language: { code: payload.languageCode || "he" },
            components: payload.components || [],
          },
        }),
      }
    );

    return true;
  } catch (err) {
    console.error("❌ WhatsApp send error", err);
    return false;
  }
}

/* ====================================================== */

export async function sendScheduledSms() {
  await dbConnect();

  const now = new Date();

  let processed = 0;
  let sentTotal = 0;
  let failed = 0;

  const MAX_PER_RUN = 50;
  const STUCK_AFTER_MS = 10 * 60 * 1000;

  /* ================= 🔄 RECOVERY ================= */

  await ScheduledMessage.updateMany(
    {
      status: "sending",
      $or: [
        { lockedAt: { $lt: new Date(Date.now() - STUCK_AFTER_MS) } },
        { lockedAt: null },
        { lockedAt: { $exists: false } },
      ],
    },
    {
      $set: {
        status: "scheduled",
        lockedAt: null,
      },
    }
  );

  /* ================= 🔥 FETCH WITH LOCK ================= */

  const messages: any[] = [];

  for (let i = 0; i < MAX_PER_RUN; i++) {
    const msg = await ScheduledMessage.findOneAndUpdate(
      {
        status: "scheduled",
        scheduledAt: { $lte: now },
      },
      {
        $set: {
          status: "sending",
          lockedAt: new Date(),
        },
      },
      {
        sort: { scheduledAt: 1 },
        new: true,
      }
    );

    if (!msg) break;
    messages.push(msg);
  }

  /* ================= PROCESS ================= */

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

      /* ================= LOAD GUESTS ================= */

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

      let sent = 0;
      let charged = 0;
      const sentGuestIds: any[] = [];

      /* ================= LOOP ================= */

      for (const guest of guests) {
        let phone = String(guest.phone || "").replace(/\D/g, "");
        if (!phone) continue;

        if (phone.startsWith("0")) phone = "972" + phone.slice(1);
        else if (!phone.startsWith("972")) phone = "972" + phone;

        /* ================= WHATSAPP ================= */

        if (msg.channel === "whatsapp") {
          const success = await sendWhatsappTemplate({
            phone,
            templateName: msg.templateName,
            payload: msg.payload || {},
          });

          if (success) {
            sent++;
            sentGuestIds.push(guest._id);
          }

          continue;
        }

        /* ================= SMS ================= */

        const personalUrl = `https://www.invistimo.com/invite/${invitation.shareId}?token=${guest.token}`;
        const shortUrl = await shortenUrl(personalUrl);

        let text = String(msg.messageContent || "")
  .replace(/{{name}}/g, guest.name || "")
  .replace(/{{rsvpLink}}/g, shortUrl)
  .replace(/{{tableName}}/g, guest.tableName || "");

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

      /* ================= UPDATE SUCCESS ================= */

      await ScheduledMessage.updateOne(
  { _id: msg._id },
  {
    $set: {
      status: "sent",
      sentAt: new Date(),
      lockedAt: null,
    },
    $inc: {
      sentCount: sent,
    },
    $push: {
      sentGuestIds: { $each: sentGuestIds },
    },
  }
);

/* ================= 🔥 UPDATE REMINDER ================= */

if (sent > 0 && msg.templateKey === "table") {
  await Invitation.updateOne(
    { _id: msg.invitationId, reminderSentAt: null },
    {
      $set: {
        reminderSentAt: new Date(),
      },
    }
  );
}
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
            lockedAt: null,
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