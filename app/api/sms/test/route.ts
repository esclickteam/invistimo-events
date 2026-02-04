import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { shortenUrl } from "@/lib/shortenUrl";
import { countSmsParts } from "@/lib/smsUtils";

const RATE_LIMIT_MS = 60_000;
const MAX_TEST_SMS = 10;

const lastTestByUser = new Map<string, number>();

export async function POST(req: Request) {
  try {
    await dbConnect();

    /* ================= AUTH ================= */
    const cookieStore = await cookies();
    const token = cookieStore.get("authToken")?.value;

    if (!token) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });
    }

    /* ================= RATE LIMIT ================= */
    const now = Date.now();
    const last = lastTestByUser.get(user._id.toString());

    if (last && now - last < RATE_LIMIT_MS) {
      return NextResponse.json(
        { error: "RATE_LIMIT", message: "בדיקה אחת לדקה" },
        { status: 429 }
      );
    }

    lastTestByUser.set(user._id.toString(), now);

    /* ================= BODY ================= */
    const { phone, message } = await req.json();

    if (!phone || !message) {
      return NextResponse.json(
        { error: "MISSING_PARAMS" },
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

    /* ================= SHORTEN LINKS ================= */
    let finalMessage = message;
    const urls = message.match(/https?:\/\/[^\s]+/g);

    if (urls) {
      for (const url of urls) {
        if (url.includes("{{")) continue;
        const short = await shortenUrl(url);
        finalMessage = finalMessage.replace(url, short);
      }
    }

    /* ================= CALC PARTS ================= */
    const parts = countSmsParts(finalMessage);

    /* ================= 🔒 RESERVE TEST SMS ================= */
    const reserveResult = await User.updateOne(
      {
        _id: user._id,
        testSmsUsed: { $lte: MAX_TEST_SMS - parts },
      },
      {
        $inc: { testSmsUsed: parts },
      }
    );

    if (reserveResult.modifiedCount === 0) {
      const remaining = Math.max(
        0,
        MAX_TEST_SMS - (user.testSmsUsed ?? 0)
      );

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
      // ❗ לא מחזירים יתרה בטסט – זה intentional
      return NextResponse.json(
        { error: "SMS_PROVIDER_FAILED" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      parts,
      remaining: MAX_TEST_SMS - (user.testSmsUsed ?? 0) - parts,
    });
  } catch (err) {
    console.error("SMS TEST ERROR", err);
    return NextResponse.json(
      { error: "SMS_TEST_FAILED" },
      { status: 500 }
    );
  }
}
