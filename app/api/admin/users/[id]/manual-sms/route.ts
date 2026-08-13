import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { connectDB } from "@/lib/db";
import { getHighQualityCloudinaryImageUrl } from "@/lib/cloudinary";
import { assertExternalSendAllowed } from "@/lib/env/externalSends";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { sendSMS } from "@/lib/sendSMS";
import { shortenUrl } from "@/lib/shortenUrl";
import { sendRsvpTemplateMedia } from "@/lib/whatsapp/sendRsvpTemplateMedia";
import Invitation from "@/models/Invitation";
import InvitationGuest from "@/models/InvitationGuest";
import User from "@/models/User";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SMS_LIMIT_1 = 200;
const SMS_LIMIT_2 = 320;

const RSVP_WHATSAPP_TEMPLATES = {
  rsvp: "rsvp_invitation_media",
  rsvp_reminder: "rsvp_reminder_invistimo",
} as const;

type Channel = "sms" | "whatsapp";
type TemplateKey = "rsvp" | "rsvp_reminder" | "reminder" | "";

function isAdminContext(auth: any) {
  return (
    auth?.role === "admin" ||
    auth?.impersonationRole === "admin" ||
    !!auth?.impersonatedBy
  );
}

function countBusinessSms(text: string) {
  const length = [...text].length;

  if (length <= SMS_LIMIT_1) return 1;
  if (length <= SMS_LIMIT_2) return 2;

  return -1;
}

function normalizeSmsPhone(value: string) {
  let phone = String(value || "").replace(/\D/g, "");

  if (!phone) return "";

  if (phone.startsWith("00")) {
    phone = phone.slice(2);
  }

  if (phone.startsWith("0")) {
    phone = `972${phone.slice(1)}`;
  } else if (!phone.startsWith("972")) {
    phone = `972${phone}`;
  }

  return phone;
}

function phoneSuffix(value: unknown) {
  const digits = String(value || "").replace(/\D/g, "");

  if (!digits) return "";

  const local = digits.startsWith("972")
    ? digits.slice(3)
    : digits.startsWith("0")
      ? digits.slice(1)
      : digits;

  return local.slice(-9);
}

function cleanAddress(address?: string) {
  if (!address) return "";

  return address
    .replace(/,?\s*ישראל/gi, "")
    .replace(/\b\d{5,7}\b/g, "")
    .replace(/,+/g, ",")
    .replace(/\s{2,}/g, " ")
    .trim()
    .replace(/,$/, "");
}

function formatEventDateTime(dateString?: string, timeString?: string) {
  if (!dateString) return "";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return "";

  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  const formattedDate = `${dd}.${mm}.${yyyy}`;

  if (!timeString) return formattedDate;

  return `${formattedDate} ${timeString}`;
}

function getInvitationLocation(invitation: any) {
  if (typeof invitation?.location === "string") {
    return cleanAddress(invitation.location);
  }

  return cleanAddress(
    invitation?.location?.address ||
      invitation?.location?.name ||
      invitation?.address ||
      invitation?.eventLocation ||
      ""
  );
}

async function shortenLinksInMessage(message: string) {
  let finalMessage = message;
  const urls = finalMessage.match(/https?:\/\/[^\s]+/g);

  if (!urls) return finalMessage;

  for (const url of urls) {
    if (url.includes("{{") || url.includes("}}")) continue;

    try {
      const short = await shortenUrl(url);
      if (short) {
        finalMessage = finalMessage.replace(url, short);
      }
    } catch (err) {
      console.error("Admin manual SMS shorten failed:", err);
    }
  }

  return finalMessage;
}

async function findMatchingGuest(invitationId: string, normalizedPhone: string) {
  const targetSuffix = phoneSuffix(normalizedPhone);

  if (!targetSuffix) return null;

  const guests = await InvitationGuest.find({ invitationId })
    .select("phone token name")
    .lean();

  return (
    guests.find((guest) => phoneSuffix(guest.phone) === targetSuffix) || null
  );
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const auth = await getUserIdFromRequest(req);

    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    if (!isAdminContext(auth)) {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const { id: userId } = await context.params;
    const body = await req.json().catch(() => null);

    const phone = String(body?.phone || body?.to || "").trim();
    const message = String(body?.message || body?.text || "").trim();
    const channel: Channel =
      String(body?.channel || "sms").trim().toLowerCase() === "whatsapp"
        ? "whatsapp"
        : "sms";
    const templateKey = String(body?.templateKey || "").trim() as TemplateKey;
    const invitationId = String(body?.invitationId || "").trim();

    if (!userId || !phone) {
      return NextResponse.json(
        { success: false, error: "MISSING_PARAMS" },
        { status: 400 }
      );
    }

    if (channel === "sms" && !message) {
      return NextResponse.json(
        { success: false, error: "MISSING_PARAMS" },
        { status: 400 }
      );
    }

    const user = await User.findById(userId).select("_id name phone").lean();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    const normalizedPhone = normalizeSmsPhone(phone);

    if (!normalizedPhone || normalizedPhone.length < 11) {
      return NextResponse.json(
        { success: false, error: "INVALID_PHONE" },
        { status: 400 }
      );
    }

    if (channel === "whatsapp") {
      if (templateKey !== "rsvp" && templateKey !== "rsvp_reminder") {
        return NextResponse.json(
          { success: false, error: "WHATSAPP_ONLY_FOR_RSVP" },
          { status: 400 }
        );
      }

      const invitationQuery = invitationId
        ? { _id: invitationId, ownerId: userId }
        : { ownerId: userId };

      const invitation: any = await Invitation.findOne(invitationQuery)
        .select(
          "title shareId eventDate eventTime location address eventLocation headerImageUrl previewImageUrl imageUrl canvasImageUrl ownerId"
        )
        .lean();

      if (!invitation) {
        return NextResponse.json(
          { success: false, error: "INVITATION_NOT_FOUND" },
          { status: 404 }
        );
      }

      const shareId = String(invitation.shareId || "").trim();

      if (!shareId) {
        return NextResponse.json(
          { success: false, error: "INVITE_LINK_MISSING" },
          { status: 400 }
        );
      }

      const headerImageUrl = getHighQualityCloudinaryImageUrl(
        invitation.headerImageUrl ||
          invitation.previewImageUrl ||
          invitation.imageUrl ||
          invitation.canvasImageUrl ||
          ""
      );

      if (!headerImageUrl) {
        return NextResponse.json(
          { success: false, error: "INVITATION_IMAGE_MISSING" },
          { status: 400 }
        );
      }

      const guest = await findMatchingGuest(
        String(invitation._id),
        normalizedPhone
      );
      const token = String(guest?.token || "").trim();
      const rsvpLink = token
        ? `https://www.invistimo.com/invite/${shareId}?token=${token}`
        : `https://www.invistimo.com/invite/${shareId}`;

      const gate = assertExternalSendAllowed({
        channel: "whatsapp",
        to: normalizedPhone,
      });

      if (!gate.allowed) {
        console.warn("📵 Admin manual WhatsApp blocked by safety gate", {
          reason: gate.reason,
          to: normalizedPhone,
          adminUserId: auth.userId,
          targetUserId: userId,
        });

        return NextResponse.json(
          {
            success: false,
            error: "EXTERNAL_SENDS_BLOCKED",
            reason: gate.reason,
          },
          { status: 403 }
        );
      }

      const templateName = RSVP_WHATSAPP_TEMPLATES[templateKey];

      const result = await sendRsvpTemplateMedia({
        to: normalizedPhone,
        templateName,
        languageCode: "he",
        eventTitle: String(invitation.title || "").trim() || "האירוע שלנו",
        eventDate: formatEventDateTime(
          invitation.eventDate,
          invitation.eventTime
        ),
        eventLocation: getInvitationLocation(invitation),
        headerImageUrl,
        rsvpLink,
      });

      console.log("✅ ADMIN MANUAL WHATSAPP SENT:", {
        adminUserId: auth.userId,
        targetUserId: userId,
        invitationId: String(invitation._id),
        phone: normalizedPhone,
        templateName,
        guestId: guest?._id ? String(guest._id) : null,
        messageId: result?.messageId || null,
      });

      return NextResponse.json(
        {
          success: true,
          channel: "whatsapp",
          phone: normalizedPhone,
          templateName,
          sent: 1,
        },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    const finalMessage = await shortenLinksInMessage(message);
    const parts = countBusinessSms(finalMessage);

    if (parts === -1) {
      return NextResponse.json(
        {
          success: false,
          error: "MESSAGE_TOO_LONG",
          maxChars: SMS_LIMIT_2,
          totalChars: [...finalMessage].length,
        },
        { status: 400 }
      );
    }

    const gate = assertExternalSendAllowed({
      channel: "sms",
      to: normalizedPhone,
    });

    if (!gate.allowed) {
      console.warn("📵 Admin manual SMS blocked by safety gate", {
        reason: gate.reason,
        to: normalizedPhone,
        adminUserId: auth.userId,
        targetUserId: userId,
      });

      return NextResponse.json(
        {
          success: false,
          error: "EXTERNAL_SENDS_BLOCKED",
          reason: gate.reason,
        },
        { status: 403 }
      );
    }

    await sendSMS({
      to: normalizedPhone,
      message: finalMessage,
    });

    console.log("✅ ADMIN MANUAL SMS SENT:", {
      adminUserId: auth.userId,
      targetUserId: userId,
      phone: normalizedPhone,
      parts,
      chars: [...finalMessage].length,
    });

    return NextResponse.json(
      {
        success: true,
        channel: "sms",
        parts,
        totalChars: [...finalMessage].length,
        phone: normalizedPhone,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (err) {
    console.error("❌ ADMIN MANUAL MESSAGE ERROR:", err);

    return NextResponse.json(
      { success: false, error: "SEND_FAILED" },
      { status: 500 }
    );
  }
}
