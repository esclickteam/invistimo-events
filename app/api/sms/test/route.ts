import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { shortenUrl } from "@/lib/shortenUrl";

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
        { status: 404 }
      );
    }

    /* ================= RATE LIMIT ================= */
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

    /* ================= TEST LIMIT ================= */
    const used = user.testSmsUsed ?? 0;

    if (used >= MAX_TEST_SMS) {
      return NextResponse.json(
        {
          success: false,
          error: "TEST_LIMIT_REACHED",
          remaining: 0,
        },
        { status: 403 }
      );
    }

    /* ================= BODY ================= */
    const { phone, message } = (await req.json()) as {
      phone?: string;
      message?: string;
    };

    if (!phone || !message) {
      return NextResponse.json(
        { success: false, error: "MISSING_PARAMS" },
        { status: 400 }
      );
    }

    /* ================= PHONE NORMALIZE ================= */
    let normalizedPhone = phone.replace(/\D/g, "");
    if (normalizedPhone.startsWith("0")) {
      normalizedPhone = "972" + normalizedPhone.slice(1);
    } else if (!normalizedPhone.startsWith("972")) {
      normalizedPhone = "972" + normalizedPhone;
    }

    /* ================= SHORTEN RSVP LINKS ================= */
    let finalMessage = message;

    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = message.match(urlRegex);

    if (urls) {
      for (const url of urls) {
        // ⛔ לא מקצרים טמפלטים
        if (url.includes("{{")) continue;

        const short = await shortenUrl(url);
        finalMessage = finalMessage.replace(url, short);
      }
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
        { success: false, error: "SMS_PROVIDER_FAILED" },
        { status: 500 }
      );
    }

    /* ================= INCREMENT AFTER SUCCESS ================= */
    user.testSmsUsed = used + 1;
    await user.save();

    return NextResponse.json({
      success: true,
      remaining: MAX_TEST_SMS - user.testSmsUsed,
    });
  } catch (err) {
    console.error("❌ SMS TEST ERROR:", err);

    return NextResponse.json(
      { success: false, error: "SMS_TEST_FAILED" },
      { status: 500 }
    );
  }
}
