import { NextResponse } from "next/server";
import db from "@/lib/db";
import { sendSMS } from "@/lib/sendSMS";
import { buildMessage } from "@/lib/messageTemplates";
import MessageLog from "@/models/MessageLog";
import Invitation from "@/models/Invitation";
import Guest from "@/models/Guest";
import User from "@/models/User";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ================= TYPES ================= */

type FilterType = "all" | "pending" | "withTable";
type TemplateType = "rsvp" | "table" | "custom";
type Channel = "sms" | "whatsapp";

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

    /* ================= AUTH ================= */

    const auth = await getUserIdFromRequest();
    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const user = await User.findById(auth.userId).lean();
    if (!user) {
      return NextResponse.json(
        { error: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    /* ================= BODY ================= */

    const {
      invitationId,
      channel,
      template,
      filter,
      customText,
    }: {
      invitationId: string;
      channel: Channel;
      template: TemplateType;
      filter: FilterType;
      customText?: string;
    } = await req.json();

    if (!channel || !["sms", "whatsapp"].includes(channel)) {
      return NextResponse.json(
        { error: "INVALID_CHANNEL" },
        { status: 400 }
      );
    }

    /* ================= LOAD INVITATION ================= */

    const invitation = await Invitation.findById(invitationId);
    if (!invitation) {
      return NextResponse.json(
        { error: "INV_NOT_FOUND" },
        { status: 404 }
      );
    }

    if (String(invitation.ownerId) !== String(auth.userId)) {
      return NextResponse.json(
        { error: "FORBIDDEN" },
        { status: 403 }
      );
    }

    /* ================= LOAD GUESTS ================= */

    const guests: GuestDoc[] = await Guest.find({ invitationId }).lean();

    const targets: GuestDoc[] = guests.filter((g) => {
      if (filter === "pending") return g.rsvp === "pending";
      if (filter === "withTable") return Boolean(g.tableName);
      return true;
    });

    if (targets.length === 0) {
      return NextResponse.json(
        { error: "NO_TARGETS" },
        { status: 400 }
      );
    }

    /* =====================================================
       🟢 WHATSAPP FLOW — NO SMS CHECKS AT ALL
    ===================================================== */

    if (channel === "whatsapp") {
      // ⬅️ כאן בהמשך תחבר/י ל־sendWhatsAppTemplate
      // כרגע רק רישום לוג לדוגמה

      await MessageLog.insertMany(
        targets.map((guest) => ({
          invitationId,
          guestId: guest._id,
          phone: guest.phone,
          channel: "whatsapp",
          template,
          text: "[WHATSAPP TEMPLATE]",
          sentAt: new Date(),
        }))
      );

      return NextResponse.json({
        success: true,
        channel: "whatsapp",
        sent: targets.length,
      });
    }

    /* =====================================================
       🔵 SMS FLOW — ONLY HERE WE CHECK SMS LIMITS
    ===================================================== */

    if (!user.planLimits?.smsEnabled) {
      return NextResponse.json(
        {
          error: "SMS_DISABLED",
          message: "שליחת SMS אינה זמינה בחבילה הנוכחית",
        },
        { status: 403 }
      );
    }

    if (typeof invitation.remainingMessages !== "number") {
      return NextResponse.json(
        { error: "SMS_BALANCE_NOT_INITIALIZED" },
        { status: 500 }
      );
    }

    if (invitation.remainingMessages <= 0) {
      return NextResponse.json(
        {
          error: "NO_SMS_BALANCE",
          remainingMessages: invitation.remainingMessages,
        },
        { status: 403 }
      );
    }

    if (targets.length > invitation.remainingMessages) {
      return NextResponse.json(
        {
          error: "NO_SMS_BALANCE",
          remainingMessages: invitation.remainingMessages,
        },
        { status: 403 }
      );
    }

    /* ================= SEND SMS ================= */

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
        sentAt: new Date(),
      });

      actuallySent++;
    }

    if (actuallySent > 0) {
      await Invitation.findByIdAndUpdate(invitation._id, {
        $inc: {
          sentSmsCount: actuallySent,
          remainingMessages: -actuallySent,
        },
      });
    }

    return NextResponse.json({
      success: true,
      channel: "sms",
      sent: actuallySent,
      remainingMessages: invitation.remainingMessages - actuallySent,
    });
  } catch (err) {
    console.error("❌ MESSAGE SEND ERROR:", err);
    return NextResponse.json(
      { error: "MESSAGE_SEND_FAILED" },
      { status: 500 }
    );
  }
}
