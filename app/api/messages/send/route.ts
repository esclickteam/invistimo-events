import { NextResponse } from "next/server";
import { sendSMS } from "@/lib/sendSMS";
import { buildMessage } from "@/lib/messageTemplates";
import MessageLog from "@/models/MessageLog";
import Invitation from "@/models/Invitation";
import Guest from "@/models/Guest";

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
  const body = await req.json();

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
  } = body;

  const invitation = await Invitation.findById(invitationId);
  if (!invitation) {
    return NextResponse.json(
      { error: "INV_NOT_FOUND" },
      { status: 404 }
    );
  }

  const guests: GuestDoc[] = await Guest.find({ invitationId }).lean();

  /* ================= FILTER TARGETS ================= */

  const targets: GuestDoc[] = guests.filter((g: GuestDoc) => {
    if (filter === "pending") return g.rsvp === "pending";
    if (filter === "withTable") return Boolean(g.tableName);
    return true;
  });

  /* ================= BALANCE CHECK ================= */

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

  /* ================= SEND SMS ================= */

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

    await sendSMS({
      to: phone,
      message: text,
    });

    await MessageLog.create({
      invitationId,
      guestId: guest._id,
      phone,
      channel: "sms",
      template,
      text,
      sentAt: new Date(),
    });
  }

  return NextResponse.json({
    success: true,
    sent: targets.length,
  });
}
