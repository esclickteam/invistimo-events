import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";
import Invitation from "@/models/Invitation";

export async function POST(req: Request) {
  await dbConnect();

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

    /* ---------- בניית טקסט בסיס ---------- */
    let finalText = text
      .replace(/{{name}}/g, guest.name || "")
      .replace(
        /{{rsvpLink}}/g,
        `https://www.invistimo.com/invite/${invitation.shareId}?token=${guest.token}`
      )
      .replace(/{{tableName}}/g, guest.tableName || "");

    if (!finalText.trim()) continue;
    

    /* ---------- שליחה ---------- */
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

      if (isSuccess) {
        sent++;
      }
    } catch (err) {
      console.error("❌ SMS SEND ERROR:", err);
    }
  }

  /* ================= עדכון DB ================= */

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
  }

  return NextResponse.json({
    success: true,
    sent,
    total: guests.length,
  });
}
