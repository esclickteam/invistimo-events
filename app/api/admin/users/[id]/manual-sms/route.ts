import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { connectDB } from "@/lib/db";
import { assertExternalSendAllowed } from "@/lib/env/externalSends";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { sendSMS } from "@/lib/sendSMS";
import { shortenUrl } from "@/lib/shortenUrl";
import User from "@/models/User";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SMS_LIMIT_1 = 200;
const SMS_LIMIT_2 = 320;

function isAdminContext(auth: any) {
  return (
    auth?.role === "admin" ||
    auth?.impersonationRole === "admin" ||
    !!auth?.impersonatedBy
  );
}

function countBusinessSms(text: string) {
  const length = [...text].length;

  if (length <= SMS_LIMIT_1) return 1;
  if (length <= SMS_LIMIT_2) return 2;

  return -1;
}

function normalizeSmsPhone(value: string) {
  let phone = String(value || "").replace(/\D/g, "");

  if (!phone) return "";

  if (phone.startsWith("00")) {
    phone = phone.slice(2);
  }

  if (phone.startsWith("0")) {
    phone = `972${phone.slice(1)}`;
  } else if (!phone.startsWith("972")) {
    phone = `972${phone}`;
  }

  return phone;
}

async function shortenLinksInMessage(message: string) {
  let finalMessage = message;
  const urls = finalMessage.match(/https?:\/\/[^\s]+/g);

  if (!urls) return finalMessage;

  for (const url of urls) {
    if (url.includes("{{") || url.includes("}}")) continue;

    try {
      const short = await shortenUrl(url);
      if (short) {
        finalMessage = finalMessage.replace(url, short);
      }
    } catch (err) {
      console.error("Admin manual SMS shorten failed:", err);
    }
  }

  return finalMessage;
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const auth = await getUserIdFromRequest(req);

    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    if (!isAdminContext(auth)) {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const { id: userId } = await context.params;
    const body = await req.json().catch(() => null);

    const phone = String(body?.phone || body?.to || "").trim();
    const message = String(body?.message || body?.text || "").trim();

    if (!userId || !phone || !message) {
      return NextResponse.json(
        { success: false, error: "MISSING_PARAMS" },
        { status: 400 }
      );
    }

    const user = await User.findById(userId).select("_id name phone").lean();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    const normalizedPhone = normalizeSmsPhone(phone);

    if (!normalizedPhone || normalizedPhone.length < 11) {
      return NextResponse.json(
        { success: false, error: "INVALID_PHONE" },
        { status: 400 }
      );
    }

    const finalMessage = await shortenLinksInMessage(message);
    const parts = countBusinessSms(finalMessage);

    if (parts === -1) {
      return NextResponse.json(
        {
          success: false,
          error: "MESSAGE_TOO_LONG",
          maxChars: SMS_LIMIT_2,
          totalChars: [...finalMessage].length,
        },
        { status: 400 }
      );
    }

    const gate = assertExternalSendAllowed({
      channel: "sms",
      to: normalizedPhone,
    });

    if (!gate.allowed) {
      console.warn("📵 Admin manual SMS blocked by safety gate", {
        reason: gate.reason,
        to: normalizedPhone,
        adminUserId: auth.userId,
        targetUserId: userId,
      });

      return NextResponse.json(
        {
          success: false,
          error: "EXTERNAL_SENDS_BLOCKED",
          reason: gate.reason,
        },
        { status: 403 }
      );
    }

    await sendSMS({
      to: normalizedPhone,
      message: finalMessage,
    });

    console.log("✅ ADMIN MANUAL SMS SENT:", {
      adminUserId: auth.userId,
      targetUserId: userId,
      phone: normalizedPhone,
      parts,
      chars: [...finalMessage].length,
    });

    return NextResponse.json(
      {
        success: true,
        parts,
        totalChars: [...finalMessage].length,
        phone: normalizedPhone,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (err) {
    console.error("❌ ADMIN MANUAL SMS ERROR:", err);

    return NextResponse.json(
      { success: false, error: "SEND_FAILED" },
      { status: 500 }
    );
  }
}
