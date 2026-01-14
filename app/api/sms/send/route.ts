import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";
import Invitation from "@/models/Invitation";
import Event from "@/models/Event";
import User from "@/models/User";
import ScheduledMessage from "@/models/ScheduledMessage";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

/* ======================================================
   תבניות הודעה – מקור אמת (שרת)
====================================================== */
const MESSAGE_TEMPLATES: Record<string, string> = {
  rsvp:
    "היי {{name}},\n" +
    "נשמח לדעת אם תגיעו לחגוג איתנו 🎉\n\n" +
    "לאישור הגעה לחצו כאן:\n" +
    "{{rsvpLink}}\n\n" +
    "מחכים לכם באהבה 💖",

  table:
    "היי {{name}} 🌸 שמחים לראות אותך 💛\n" +
    "מספר השולחן שלך באירוע:\n" +
    "🪑 {{tableName}}\n\n" +
    "📍 ניווט לאירוע:\n" +
    "{{navigationLink}}\n\n" +
    "מחכים לך!",

  custom:
    "היי {{name}} 🌸\n" +
    "שמחנו לראותכם באירוע.\n" +
    "תודה שהשתתפתם בשמחתנו.",
};

export async function POST(req: Request) {
  await dbConnect();

  /* ================= AUTH ================= */
  const cookieStore = await cookies();
  const token = cookieStore.get("authToken")?.value;

  if (!token) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  let decoded: any;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET!);
  } catch {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  const user = await User.findById(decoded.userId);
  if (!user) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  /* ================= BALANCE ================= */
  const maxMessages = user.isTrial
    ? user.planLimits?.smsLimit ?? 0
    : user.maxMessages ?? 0;

  const smsUsed = user.smsUsed ?? 0;
  const remainingMessages = Math.max(maxMessages - smsUsed, 0);

  if (remainingMessages <= 0) {
    return NextResponse.json(
      { success: false, error: "SMS_LIMIT_REACHED" },
      { status: 403 }
    );
  }

  /* ================= BODY ================= */
  const {
    invitationId,
    filter = "all",
    templateKey,
    scheduledAt,
    includeGiftLink,
    giftLink,
  } = await req.json();

  if (!invitationId || !templateKey) {
    return NextResponse.json(
      { success: false, error: "MISSING_PARAMS" },
      { status: 400 }
    );
  }

  const template = MESSAGE_TEMPLATES[templateKey];
  if (!template) {
    return NextResponse.json(
      { success: false, error: "INVALID_TEMPLATE" },
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

  const event = invitation.eventId
    ? await Event.findById(invitation.eventId).lean()
    : null;

  /* ================= QUERY ================= */
  const query: any = { invitationId };
  if (filter === "pending") query.rsvp = "pending";
  if (filter === "withTable") query.tableName = { $exists: true, $ne: "" };

  /* ================= SCHEDULE ================= */
  if (scheduledAt) {
    const guestsCount = await InvitationGuest.countDocuments(query);

    await ScheduledMessage.create({
      invitationId,
      userId: user._id,
      channel: "sms",
      filter,
      templateKey,
      includeGiftLink,
      giftLink,
      scheduledAt: new Date(scheduledAt),
      guestsCount,
      status: "scheduled",
    });

    return NextResponse.json({ success: true, scheduled: true, guestsCount });
  }

  /* ================= SEND ================= */
  const guests = await InvitationGuest.find(query).lean();
  const guestsToSend = guests.slice(0, remainingMessages);

  const navigationLink =
    event?.location?.lat && event?.location?.lng
      ? `Google Maps:\nhttps://www.google.com/maps?q=${event.location.lat},${event.location.lng}\n\n` +
        `Waze:\nhttps://waze.com/ul?ll=${event.location.lat},${event.location.lng}&navigate=yes`
      : "";

  let sent = 0;

  for (const guest of guestsToSend) {
    let phone = guest.phone?.replace(/\D/g, "");
    if (!phone) continue;

    if (phone.startsWith("0")) phone = "972" + phone.slice(1);
    if (!phone.startsWith("972")) phone = "972" + phone;

    let finalText = template
      .replace(/{{name}}/g, guest.name || "")
      .replace(
        /{{rsvpLink}}/g,
        `https://www.invistimo.com/invite/${invitation.shareId}?token=${guest.token}`
      )
      .replace(/{{tableName}}/g, guest.tableName || "")
      .replace(/{{navigationLink}}/g, navigationLink);

    if (includeGiftLink && giftLink) {
      finalText += `\n\n🎁 למתנה באשראי:\n${giftLink}`;
    }

    if (!finalText.trim()) continue;

    const res = await fetch("https://api.sms4free.co.il/ApiSMS/v2/SendSMS", {
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
    });

    if (res.ok) sent++;
  }

  if (sent > 0) {
    await User.findByIdAndUpdate(user._id, { $inc: { smsUsed: sent } });
  }

  return NextResponse.json({
    success: true,
    sent,
    total: guests.length,
    limited: sent < guests.length,
  });
}
