import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";
import Invitation from "@/models/Invitation";

export async function POST(req: Request) {
  await dbConnect();

  const { invitationId, template, filter, customText } = await req.json();

  const invitation = await Invitation.findById(invitationId).lean();
  if (!invitation) {
    return NextResponse.json({ success: false, error: "INV_NOT_FOUND" }, { status: 404 });
  }

  // 🧠 סינון אורחים
  let query: any = { invitationId };

  if (filter === "pending") query.rsvp = "pending";
  if (filter === "withTable") query.tableName = { $exists: true, $ne: "" };

  const guests = await InvitationGuest.find(query).lean();

  let sent = 0;

  for (const guest of guests) {
    const phone =
      "972" + guest.phone.replace(/\D/g, "").replace(/^0/, "");

    const text =
      template === "custom"
        ? customText
        : buildMessage(template, guest, invitation);

    if (!phone || !text) continue;

    const payload = {
      key: process.env.SMS4FREE_KEY,
      user: process.env.SMS4FREE_USER,
      pass: process.env.SMS4FREE_PASS,
      sender: process.env.SMS4FREE_SENDER,
      msisdn: phone,
      msg: text,
    };

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

    if (data?.status === 0) {
      sent++;
    }
  }

  return NextResponse.json({ success: true, sent });
}

/* ================= HELPER ================= */

function buildMessage(template: string, guest: any, invitation: any) {
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
