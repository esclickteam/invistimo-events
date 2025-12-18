import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";
import Invitation from "@/models/Invitation";

export async function POST(req: Request) {
  await dbConnect();

  const { invitationId, template, filter, customText } = await req.json();

  if (!invitationId) {
    return NextResponse.json(
      { success: false, error: "INVITATION_ID_MISSING" },
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

  /* ================= סינון אורחים ================= */

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

  let sent = 0;

  /* ================= שליחה ================= */

  for (const guest of guests) {
    /* ---------- נרמול טלפון ---------- */
    let phone = (guest.phone || "").replace(/\D/g, "");

    if (!phone) continue;

    if (phone.startsWith("0")) {
      phone = "972" + phone.slice(1);
    } else if (!phone.startsWith("972")) {
      phone = "972" + phone;
    }

    /* ---------- בניית הודעה ---------- */
    let text = "";

    if (template === "custom") {
      text = customText || "";
    } else {
      text = buildMessage(template, guest, invitation);
    }

    if (!text.trim()) continue;

    /* ---------- payload לפי תיעוד רשמי ---------- */
    const payload = {
      key: process.env.SMS4FREE_KEY,
      user: process.env.SMS4FREE_USER,
      pass: process.env.SMS4FREE_PASS,
      sender: process.env.SMS4FREE_SENDER, // מספר או שם מאושר
      recipient: phone,                   // 👈 השם הנכון לפי התיעוד
      msg: text,
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
      console.log("SMS4FREE RESPONSE:", data);

      /* ---------- זיהוי הצלחה ---------- */
      const isSuccess =
        data?.status === 0 ||
        data?.status === "0" ||
        data?.success === true ||
        data?.message === "OK";

      if (isSuccess) {
        sent++;
      }
    } catch (err) {
      console.error("SMS SEND ERROR:", err);
    }
  }

  return NextResponse.json({
    success: true,
    sent,
    total: guests.length,
  });
}

/* ================= HELPER ================= */

function buildMessage(
  template: "rsvp" | "table",
  guest: any,
  invitation: any
) {
  if (template === "rsvp") {
    return `היי ${guest.name} 💛
נשמח לדעת אם תגיע/י לאירוע 🎉
לאישור הגעה:
https://www.invistimo.com/invite/${invitation.shareId}?token=${guest.token}`;
  }

  if (template === "table") {
    if (!guest.tableName) return "";
    return `שלום ${guest.name} 🌸
מספר השולחן שלך:
🪑 ${guest.tableName}
מחכים לך!`;
  }

  return "";
}
