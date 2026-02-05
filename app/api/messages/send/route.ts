import { NextResponse } from "next/server";
import db from "@/lib/db";
import { sendSMS } from "@/lib/sendSMS";
import MessageLog from "@/models/MessageLog";
import Invitation from "@/models/Invitation";
import Guest from "@/models/Guest";
import User from "@/models/User";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { buildFinalSmsText } from "@/lib/sms/buildFinalSmsText";

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
  tableId?: string | null;
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

    const userId = auth.userId;

    const user = await User.findById(userId).lean();
    if (!user) {
      return NextResponse.json(
        { error: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    if (!user.planLimits?.smsEnabled) {
      return NextResponse.json(
        {
          error: "SMS_DISABLED",
          message: "שליחת SMS אינה זמינה בחבילה הנוכחית",
        },
        { status: 403 }
      );
    }

    /* ================= BODY ================= */

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

    /* ================= LOAD INVITATION ================= */

    const invitation = await Invitation.findById(invitationId);
    if (!invitation) {
      return NextResponse.json(
        { error: "INV_NOT_FOUND" },
        { status: 404 }
      );
    }

    if (String(invitation.ownerId) !== String(userId)) {
      return NextResponse.json(
        { error: "FORBIDDEN" },
        { status: 403 }
      );
    }

    /* ================= LOAD GUESTS ================= */

    const guests: GuestDoc[] = await Guest.find({ invitationId }).lean();

    /* ================= FILTER TARGETS ================= */

    const targets: GuestDoc[] = guests.filter((g) => {
      if (filter === "pending") return g.rsvp === "pending";
      if (filter === "withTable") return Boolean(g.tableId);
      return true;
    });

    /* ================= BALANCE CHECK ================= */

    if (typeof invitation.remainingMessages !== "number") {
      return NextResponse.json(
        { error: "SMS_BALANCE_NOT_INITIALIZED" },
        { status: 500 }
      );
    }

    const remainingMessages = invitation.remainingMessages;

    if (remainingMessages <= 0 || targets.length > remainingMessages) {
      return NextResponse.json(
        {
          error: "NO_SMS_BALANCE",
          remainingMessages,
        },
        { status: 403 }
      );
    }

    /* ================= SEND SMS ================= */

    let actuallySent = 0;

    for (const guest of targets) {
      // אם זה טמפלט שולחן – רק למי שיש tableId
      if (template === "table" && !guest.tableId) continue;

      const text = await buildFinalSmsText({
        messageTemplate: customText || "",
        guest,
        invitation: {
          shareId: invitation.shareId,
          eventId: invitation.eventId,
          eventLocation: invitation.eventLocation,
        },
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

    /* ================= UPDATE SMS BALANCE ================= */

    let updatedInvitation = invitation;

    if (actuallySent > 0) {
      updatedInvitation = await Invitation.findByIdAndUpdate(
        invitation._id,
        {
          $inc: {
            sentSmsCount: actuallySent,
            remainingMessages: -actuallySent,
          },
        },
        { new: true }
      );
    }

    return NextResponse.json({
      success: true,
      sent: actuallySent,
      remainingMessages: updatedInvitation.remainingMessages,
    });
  } catch (err) {
    console.error("❌ SMS SEND ERROR:", err);
    return NextResponse.json(
      { error: "SMS_SEND_FAILED" },
      { status: 500 }
    );
  }
}
