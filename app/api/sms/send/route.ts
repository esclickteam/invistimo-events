import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";
import Invitation from "@/models/Invitation";
import User from "@/models/User";
import ScheduledMessage from "@/models/ScheduledMessage";
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
     חישוב יתרה – מקור אמת
  ====================================================== */
  const isTrial = !!user.isTrial;

  const maxMessages = isTrial
    ? typeof user.planLimits?.smsLimit === "number"
      ? user.planLimits.smsLimit
      : 0
    : typeof user.maxMessages === "number"
    ? user.maxMessages
    : 0;

  const smsUsed =
    typeof user.smsUsed === "number" ? user.smsUsed : 0;

  const remainingMessages = Math.max(
    maxMessages - smsUsed,
    0
  );

  /* ======================================================
     TRIAL / SMS LIMIT GUARD
  ====================================================== */
  if (isTrial) {
    if (user.trialExpiresAt && new Date() > user.trialExpiresAt) {
      return NextResponse.json(
        { success: false, error: "TRIAL_EXPIRED" },
        { status: 403 }
      );
    }

    if (remainingMessages <= 0) {
      return NextResponse.json(
        { success: false, error: "SMS_LIMIT_REACHED" },
        { status: 403 }
      );
    }
  } else {
    if (remainingMessages <= 0) {
      return NextResponse.json(
        { success: false, error: "SMS_LIMIT_REACHED" },
        { status: 403 }
      );
    }
  }

  /* ======================================================
     BODY
  ====================================================== */
  const { invitationId, filter = "all", text, scheduledAt } =
    await req.json();

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
     בניית query לאורחים
  ====================================================== */
  const query: any = { invitationId };
  if (filter === "pending") query.rsvp = "pending";
  if (filter === "withTable")
    query.tableName = { $exists: true, $ne: "" };

  /* ======================================================
     ⏱️ תזמון – שומרים בלבד (לא נוגעים ביתרה)
  ====================================================== */
  if (scheduledAt) {
    const guestsCount = await InvitationGuest.countDocuments(
      query
    );

    if (guestsCount > remainingMessages) {
      return NextResponse.json(
        { success: false, error: "SMS_LIMIT_REACHED" },
        { status: 403 }
      );
    }

    await ScheduledMessage.create({
      invitationId,
      userId: user._id,
      channel: "sms",
      filter,
      text,
      scheduledAt: new Date(scheduledAt),
      guestsCount,
      status: "scheduled",
    });

    return NextResponse.json({
      success: true,
      scheduled: true,
      guestsCount,
    });
  }

  /* ======================================================
     שליפה לשליחה מיידית
  ====================================================== */
  const guests = await InvitationGuest.find(query).lean();

  if (!guests.length) {
    return NextResponse.json({
      success: true,
      sent: 0,
      total: 0,
    });
  }

  /* ======================================================
     חישוב כמה מותר לשלוח
  ====================================================== */
  const allowedToSend = Math.min(
    remainingMessages,
    guests.length
  );

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
     שליחה מיידית
  ====================================================== */
  let sent = 0;

  for (const guest of guestsToSend) {
    let phone = (guest.phone || "").replace(/\D/g, "");
    if (!phone) continue;

    if (phone.startsWith("0")) phone = "972" + phone.slice(1);
    else if (!phone.startsWith("972"))
      phone = "972" + phone;

    const finalText = text
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
     עדכון DB – מקור אמת: smsUsed בלבד
  ====================================================== */
  if (sent > 0) {
    const newSmsUsed = smsUsed + sent;
    const newRemaining = Math.max(
      maxMessages - newSmsUsed,
      0
    );

    await User.findByIdAndUpdate(user._id, {
      $set: {
        smsUsed: newSmsUsed,
        remainingMessages: newRemaining, // נשמר רק ל־compatibility
      },
    });

    cookieStore.set("smsUsed", String(newSmsUsed), {
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
