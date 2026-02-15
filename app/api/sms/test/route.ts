import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { shortenUrl } from "@/lib/shortenUrl";

/* ================= CONFIG ================= */

const RATE_LIMIT_MS = 60_000;
const MAX_TEST_SMS = 10;

const SMS_LIMIT_1 = 200;
const SMS_LIMIT_2 = 320; // 🔒 אין הודעה 3

/* ================= MEMORY RATE LIMIT ================= */

const lastTestByUser = new Map<string, number>();

/* ================= BUSINESS COUNT ================= */

function countBusinessSms(text: string) {
  const t = (text ?? "").trim();
  const len = [...t].length; // Unicode safe

  if (len <= SMS_LIMIT_1) return 1;
  if (len <= SMS_LIMIT_2) return 2;
  return -1; // blocked
}

/* =========================================================
   GET — מחזיר כמה בדיקות נשארו
========================================================= */

export async function GET() {
  try {
    await dbConnect();

    const cookieStore = await cookies();
    const token = cookieStore.get("authToken")?.value;

    if (!token) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!);
    } catch {
      return NextResponse.json({ error: "INVALID_TOKEN" }, { status: 401 });
    }

    const user = await User.findById(decoded.userId).lean();

    if (!user) {
      return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });
    }

    const used =
      Number.isFinite(user.testSmsUsed) ? user.testSmsUsed : 0;

    const remaining = Math.max(0, MAX_TEST_SMS - used);

    return NextResponse.json({
      success: true,
      used,
      remaining,
      limit: MAX_TEST_SMS,
    });
  } catch (err) {
    console.error("❌ SMS TEST GET ERROR:", err);
    return NextResponse.json(
      { error: "GET_FAILED" },
      { status: 500 }
    );
  }
}

/* =========================================================
   POST — שליחת SMS לבדיקה
========================================================= */

export async function POST(req: Request) {
  try {
    await dbConnect();

    /* ================= AUTH ================= */

    const cookieStore = await cookies();
    const token = cookieStore.get("authToken")?.value;

    if (!token) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!);
    } catch {
      return NextResponse.json({ error: "INVALID_TOKEN" }, { status: 401 });
    }

    const user = await User.findById(decoded.userId).lean();

    if (!user) {
      return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });
    }

    /* ================= RATE LIMIT ================= */

    const now = Date.now();
    const last = lastTestByUser.get(String(user._id));

    if (last && now - last < RATE_LIMIT_MS) {
      return NextResponse.json(
        { error: "RATE_LIMIT", message: "בדיקה אחת לדקה" },
        { status: 429 }
      );
    }

    lastTestByUser.set(String(user._id), now);

    /* ================= BODY ================= */

    const { phone, message } = await req.json();

    if (!phone || !message) {
      return NextResponse.json(
        { error: "MISSING_PARAMS" },
        { status: 400 }
      );
    }

    /* ================= PHONE NORMALIZE ================= */

    let normalizedPhone = String(phone).replace(/\D/g, "");

    if (normalizedPhone.startsWith("0")) {
      normalizedPhone = "972" + normalizedPhone.slice(1);
    } else if (!normalizedPhone.startsWith("972")) {
      normalizedPhone = "972" + normalizedPhone;
    }

    /* ================= SHORTEN LINKS ================= */

    let finalMessage = String(message);

    const urls = finalMessage.match(/https?:\/\/[^\s]+/g);

    if (urls) {
      for (const url of urls) {
        if (url.includes("{{") || url.includes("}}")) continue;

        try {
          const short = await shortenUrl(url);
          finalMessage = finalMessage.replace(url, short);
        } catch (err) {
          console.error("Shorten failed:", err);
        }
      }
    }

    /* ================= COUNT ================= */

    const parts = countBusinessSms(finalMessage);

    if (parts === -1) {
      return NextResponse.json(
        {
          error: "MESSAGE_TOO_LONG",
          maxChars: SMS_LIMIT_2,
          totalChars: [...finalMessage.trim()].length,
        },
        { status: 400 }
      );
    }

    /* ================= ATOMIC RESERVE ================= */

    const updatedUser = await User.findOneAndUpdate(
      {
        _id: user._id,
        testSmsUsed: { $lte: MAX_TEST_SMS - parts },
      },
      {
        $inc: { testSmsUsed: parts },
      },
      { new: true, lean: true }
    );

    if (!updatedUser) {
      const usedBefore =
        Number.isFinite(user.testSmsUsed) ? user.testSmsUsed : 0;

      const remaining = Math.max(0, MAX_TEST_SMS - usedBefore);

      return NextResponse.json(
        {
          error: "TEST_LIMIT_REACHED",
          remaining,
          required: parts,
        },
        { status: 403 }
      );
    }

    /* ================= SEND SMS ================= */

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
          recipient: normalizedPhone,
          msg: finalMessage,
        }),
      }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "SMS_PROVIDER_FAILED" },
        { status: 500 }
      );
    }

    const usedNow =
      Number.isFinite(updatedUser.testSmsUsed)
        ? updatedUser.testSmsUsed
        : 0;

    const remaining = Math.max(0, MAX_TEST_SMS - usedNow);

    return NextResponse.json({
      success: true,
      parts,
      remaining,
      limit: MAX_TEST_SMS,
    });
  } catch (err) {
    console.error("❌ SMS TEST ERROR:", err);
    return NextResponse.json(
      { error: "SMS_TEST_FAILED" },
      { status: 500 }
    );
  }
}
