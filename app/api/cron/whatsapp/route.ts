import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import WhatsappQueue from "@/models/WhatsappQueue";
import { sendScheduledWhatsapp } from "@/workers/sendScheduledSms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ================= CONFIG ================= */

const MAX_PER_RUN = 30;
const DELAY_BETWEEN = 1200;
const JITTER_MAX = 250;
const STUCK_SENDING_AFTER_MS = 10 * 60 * 1000;
const DEFAULT_MAX_ATTEMPTS = 3;

/* ================= HELPERS ================= */

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function nowMinus(ms: number) {
  return new Date(Date.now() - ms);
}

function isRateLimitError(msg: string) {
  const m = msg.toLowerCase();

  return (
    msg.includes("131048") ||
    msg.includes("131056") ||
    msg.includes("131049") ||
    m.includes("rate") ||
    m.includes("too many") ||
    m.includes("maintain healthy ecosystem")
  );
}

function normalizeMaxAttempts(value: any) {
  const n = Number(value);

  if (Number.isFinite(n) && n > 0) {
    return n;
  }

  return DEFAULT_MAX_ATTEMPTS;
}

/* ======================================================
   GENERIC WHATSAPP TEMPLATE SEND
   עובד לפי payload.components שנשמר ב-WhatsappQueue
====================================================== */

async function sendWhatsappTemplateFromQueue(job: any) {
  const templateName = String(job.templateName || "").trim();
  const phone = String(job.phone || "").replace(/\D/g, "");
  const payload = job.payload || {};

  if (!templateName) {
    throw new Error("MISSING_TEMPLATE_NAME");
  }

  if (!phone) {
    throw new Error("MISSING_PHONE");
  }

  const res = await fetch(
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
          language: {
            code: payload.languageCode || "he",
          },
          components: Array.isArray(payload.components)
            ? payload.components
            : [],
        },
      }),
    }
  );

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      data?.error?.message ||
      data?.error?.error_data?.details ||
      data?.error?.code ||
      "WHATSAPP_PROVIDER_ERROR";

    const err: any = new Error(String(message));
    err.providerResponse = data;
    throw err;
  }

  return {
    providerResponse: data,
    wamid: data?.messages?.[0]?.id || null,
  };
}

/* ======================================================
   PROCESS IMMEDIATE / PENDING QUEUE
   כאן מטפלים בעיקר בשליחות מיידיות שנכנסו ל-WhatsappQueue.
   תזמונים חדשים מגיעים קודם דרך sendScheduledWhatsapp().
====================================================== */

async function processPendingWhatsappQueue() {
  let processed = 0;
  let sent = 0;
  let failed = 0;

  /* ================= RECOVERY ================= */

  await WhatsappQueue.updateMany(
    {
      status: "sending",
      $or: [
        { lockedAt: { $lt: nowMinus(STUCK_SENDING_AFTER_MS) } },
        { lockedAt: null },
        { lockedAt: { $exists: false } },
      ],
    },
    {
      $set: {
        status: "pending",
        lockedAt: null,
        lockedBy: null,
      },
    }
  );

  /* ================= MAIN LOOP ================= */

  for (let i = 0; i < MAX_PER_RUN; i++) {
    const job: any = await WhatsappQueue.findOneAndUpdate(
      {
        status: "pending",
        $expr: {
          $lt: [
            "$attempts",
            {
              $ifNull: ["$maxAttempts", DEFAULT_MAX_ATTEMPTS],
            },
          ],
        },
      },
      {
        $set: {
          status: "sending",
          lockedAt: new Date(),
          lockedBy: "whatsapp-cron",
          lastAttemptAt: new Date(),
        },
      },
      {
        sort: {
          createdAt: 1,
        },
        new: true,
      }
    );

    if (!job) break;

    processed++;

    try {
      const result = await sendWhatsappTemplateFromQueue(job);

      await WhatsappQueue.updateOne(
        {
          _id: job._id,
          status: { $ne: "cancelled" },
        },
        {
          $set: {
            status: "sent",
            sentAt: new Date(),
            failedAt: null,
            wamid: result.wamid || null,
            lastError: null,
            failReason: {
              code: null,
              message: null,
              raw: null,
            },
            lockedAt: null,
            lockedBy: null,
          },
          $inc: {
            attempts: 1,
          },
        }
      );

      sent++;

      const jitter = Math.floor(Math.random() * JITTER_MAX);
      await sleep(DELAY_BETWEEN + jitter);
    } catch (err: any) {
      const msg = String(err?.message || err);
      const maxAttempts = normalizeMaxAttempts(job.maxAttempts);
      const nextAttempts = Number(job.attempts || 0) + 1;
      const shouldFail = nextAttempts >= maxAttempts;

      await WhatsappQueue.updateOne(
        {
          _id: job._id,
          status: { $ne: "cancelled" },
        },
        {
          $set: {
            status: shouldFail ? "failed" : "pending",
            failedAt: shouldFail ? new Date() : null,
            lastError: msg,
            failReason: {
              code: err?.providerResponse?.error?.code
                ? String(err.providerResponse.error.code)
                : null,
              message: msg,
              raw: err?.providerResponse || null,
            },
            lockedAt: null,
            lockedBy: null,
          },
          $inc: {
            attempts: 1,
          },
        }
      );

      if (shouldFail) {
        failed++;
      }

      if (isRateLimitError(msg)) {
        break;
      }

      await sleep(400);
    }
  }

  return {
    processed,
    sent,
    failed,
  };
}

/* ================= ROUTE ================= */

export async function GET(req: NextRequest) {
  try {
    /* ================= GUARD ================= */

    const secret = process.env.CRON_SECRET;
    const authHeader = req.headers.get("authorization");
    const isVercelCron = req.headers.get("x-vercel-cron") === "1";

    if (secret) {
      const isValidBearer = authHeader === `Bearer ${secret}`;

      if (!isValidBearer && !isVercelCron) {
        return NextResponse.json(
          {
            success: false,
            error: "UNAUTHORIZED",
          },
          { status: 401 }
        );
      }
    }

    await db();

    /*
      חשוב:
      1. קודם מטפלים בתזמונים החדשים מתוך ScheduledMessage.
         שם נקבעים האורחים לפי הנתונים בזמן השליחה בפועל.
      2. אחר כך מטפלים ב-WhatsappQueue pending,
         שזה בעיקר שליחות מיידיות שכבר הוכנסו לתור.
    */

    const scheduledResult = await sendScheduledWhatsapp();
    const queueResult = await processPendingWhatsappQueue();

    return NextResponse.json({
      success: true,
      scheduled: scheduledResult,
      queue: queueResult,
      total: {
        processed:
          Number(scheduledResult?.processed || 0) +
          Number(queueResult?.processed || 0),
        sent:
          Number(scheduledResult?.sent || 0) +
          Number(queueResult?.sent || 0),
        failed:
          Number(scheduledResult?.failed || 0) +
          Number(queueResult?.failed || 0),
      },
    });
  } catch (err: any) {
    console.error("❌ WHATSAPP CRON ERROR:", err);

    return NextResponse.json(
      {
        success: false,
        error: err?.message || "CRON_FAILED",
      },
      { status: 500 }
    );
  }
}