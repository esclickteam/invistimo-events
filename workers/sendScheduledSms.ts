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

  return -1;
}

/* ======================================================
   RATE LIMIT QUEUE
====================================================== */

async function runParallel(tasks: (() => Promise<void>)[], concurrency = 5) {
  const executing: Promise<void>[] = [];

  for (const task of tasks) {
    const p = task();
    executing.push(p);

    if (executing.length >= concurrency) {
      await Promise.race(executing).catch(() => {});
      executing.splice(
        executing.findIndex((e) => e === p),
        1
      );
    }
  }

  await Promise.allSettled(executing);
}

/* ======================================================
   WORKER
====================================================== */

export async function sendScheduledSms() {
  await dbConnect();

  const now = new Date();
  const workerId = `worker-${process.pid}-${Date.now()}`;

  let processed = 0;
  let sentTotal = 0;
  let failed = 0;

  const candidates = await ScheduledMessage.find({
    status: "scheduled",
    scheduledAt: { $lte: now },
    lockedAt: { $exists: false },
  })
    .sort({ priority: -1, scheduledAt: 1 })
    .limit(10)
    .lean();

  for (const candidate of candidates) {
    processed++;

    const msg = await ScheduledMessage.findOneAndUpdate(
      {
        _id: candidate._id,
        status: "scheduled",
        lockedAt: { $exists: false },
      },
      {
        $set: {
          status: "sending",
          lockedAt: new Date(),
          lockedBy: workerId,
          lastAttemptAt: new Date(),
        },
      },
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

      const completed = msg.completedGuests || [];

      guests = guests.filter(
        (g) => !completed.some((id: any) => id.toString() === g._id.toString())
      );

      if (!guests.length) {
        await ScheduledMessage.updateOne(
          { _id: msg._id },
          {
            $set: {
              status: "sent",
              sentAt: new Date(),
              lockedAt: null,
              lockedBy: null,
            },
          }
        );

        continue;
      }

      const batchSize = msg.batchSize || 50;
      guests = guests.slice(0, batchSize);

      /* ======================================================
         LOCATION
      ====================================================== */

      const location = invitation?.eventLocation ?? event?.location;
      let navigationLink = "";

      if (location?.lat && location?.lng) {
        const wazeUrl = `https://waze.com/ul?ll=${location.lat},${location.lng}&navigate=yes`;
        navigationLink = await shortenUrl(wazeUrl);
      }

      /* ======================================================
         FLAGS
      ====================================================== */

      const isReminder = msg.templateKey === "table";
      const isThankYou = msg.templateKey === "custom";
      const usesNewLogic = user.isActive === false;

      if (usesNewLogic) {
        if (isReminder && invitation.reminderSentAt) {
          throw new Error("REMINDER_ALREADY_SENT");
        }

        if (isThankYou && invitation.thankYouSentAt) {
          throw new Error("THANKYOU_ALREADY_SENT");
        }
      }

      /* ======================================================
         OLD SMS LIMIT
      ====================================================== */

      let remainingMessages = 0;

      if (!usesNewLogic) {
        const maxMessages = user.maxMessages ?? 0;
        const smsUsed = user.smsUsed ?? 0;

        if (maxMessages <= 0) {
          throw new Error("SMS_LIMIT_NOT_CONFIGURED");
        }

        remainingMessages = Math.max(maxMessages - smsUsed, 0);
      }

      /* ======================================================
         PREVIEW CHECK
      ====================================================== */

      const previewText = String(msg.messageContent || "")
        .replace(/{{name}}/g, "שם ארוך לבדיקה")
        .replace(/{{rsvpLink}}/g, "https://example.com")
        .replace(/{{tableName}}/g, "שולחן 123")
        .replace(/{{navigationLink}}/g, navigationLink || "https://waze.com");

      const partsPerMessage = countBusinessSms(previewText);

      if (partsPerMessage === -1) {
        throw new Error("MESSAGE_TOO_LONG");
      }

      /* ======================================================
         SEND SMS (PARALLEL)
      ====================================================== */

      let sent = 0;
      let charged = 0;

      const sentGuestIds: any[] = [];
      const completedGuests: any[] = [];

      const tasks: (() => Promise<void>)[] = [];

      for (const guest of guests) {
        tasks.push(async () => {
          let phone = String(guest.phone || "").replace(/\D/g, "");
          if (!phone) return;

          if (phone.startsWith("0")) phone = "972" + phone.slice(1);
          else if (!phone.startsWith("972")) phone = "972" + phone;

          const personalRsvpUrl = `https://www.invistimo.com/invite/${invitation.shareId}?token=${guest.token}`;
          const shortRsvpUrl = await shortenUrl(personalRsvpUrl);

          const tableName =
            typeof guest.tableNumber === "number"
              ? `שולחן ${guest.tableNumber}`
              : guest.tableName || "";

          let finalText = String(msg.messageContent || "")
            .replace(/{{name}}/g, guest.name || "")
            .replace(/{{rsvpLink}}/g, shortRsvpUrl)
            .replace(/{{tableName}}/g, tableName)
            .replace(/{{navigationLink}}/g, navigationLink);

          finalText = finalText.trim();
          if (!finalText) return;

          const parts = countBusinessSms(finalText);
          if (parts === -1) return;

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

            completedGuests.push(guest._id);

            if (res.ok) {
              sent++;
              charged += parts;
              sentGuestIds.push(guest._id);
            }
          } catch {
            completedGuests.push(guest._id);
          }
        });
      }

      await runParallel(tasks, 5);

      /* ======================================================
         UPDATE MESSAGE
      ====================================================== */

      await ScheduledMessage.updateOne(
        { _id: msg._id },
        {
          $inc: { sentCount: sent },
          $push: {
            sentGuestIds: { $each: sentGuestIds },
            completedGuests: { $each: completedGuests },
          },
        }
      );

      const finished =
        (msg.sentCount || 0) + sent >= (msg.guestIds?.length || guests.length);

      await ScheduledMessage.updateOne(
        { _id: msg._id },
        {
          $set: {
            status: finished ? "sent" : "scheduled",
            sentAt: finished ? new Date() : null,
            lockedAt: null,
            lockedBy: null,
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
            lockedAt: null,
            lockedBy: null,
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