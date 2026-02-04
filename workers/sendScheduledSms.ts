import dbConnect from "@/lib/db";
import ScheduledMessage from "@/models/ScheduledMessage";
import InvitationGuest from "@/models/InvitationGuest";
import Invitation from "@/models/Invitation";
import Event from "@/models/Event";
import User from "@/models/User";
import { shortenUrl } from "@/lib/shortenUrl";

/* ======================================================
   BUSINESS SMS COUNT (SOURCE OF TRUTH)
   Rule:
   - <= 200 chars => 1
   - 201–320 chars => 2
   - > 320 chars => BLOCK (אין הודעה 3)
   חשוב: [...text].length כדי לא להישבר עם אימוג'ים/עברית
====================================================== */
import { countSmsParts } from "@/lib/smsUtils";

function countBusinessSms(text: string) {
  const parts = countSmsParts(text); // 🔥 חישוב אמיתי כמו ספק ה-SMS

  // 🔒 חוק עסקי: אין יותר מ-2 הודעות
  if (parts <= 2) return parts;

  return -1; // blocked
}


/* ======================================================
   WORKER – SEND SCHEDULED SMS (BASED ONLY ON smsUsed)
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

    /* ======================================================
       ATOMIC LOCK – prevent double processing
    ====================================================== */
    const msg = await ScheduledMessage.findOneAndUpdate(
      { _id: candidate._id, status: "scheduled" },
      { $set: { status: "sending" } },
      { new: true }
    );

    if (!msg) continue;

    try {
      /* ======================================================
         LOAD INVITATION / EVENT / USER
      ====================================================== */
      const invitation = await Invitation.findById(msg.invitationId).lean();
      const event = invitation?.eventId
        ? await Event.findById(invitation.eventId).lean()
        : null;
      const user = await User.findById(msg.userId).lean();

      if (!invitation || !user) {
        throw new Error("INVITATION_OR_USER_NOT_FOUND");
      }

      /* ======================================================
         LOAD GUESTS – SOURCE OF TRUTH
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

        if ((msg as any).filter === "withTable") {
          query.$or = [
            { tableName: { $exists: true, $ne: "" } },
            { tableNumber: { $exists: true, $ne: null } },
          ];
        }

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
         LOCATION / NAVIGATION
      ====================================================== */
      const location = (invitation as any).eventLocation ?? (event as any)?.location;
      const hasLocation = !!(location?.lat && location?.lng);
      let navigationLink = "";

      if (hasLocation) {
        const wazeUrl = `https://waze.com/ul?ll=${location.lat},${location.lng}&navigate=yes`;
        navigationLink = await shortenUrl(wazeUrl);
      }

      /* ======================================================
         CALCULATE REMAINING (BASED ONLY ON maxMessages - smsUsed)
      ====================================================== */
      const maxMessages =
        typeof (user as any).maxMessages === "number" ? (user as any).maxMessages : 0;
      const smsUsed = typeof (user as any).smsUsed === "number" ? (user as any).smsUsed : 0;

      const usesMaxMessages = maxMessages > 0;
      const remainingMessages = usesMaxMessages ? Math.max(maxMessages - smsUsed, 0) : 0;

      if (!usesMaxMessages) {
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

      /* ======================================================
         WORST-CASE PREVIEW TEXT (TO CALC PARTS + BLOCK > 320)
      ====================================================== */
      const previewText = String((msg as any).messageContent || "")
        .replace(/{{name}}/g, "שם מלא לדוגמה ארוך מאוד")
        .replace(/{{rsvpLink}}/g, "https://example.com/very-long-link")
        .replace(/{{tableName}}/g, "שולחן 123")
        .replace(/{{navigationLink}}/g, navigationLink || "https://waze.com");

      const partsPerMessage = countBusinessSms(previewText);

      // 🔒 אין הודעה 3 — חוסמים
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

        const tableName =
          guest.tableName ||
          (typeof guest.tableNumber === "number" ? `שולחן ${guest.tableNumber}` : "");

        const personalRsvpUrl = `https://www.invistimo.com/invite/${(invitation as any).shareId}?token=${guest.token}`;
        const shortRsvpUrl = await shortenUrl(personalRsvpUrl);

        let finalText = String((msg as any).messageContent || "")
          .replace(/{{name}}/g, guest.name || "")
          .replace(/{{rsvpLink}}/g, shortRsvpUrl)
          .replace(/{{tableName}}/g, tableName)
          .replace(/{{navigationLink}}/g, navigationLink);

        finalText = finalText.trim();
        if (!finalText) continue;

        const parts = countBusinessSms(finalText);

        // 🔒 אין הודעה 3 — אם יצא ארוך מדי, מפילים את כל ההודעה המתוזמנת
        if (parts === -1) {
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
          throw new Error("MESSAGE_TOO_LONG");
        }

        // 🔒 לא לעבור את היתרה לפי smsUsed
        if (charged + parts > remainingMessages) break;

        try {
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
        } catch (err) {
          console.error("❌ SMS SEND ERROR:", err);
        }
      }

      /* ======================================================
         UPDATE MESSAGE STATUS
      ====================================================== */
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

      /* ======================================================
         UPDATE smsUsed (THE ONLY SOURCE OF TRUTH)
      ====================================================== */
      if (charged > 0) {
        await User.updateOne({ _id: msg.userId }, { $inc: { smsUsed: charged } });
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
