import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";
import Invitation from "@/models/Invitation";
import Event from "@/models/Event";
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

  const smsUsed = typeof user.smsUsed === "number" ? user.smsUsed : 0;

  const remainingMessages = Math.max(maxMessages - smsUsed, 0);

  /* ======================================================
     TRIAL / SMS LIMIT GUARD
  ====================================================== */
  if (remainingMessages <= 0) {
    return NextResponse.json(
      { success: false, error: "SMS_LIMIT_REACHED" },
      { status: 403 }
    );
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
     🔥 טעינת EVENT (שם נמצא המיקום)
  ====================================================== */
  const event = invitation.eventId
    ? await Event.findById(invitation.eventId).lean()
    : null;

  /* ======================================================
     בניית query לאורחים
  ====================================================== */
  const query: any = { invitationId };
  if (filter === "pending") query.rsvp = "pending";
  if (filter === "withTable")
    query.tableName = { $exists: true, $ne: "" };

  /* ======================================================
     ⏱️ תזמון – שומרים בלבד
  ====================================================== */
  if (scheduledAt) {
    const guestsCount = await InvitationGuest.countDocuments(query);

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
     שליחה מיידית
  ====================================================== */
  const guests = await InvitationGuest.find(query).lean();
  if (!guests.length) {
    return NextResponse.json({ success: true, sent: 0, total: 0 });
  }

  const allowedToSend = Math.min(remainingMessages, guests.length);
  const guestsToSend = guests.slice(0, allowedToSend);

  /* ======================================================
     📍 בניית ניווט מה-EVENT
  ====================================================== */
  const hasLocation =
    event?.location?.lat && event?.location?.lng;

  const navigationLink = hasLocation
    ? `https://www.google.com/maps?q=${event.location.lat},${event.location.lng}\n\n` +
      `https://waze.com/ul?ll=${event.location.lat},${event.location.lng}&navigate=yes`
    : "";

  let sent = 0;

  for (const guest of guestsToSend) {
    let phone = (guest.phone || "").replace(/\D/g, "");
    if (!phone) continue;

    if (phone.startsWith("0")) phone = "972" + phone.slice(1);
    else if (!phone.startsWith("972")) phone = "972" + phone;

    const finalText = text
      .replace(/{{name}}/g, guest.name || "")
      .replace(
        /{{rsvpLink}}/g,
        `https://www.invistimo.com/invite/${invitation.shareId}?token=${guest.token}`
      )
      .replace(/{{tableName}}/g, guest.tableName || "")
      .replace(/{{navigationLink}}/g, navigationLink);

    if (!finalText.trim()) continue;

    try {
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
            recipient: phone,
            msg: finalText,
          }),
        }
      );

      if (res.ok) sent++;
    } catch (err) {
      console.error("❌ SMS SEND ERROR:", err);
    }
  }

  /* ======================================================
     עדכון יתרה
  ====================================================== */
  if (sent > 0) {
    await User.findByIdAndUpdate(user._id, {
      $inc: { smsUsed: sent },
    });
  }

  return NextResponse.json({
    success: true,
    sent,
    total: guests.length,
    limited: sent < guests.length,
  });
}
