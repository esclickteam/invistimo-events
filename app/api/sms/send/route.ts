import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";
import Invitation from "@/models/Invitation";
import User from "@/models/User";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  await dbConnect();

  /* ======================================================
     AUTH – זיהוי משתמש
  ====================================================== */
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
     TRIAL / SMS LIMIT GUARD (🔥 קריטי)
  ====================================================== */
  if (user.isTrial) {
    if (
      user.trialExpiresAt &&
      new Date() > user.trialExpiresAt
    ) {
      return NextResponse.json(
        { success: false, error: "TRIAL_EXPIRED" },
        { status: 403 }
      );
    }

    if (user.smsUsed >= user.planLimits.smsLimit) {
      return NextResponse.json(
        { success: false, error: "SMS_LIMIT_REACHED" },
        { status: 403 }
      );
    }
  }

  /* ======================================================
     BODY
  ====================================================== */
  const { invitationId, filter, text } = await req.json();

  if (!invitationId || !text) {
    return NextResponse.json(
      { success: false, error: "MISSING_PARAMS" },
      { status: 400 }
    );
  }

  const invitation = await Invitation.findById(invitationId).lean();
  if (!invitation) {
    return NextResponse.json(
      { success: false, error: "INV_NOT_FOUND" },
      { status: 404 }
    );
  }

  /* ======================================================
     סינון אורחים
  ====================================================== */
  const query: any = { invitationId };

  if (filter === "pending") query.rsvp = "pending";
  if (filter === "withTable") query.tableName = { $exists: true, $ne: "" };

  const guests = await InvitationGuest.find(query).lean();

  if (!guests.length) {
    return NextResponse.json({
      success: true,
      sent: 0,
      total: 0,
    });
  }

  /* ======================================================
     חישוב כמה מותר לשלוח (Trial-safe)
  ====================================================== */
  let allowedToSend = guests.length;

  if (user.isTrial) {
    const remaining = user.planLimits.smsLimit - user.smsUsed;
    allowedToSend = Math.max(0, Math.min(remaining, guests.length));
  }

  if (allowedToSend === 0) {
    return NextResponse.json(
      { success: false, error: "SMS_LIMIT_REACHED" },
      { status: 403 }
    );
  }

  const guestsToSend = guests.slice(0, allowedToSend);

  /* ======================================================
     בניית ניווט
  ====================================================== */
  const hasLocation =
    invitation.location?.lat && invitation.location?.lng;

  const navigationLink = hasLocation
    ? `https://www.google.com/maps?q=${invitation.location.lat},${invitation.location.lng}\n\n` +
      `https://waze.com/ul?ll=${invitation.location.lat},${invitation.location.lng}&navigate=yes`
    : "";

  /* ======================================================
     שליחה
  ====================================================== */
  let sent = 0;

  for (const guest of guestsToSend) {
    let phone = (guest.phone || "").replace(/\D/g, "");
    if (!phone) continue;

    if (phone.startsWith("0")) {
      phone = "972" + phone.slice(1);
    } else if (!phone.startsWith("972")) {
      phone = "972" + phone;
    }

    let finalText = text
      .replace(/{{name}}/g, guest.name || "")
      .replace(
        /{{rsvpLink}}/g,
        `https://www.invistimo.com/invite/${invitation.shareId}?token=${guest.token}`
      )
      .replace(/{{tableName}}/g, guest.tableName || "")
      .replace(/{{navigationLink}}/g, navigationLink);

    if (!finalText.trim()) continue;

    const payload = {
      key: process.env.SMS4FREE_KEY,
      user: process.env.SMS4FREE_USER,
      pass: process.env.SMS4FREE_PASS,
      sender: process.env.SMS4FREE_SENDER,
      recipient: phone,
      msg: finalText,
    };

    try {
      const res = await fetch(
        "https://api.sms4free.co.il/ApiSMS/v2/SendSMS",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();

      const isSuccess =
        res.ok &&
        (data?.status === 0 ||
          data?.status === "0" ||
          data?.success === true ||
          data?.message === "OK" ||
          data);

      if (isSuccess) sent++;
    } catch (err) {
      console.error("❌ SMS SEND ERROR:", err);
    }
  }

  /* ======================================================
     עדכון DB + Cookies
  ====================================================== */
  if (sent > 0) {
    await Invitation.updateOne(
      { _id: invitationId },
      {
        $inc: {
          sentSmsCount: sent,
          remainingMessages: -sent,
        },
      }
    );

    await User.findByIdAndUpdate(user._id, {
      $inc: { smsUsed: sent },
    });

    // 🔄 סנכרון cookie למiddleware
    cookieStore.set("smsUsed", String(user.smsUsed + sent), {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      domain: ".invistimo.com",
      maxAge: 60 * 60,
    });
  }

  return NextResponse.json({
    success: true,
    sent,
    total: guests.length,
    limited: sent < guests.length,
  });
}
