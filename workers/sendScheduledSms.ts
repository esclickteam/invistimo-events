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

/* ====================================================== */

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

      const completed = msg.completedGuests || [];

      guests = guests.filter(
        (g) => !completed.some((id: any) => id.toString() === g._id.toString())
      );

      /* ================= 🔥 תיקון קריטי ================= */

      const totalGuests =
        Array.isArray(msg.guestIds) && msg.guestIds.length > 0
          ? msg.guestIds.length
          : await InvitationGuest.countDocuments({
              invitationId: msg.invitationId,
            });

      const totalCompleted = msg.completedGuests?.length || 0;

      if (!guests.length && totalCompleted >= totalGuests) {
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

      /* ================= SEND ================= */

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

          const personalUrl = `https://www.invistimo.com/invite/${invitation.shareId}?token=${guest.token}`;
          const shortUrl = await shortenUrl(personalUrl);

          let text = String(msg.messageContent || "")
            .replace(/{{name}}/g, guest.name || "")
            .replace(/{{rsvpLink}}/g, shortUrl);

          const parts = countBusinessSms(text);
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
                  msg: text,
                }),
              }
            );

            if (res.ok) {
              sent++;
              charged += parts;
              sentGuestIds.push(guest._id);
              completedGuests.push(guest._id);
            }
          } catch {}
        });
      }

      await runParallel(tasks, 5);

      /* ================= UPDATE ================= */

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

      const newTotalCompleted =
        (msg.completedGuests?.length || 0) + completedGuests.length;

      const finished = newTotalCompleted >= totalGuests;

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

      if (!user.isActive && charged > 0) {
        await User.updateOne(
          { _id: msg.userId },
          { $inc: { smsUsed: charged } }
        );
      }
    } catch (err: any) {
      console.error("💥 Worker error:", err);

      await ScheduledMessage.updateOne(
        { _id: candidate._id },
        {
          $set: {
            status: "failed",
            error: err?.message || "UNKNOWN_ERROR",
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