import dbConnect from "@/lib/db";
import ScheduledMessage from "@/models/ScheduledMessage";
import InvitationGuest from "@/models/InvitationGuest";
import Invitation from "@/models/Invitation";
import Event from "@/models/Event";
import User from "@/models/User";

/* ======================================================
   TYPES
====================================================== */

type MessageTemplateKey = "rsvp" | "table" | "custom";

/* ======================================================
   MESSAGE TEMPLATES – SOURCE OF TRUTH
====================================================== */

const MESSAGE_TEMPLATES: Record<
  MessageTemplateKey,
  { requiresTable?: boolean; content: string }
> = {
  rsvp: {
    content:
      "היי {{name}},\n" +
      "נשמח לדעת אם תגיעו לחגוג איתנו 🎉\n\n" +
      "לאישור הגעה לחצו כאן:\n" +
      "{{rsvpLink}}\n\n" +
      "מחכים לכם באהבה 💖",
  },
  table: {
    requiresTable: true,
    content:
      "היי {{name}} 🌸 שמחים לראות אותך 💛\n" +
      "מספר השולחן שלך באירוע:\n" +
      "🪑 {{tableName}}\n\n" +
      "ניווט לאירוע:\n" +
      "{{navigationLink}}\n\n" +
      "מחכים לך!",
  },
  custom: {
    content:
      "היי {{name}} 🌸\n" +
      "שמחנו לראותכם באירוע.\n" +
      "תודה שהשתתפתם בשמחתנו.",
  },
};

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

    // 🔒 atomic lock
    const msg = await ScheduledMessage.findOneAndUpdate(
      { _id: candidate._id, status: "scheduled" },
      { $set: { status: "sending" } },
      { new: true }
    );

    if (!msg) continue;

    try {
      /* ======================================================
         TEMPLATE
      ====================================================== */
      const templateKey = msg.templateKey as MessageTemplateKey;
      const template = MESSAGE_TEMPLATES[templateKey];

      if (!template) {
        throw new Error("INVALID_TEMPLATE");
      }

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
         GUEST QUERY (LIVE RSVP)
      ====================================================== */
      const query: any = { invitationId: msg.invitationId };

      if (msg.filter === "pending") query.rsvp = "pending";

      if (msg.filter === "withTable") {
        query.$or = [
          { tableName: { $exists: true, $ne: "" } },
          { tableNumber: { $exists: true } },
        ];
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
         SMS LIMIT
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
         LOCATION / NAVIGATION (⭐️ FIX HERE ⭐️)
         זהה לשליחה מיידית
      ====================================================== */
      const location =
        invitation.eventLocation ?? event?.location;

      const hasLocation = !!(location?.lat && location?.lng);

      const navigationLink = hasLocation
        ? `https://waze.com/ul?ll=${location.lat},${location.lng}&navigate=yes`
        : "";

      /* ======================================================
         SEND
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

        let finalText = template.content
          .replace(/{{name}}/g, guest.name || "")
          .replace(
            /{{rsvpLink}}/g,
            `https://www.invistimo.com/invite/${invitation.shareId}?token=${guest.token}`
          )
          .replace(/{{tableName}}/g, tableName)
          .replace(/{{navigationLink}}/g, navigationLink);

        // 🎁 מתנה באשראי
        if (msg.includeGiftLink && msg.giftLink) {
          finalText += `\n\n🎁 למתנה באשראי:\n${msg.giftLink}`;
        }

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
