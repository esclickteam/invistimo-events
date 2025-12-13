import { NextResponse } from "next/server";
import db from "@/lib/db";
import { sendSMS } from "@/lib/sendSMS";
import { buildMessage } from "@/lib/messageTemplates";
import MessageLog from "@/models/MessageLog";
import Invitation from "@/models/Invitation";
import Guest from "@/models/Guest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ================= TYPES ================= */

type FilterType = "all" | "pending" | "withTable";
type TemplateType = "rsvp" | "table" | "custom";

type GuestDoc = {
  _id: string;
  name: string;
  phone: string;
  token: string;
  rsvp: "yes" | "no" | "pending";
  tableName?: string;
};

/* ================= ROUTE ================= */

export async function POST(req: Request) {
  try {
    await db();

    const {
      invitationId,
      template,
      filter,
      customText,
    }: {
      invitationId: string;
      template: TemplateType;
      filter: FilterType;
      customText?: string;
    } = await req.json();

    const invitation = await Invitation.findById(invitationId);
    if (!invitation) {
      return NextResponse.json(
        { error: "INV_NOT_FOUND" },
        { status: 404 }
      );
    }

    const guests: GuestDoc[] = await Guest.find({ invitationId }).lean();

    /* ================= FILTER ================= */

    const targets = guests.filter((g) => {
      if (filter === "pending") return g.rsvp === "pending";
      if (filter === "withTable") return Boolean(g.tableName);
      return true;
    });

    /* ================= BALANCE ================= */

    const sentCount = await MessageLog.countDocuments({
      invitationId,
      channel: "sms",
    });

    const maxMessages = invitation.maxGuests * 3;

    if (sentCount + targets.length > maxMessages) {
      return NextResponse.json(
        { error: "NO_SMS_BALANCE" },
        { status: 403 }
      );
    }

    /* ================= SEND ================= */

    let actuallySent = 0;

    for (const guest of targets) {
      if (template === "table" && !guest.tableName) continue;

      const text = buildMessage({
        template,
        guest,
        invitation,
        customText,
      });

      const phone = guest.phone.startsWith("972")
        ? guest.phone
        : `972${guest.phone.replace(/^0/, "")}`;

      await sendSMS({ to: phone, message: text });

      await MessageLog.create({
        invitationId,
        guestId: guest._id,
        phone,
        channel: "sms",
        template,
        text,
      });

      actuallySent++;
    }

    return NextResponse.json({
      success: true,
      sent: actuallySent,
    });
  } catch (err) {
    console.error("❌ SMS SEND ERROR:", err);
    return NextResponse.json(
      { error: "SMS_SEND_FAILED" },
      { status: 500 }
    );
  }
}
