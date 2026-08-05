import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { nanoid } from "nanoid";
import { sendSMS } from "@/lib/sendSMS";

function digitsOnly(value: unknown) {
  return String(value || "").replace(/\D/g, "");
}

function phoneLookupVariants(rawPhone: string) {
  let digits = digitsOnly(rawPhone);

  if (!digits) return [];

  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  const variants = new Set<string>();

  variants.add(digits);
  variants.add(`+${digits}`);

  if (digits.startsWith("972") && digits.length >= 11) {
    const local = `0${digits.slice(3)}`;
    variants.add(local);
    variants.add(digits);
    variants.add(`+${digits}`);
  } else if (digits.startsWith("0") && digits.length >= 9) {
    const intl = `972${digits.slice(1)}`;
    variants.add(digits);
    variants.add(intl);
    variants.add(`+${intl}`);
  } else if (digits.length >= 8) {
    const local = `0${digits}`;
    const intl = `972${digits}`;
    variants.add(local);
    variants.add(intl);
    variants.add(`+${intl}`);
  }

  return [...variants];
}

export async function POST(req: Request) {
  await dbConnect();

  const body = await req.json().catch(() => ({}));
  const rawPhone = String(body?.phone || body?.email || "").trim();
  const variants = phoneLookupVariants(rawPhone);

  if (!variants.length) {
    return NextResponse.json({ success: true });
  }

  let user = await User.findOne({
    phone: { $in: variants },
  });

  // Fallback for phones stored with dashes/spaces (052-3...)
  if (!user) {
    const core = digitsOnly(rawPhone)
      .replace(/^00/, "")
      .replace(/^972/, "")
      .replace(/^0/, "");

    if (core.length >= 8) {
      const loosePattern = core.split("").join("\\D*");
      user = await User.findOne({
        phone: { $regex: `${loosePattern}$` },
      });
    }
  }

  if (!user) {
    // 🔒 לא מגלים אם המספר קיים
    return NextResponse.json({ success: true });
  }

  const phone = String(user.phone || "").trim() || variants[0];

  const token = nanoid(32);
  user.resetPasswordToken = token;
  user.resetPasswordExpires = new Date(Date.now() + 1000 * 60 * 30); // 30 דקות
  await user.save();

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
