import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

/* ======================================================
   CONFIG
====================================================== */
const RATE_LIMIT_MS = 60_000; // בדיקה אחת לדקה
const MAX_TEST_SMS = 10;      // סה״כ בדיקות חינמיות

const lastTestByUser = new Map<string, number>();

export async function POST(req: Request) {
  try {
    await dbConnect();

    /* ================= AUTH ================= */
    const cookieStore = await cookies();
const token = cookieStore.get("authToken")?.value;

if (!token) {
  return NextResponse.json(
    { success: false, error: "UNAUTHORIZED" },
    { status: 401 }
  );
}

let decoded: any;
try {
  decoded = jwt.verify(token, process.env.JWT_SECRET!);
} catch {
  return NextResponse.json(
    { success: false, error: "INVALID_TOKEN" },
    { status: 401 }
  );
}

    const user = await User.findById(decoded.userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "USER_NOT_FOUND" },
        { status: 401 }
      );
    }

    /* ======================================================
       RATE LIMIT – בדיקה אחת לדקה
    ====================================================== */
    const now = Date.now();
    const last = lastTestByUser.get(user._id.toString());

    if (last && now - last < RATE_LIMIT_MS) {
      return NextResponse.json(
        {
          success: false,
          error: "RATE_LIMIT",
          message: "ניתן לשלוח הודעת בדיקה אחת לדקה",
        },
        { status: 429 }
      );
    }

    lastTestByUser.set(user._id.toString(), now);

    /* ======================================================
       ATOMIC TEST LIMIT (10 בדיקות חינם)
       לא משנה לוגיקה — רק מונע race condition
    ====================================================== */
    const updatedUser = await User.findOneAndUpdate(
      {
        _id: user._id,
        testSmsUsed: { $lt: MAX_TEST_SMS },
      },
      { $inc: { testSmsUsed: 1 } },
      { new: true }
    );

    if (!updatedUser) {
      return NextResponse.json(
        {
          success: false,
          error: "TEST_LIMIT_REACHED",
          remaining: 0,
        },
        { status: 403 }
      );
    }

    const remaining =
      MAX_TEST_SMS - (updatedUser.testSmsUsed ?? 0);

    /* ======================================================
       BODY
    ====================================================== */
    const body = await req.json();
    const { phone, message } = body as {
      phone?: string;
      message?: string;
    };

    if (!phone || !message) {
      return NextResponse.json(
        { success: false, error: "MISSING_PARAMS" },
        { status: 400 }
      );
    }

    /* ======================================================
       PHONE NORMALIZE
    ====================================================== */
    let normalizedPhone = phone.replace(/\D/g, "");
    if (normalizedPhone.startsWith("0")) {
      normalizedPhone = "972" + normalizedPhone.slice(1);
    } else if (!normalizedPhone.startsWith("972")) {
      normalizedPhone = "972" + normalizedPhone;
    }

    /* ======================================================
       SEND SMS – אותו ספק, אותה לוגיקה
    ====================================================== */
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
          msg: message,
        }),
      }
    );

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: "SMS_PROVIDER_FAILED" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      remaining,
    });
  } catch (err) {
    console.error("❌ SMS TEST ERROR:", err);

    return NextResponse.json(
      { success: false, error: "SMS_TEST_FAILED" },
      { status: 500 }
    );
  }
}
