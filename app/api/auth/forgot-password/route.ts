import { NextResponse } from "next/server";
import { nanoid } from "nanoid";

import dbConnect from "@/lib/db";
import User from "@/models/User";
import { sendSMS } from "@/lib/sendSMS";
import {
  phoneCoreDigits,
  phoneLookupVariants,
} from "@/lib/auth/phoneLookup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function findUsersByPhone(rawPhone: string) {
  const variants = phoneLookupVariants(rawPhone);
  if (!variants.length) return [];

  const exact = await User.find({ phone: { $in: variants } })
    .select("_id email phone updatedAt createdAt needsPasswordSetup hasPaid")
    .sort({ updatedAt: -1 })
    .lean();

  if (exact.length > 0) return exact;

  const core = phoneCoreDigits(rawPhone);
  if (core.length < 8) return [];

  const loosePattern = core.split("").join("\\D*");
  return User.find({ phone: { $regex: `${loosePattern}$` } })
    .select("_id email phone updatedAt createdAt needsPasswordSetup hasPaid")
    .sort({ updatedAt: -1 })
    .lean();
}

export async function POST(req: Request) {
  await dbConnect();

  const body = await req.json().catch(() => ({}));
  const rawPhone = String(body?.phone || body?.email || "").trim();

  if (!rawPhone) {
    return NextResponse.json({ success: true });
  }

  const matches = await findUsersByPhone(rawPhone);

  if (!matches.length) {
    // 🔒 לא מגלים אם המספר קיים
    return NextResponse.json({ success: true });
  }

  // Prefer the most recently updated account when phone is shared.
  const user = matches[0];

  if (matches.length > 1) {
    console.warn("FORGOT PASSWORD: multiple users share phone", {
      phone: rawPhone,
      count: matches.length,
      chosenUserId: String(user._id),
      chosenEmail: user.email,
      emails: matches.map((item) => item.email),
    });
  }

  const phone = String(user.phone || "").trim() || rawPhone;
  const token = nanoid(32);
  const expires = new Date(Date.now() + 1000 * 60 * 30); // 30 minutes

  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        resetPasswordToken: token,
        resetPasswordExpires: expires,
      },
    },
  );

  const resetLink = `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password/${token}`;

  try {
    await sendSMS({
      to: phone,
      message: `Invistimo: לאיפוס סיסמה לחצו כאן: ${resetLink}`,
    });
  } catch (smsError) {
    console.error("FORGOT PASSWORD SMS FAILED:", smsError);
    return NextResponse.json(
      { success: false, error: "SMS_SEND_FAILED" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
