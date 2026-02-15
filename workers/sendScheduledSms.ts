import dbConnect from "@/lib/db";
import ScheduledMessage from "@/models/ScheduledMessage";
import InvitationGuest from "@/models/InvitationGuest";
import Invitation from "@/models/Invitation";
import Event from "@/models/Event";
import User from "@/models/User";
import { shortenUrl } from "@/lib/shortenUrl";

/* ======================================================
   BUSINESS SMS COUNT
====================================================== */
function countBusinessSms(text: string) {
  const length = [...text].length;

  if (length <= 200) return 1;
  if (length <= 320) return 2;

  return -1; // BLOCK
}

/* ======================================================
   WORKER
====================================================== */
export async function sendScheduledSms() {
  await dbConnect();

  const now = new Date();

  let processed = 0;
  let sentTotal = 0;
  let failed = 0;

  const candidates = await ScheduledMessage.find({
    status: "scheduled",
    scheduledAt: { $lte: now },
  })
    .sort({ scheduledAt: 1 })
    .limit(10)
    .lean();

  for (const candidate of candidates) {
    processed++;

    const msg = await ScheduledMessage.findOneAndUpdate(
      { _id: candidate._id, status: "scheduled" },
      { $set: { status: "sending" } },
      { new: true }
    );

    if (!msg) continue;

    try {
      const invitation = await Invitation.findById(msg.invitationId).lean();
      const event = invitation?.eventId
        ? await Event.findById(invitation.eventId).lean()
        : null;
      const user = await User.findById(msg.userId).lean();

      if (!invitation || !user) {
        throw new Error("INVITATION_OR_USER_NOT_FOUND");
      }

      /* ======================================================
         LOAD GUESTS
      ====================================================== */
      let guests: any[] = [];

      if (Array.isArray((msg as any).guestIds) && (msg as any).guestIds.length > 0) {
        guests = await InvitationGuest.find({
          _id: { $in: (msg as any).guestIds },
          invitationId: msg.invitationId,
        }).lean();
      } else {
        const query: any = { invitationId: msg.invitationId };

        if ((msg as any).filter === "pending") query.rsvp = "pending";

        guests = await InvitationGuest.find(query).lean();
      }

      if (!guests.length) {
        await ScheduledMessage.updateOne(
          { _id: msg._id },
          { $set: { status: "sent", sentCount: 0, sentAt: new Date() } }
        );
        continue;
      }

      /* ======================================================
         LOCATION
      ====================================================== */
      const location = (invitation as any).eventLocation ?? (event as any)?.location;
      let navigationLink = "";

      if (location?.lat && location?.lng) {
        const wazeUrl = `https://waze.com/ul?ll=${location.lat},${location.lng}&navigate=yes`;
        navigationLink = await shortenUrl(wazeUrl);
      }

      /* ======================================================
         NEW LOGIC FLAG
      ====================================================== */
      const isReminder = msg.templateKey === "table";
      const isThankYou = msg.templateKey === "custom";


      const usesNewLogic = user.isActive === false;

      if (usesNewLogic) {
        if (isReminder && invitation.reminderSentAt) {
          await ScheduledMessage.updateOne(
            { _id: msg._id },
            {
              $set: {
                status: "failed",
                error: "REMINDER_ALREADY_SENT",
                sentAt: new Date(),
              },
            }
          );
          failed++;
          continue;
        }

        if (isThankYou && invitation.thankYouSentAt) {
          await ScheduledMessage.updateOne(
            { _id: msg._id },
            {
              $set: {
                status: "failed",
                error: "THANKYOU_ALREADY_SENT",
                sentAt: new Date(),
              },
            }
          );
          failed++;
          continue;
        }
      }

      /* ======================================================
         OLD LOGIC
      ====================================================== */
      let remainingMessages = 0;

      if (!usesNewLogic) {
        const maxMessages =
          typeof (user as any).maxMessages === "number"
            ? (user as any).maxMessages
            : 0;

        const smsUsed =
          typeof (user as any).smsUsed === "number"
            ? (user as any).smsUsed
            : 0;

        if (maxMessages <= 0) {
          await ScheduledMessage.updateOne(
            { _id: msg._id },
            {
              $set: {
                status: "failed",
                error: "SMS_LIMIT_NOT_CONFIGURED",
                sentAt: new Date(),
              },
            }
          );
          failed++;
          continue;
        }

        remainingMessages = Math.max(maxMessages - smsUsed, 0);
      }

      /* ======================================================
         PREVIEW CHECK
      ====================================================== */
      const previewText = String((msg as any).messageContent || "")
        .replace(/{{name}}/g, "שם ארוך לבדיקה")
        .replace(/{{rsvpLink}}/g, "https://example.com")
        .replace(/{{tableName}}/g, "שולחן 123")
        .replace(/{{navigationLink}}/g, navigationLink || "https://waze.com");

      const partsPerMessage = countBusinessSms(previewText);

      if (partsPerMessage === -1) {
        await ScheduledMessage.updateOne(
          { _id: msg._id },
          {
            $set: {
              status: "failed",
              error: "MESSAGE_TOO_LONG",
              sentAt: new Date(),
            },
          }
        );
        failed++;
        continue;
      }

      if (!usesNewLogic) {
        const totalMessagesToCharge = guests.length * partsPerMessage;

        if (totalMessagesToCharge > remainingMessages) {
          await ScheduledMessage.updateOne(
            { _id: msg._id },
            {
              $set: {
                status: "failed",
                error: "SMS_LIMIT_REACHED",
                sentAt: new Date(),
              },
            }
          );
          failed++;
          continue;
        }
      }

      /* ======================================================
         SEND SMS
      ====================================================== */
      let sent = 0;
      let charged = 0;

      for (const guest of guests) {
        let phone = String(guest.phone || "").replace(/\D/g, "");
        if (!phone) continue;

        if (phone.startsWith("0")) phone = "972" + phone.slice(1);
        else if (!phone.startsWith("972")) phone = "972" + phone;

        const personalRsvpUrl = `https://www.invistimo.com/invite/${(invitation as any).shareId}?token=${guest.token}`;
        const shortRsvpUrl = await shortenUrl(personalRsvpUrl);

        // ✅ FIX – הוספת tableName
        const tableName =
          typeof guest.tableNumber === "number"
            ? `שולחן ${guest.tableNumber}`
            : guest.tableName || "";

        let finalText = String((msg as any).messageContent || "")
          .replace(/{{name}}/g, guest.name || "")
          .replace(/{{rsvpLink}}/g, shortRsvpUrl)
          .replace(/{{tableName}}/g, tableName)
          .replace(/{{navigationLink}}/g, navigationLink);

        finalText = finalText.trim();
        if (!finalText) continue;

        const parts = countBusinessSms(finalText);
        if (parts === -1) continue;

        if (!usesNewLogic && charged + parts > remainingMessages) break;

        const res = await fetch("https://api.sms4free.co.il/ApiSMS/v2/SendSMS", {
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
        });

        if (res.ok) {
          sent++;
          charged += parts;
        }
      }

      await ScheduledMessage.updateOne(
        { _id: msg._id },
        {
          $set: {
            status: "sent",
            sentCount: sent,
            sentAt: new Date(),
          },
        }
      );

      sentTotal += sent;

      if (usesNewLogic && sent > 0) {
        if (isReminder) {
          await Invitation.updateOne(
            { _id: invitation._id },
            { $set: { reminderSentAt: new Date() } }
          );
        }

        if (isThankYou) {
          await Invitation.updateOne(
            { _id: invitation._id },
            { $set: { thankYouSentAt: new Date() } }
          );
        }
      }

      if (!usesNewLogic && charged > 0) {
        await User.updateOne(
          { _id: msg.userId },
          { $inc: { smsUsed: charged } }
        );
      }
    } catch (err: any) {
      console.error("💥 Scheduled SMS Worker Error:", err);

      await ScheduledMessage.updateOne(
        { _id: candidate._id },
        {
          $set: {
            status: "failed",
            error: err?.message || "UNKNOWN_ERROR",
            sentAt: new Date(),
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
