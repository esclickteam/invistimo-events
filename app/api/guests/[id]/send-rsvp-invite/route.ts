import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import db from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { canManageInvitation } from "@/lib/canManageInvitation";
import { getHighQualityCloudinaryImageUrl } from "@/lib/cloudinary";
import { shortenUrl } from "@/lib/shortenUrl";
import { sendRsvpTemplateMedia } from "@/lib/whatsapp/sendRsvpTemplateMedia";

import InvitationGuest from "@/models/InvitationGuest";
import Invitation from "@/models/Invitation";
import User from "@/models/User";
import WhatsappQueue from "@/models/WhatsappQueue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROUND1_WHATSAPP_TEMPLATE = "rsvp_invitation_media";

const ROUND1_SMS_TEMPLATE =
  "הוזמנתם לאירוע {{invitationTitle}}.\n\n" +
  "לצפייה בהזמנה ואישור הגעה לחצו כאן:\n" +
  "{{rsvpLink}}\n\n" +
  "מחכים לכם באהבה ❤️";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type Channel = "whatsapp" | "sms";

function cleanStr(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePhone(phoneRaw: unknown) {
  let phone = String(phoneRaw || "").replace(/\D/g, "");

  if (!phone) return "";

  if (phone.startsWith("0")) {
    phone = "972" + phone.slice(1);
  } else if (!phone.startsWith("972")) {
    phone = "972" + phone;
  }

  return phone;
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

function countBusinessSms(text: string) {
  const value = String(text || "");

  if (!value) return -1;

  const isUnicode = /[^\u0000-\u007f]/.test(value);
  const single = isUnicode ? 70 : 160;
  const multi = isUnicode ? 67 : 153;

  if (value.length <= single) return 1;

  return Math.ceil(value.length / multi);
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

/**
 * שליחה מיידית של הזמנת אישור הגעה לאורח בודד,
 * באותה תבנית של סבב 1, בלי לנעול/לשנות סבבי הודעות.
 */
export async function POST(req: NextRequest, context: RouteContext) {
  try {
    await db();

    const auth = await getUserIdFromRequest(req);

    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const { id: guestId } = await context.params;

    if (!guestId || !mongoose.Types.ObjectId.isValid(guestId)) {
      return NextResponse.json(
        { success: false, error: "INVALID_GUEST_ID" },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const channel = cleanStr(body?.channel).toLowerCase() as Channel;

    if (channel !== "whatsapp" && channel !== "sms") {
      return NextResponse.json(
        { success: false, error: "INVALID_CHANNEL" },
        { status: 400 }
      );
    }

    const guest: any = await InvitationGuest.findById(guestId).lean();

    if (!guest) {
      return NextResponse.json(
        { success: false, error: "GUEST_NOT_FOUND" },
        { status: 404 }
      );
    }

    const invitationId = String(guest.invitationId || "");

    if (!invitationId || !mongoose.Types.ObjectId.isValid(invitationId)) {
      return NextResponse.json(
        { success: false, error: "INVITATION_NOT_FOUND" },
        { status: 404 }
      );
    }

    const invitation: any = await Invitation.findById(invitationId).lean();

    if (!invitation) {
      return NextResponse.json(
        { success: false, error: "INVITATION_NOT_FOUND" },
        { status: 404 }
      );
    }

    if (!canManageInvitation(auth, invitation)) {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const phone = normalizePhone(guest.phone);

    if (!phone) {
      return NextResponse.json(
        { success: false, error: "GUEST_PHONE_MISSING" },
        { status: 400 }
      );
    }

    const token = cleanStr(guest.token);
    const shareId = cleanStr(invitation.shareId);

    if (!token || !shareId) {
      return NextResponse.json(
        { success: false, error: "GUEST_INVITE_LINK_MISSING" },
        { status: 400 }
      );
    }

    const urlSuffix = `${shareId}?token=${token}`;
    const rsvpLink = `https://www.invistimo.com/invite/${urlSuffix}`;
    const invitationTitle = cleanStr(invitation.title) || "האירוע שלנו";
    const eventDate = formatEventDateTime(
      invitation.eventDate || invitation.date,
      invitation.eventTime
    );
    const eventLocation = getInvitationLocation(invitation);

    if (channel === "whatsapp") {
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

      const payload = {
        languageCode: "he",
        eventTitle: invitationTitle,
        eventDate,
        eventLocation,
        headerImageUrl,
        rsvpLink,
        name: cleanStr(guest.name),
        urlSuffix,
      };

      const idempotencyKey = [
        "whatsapp",
        "manual_rsvp_invite",
        String(invitation._id),
        String(guest._id),
        String(Date.now()),
      ].join(":");

      let queueDoc: any = null;

      try {
        queueDoc = await WhatsappQueue.create({
          invitationId: invitation._id,
          guestId: guest._id,
          scheduleId: null,
          channel: "whatsapp",
          type: "rsvp",
          round: 1,
          roundNumber: 1,
          phone,
          templateName: ROUND1_WHATSAPP_TEMPLATE,
          idempotencyKey,
          payload,
          status: "sending",
          scheduledAt: null,
          attempts: 0,
          maxAttempts: 1,
          lockedAt: new Date(),
          lockedBy: "manual-rsvp-invite",
        });
      } catch (queueError: any) {
        console.error(
          "⚠️ MANUAL RSVP WHATSAPP QUEUE CREATE FAILED:",
          queueError?.message || queueError
        );
      }

      try {
        const result = await sendRsvpTemplateMedia({
          to: phone,
          templateName: ROUND1_WHATSAPP_TEMPLATE,
          languageCode: "he",
          eventTitle: invitationTitle,
          eventDate,
          eventLocation,
          headerImageUrl,
          rsvpLink,
        });

        if (queueDoc?._id) {
          await WhatsappQueue.updateOne(
            { _id: queueDoc._id },
            {
              $set: {
                status: "sent",
                sentAt: new Date(),
                wamid: result?.providerResponse?.messages?.[0]?.id || null,
                providerStatus: "sent",
                lockedAt: null,
                lockedBy: null,
              },
              $inc: { attempts: 1 },
            }
          );
        }

        return NextResponse.json({
          success: true,
          channel: "whatsapp",
          sent: 1,
          guestId: String(guest._id),
          // לא נוגעים בסבבים / rsvpRoundSent
          roundLocksTouched: false,
        });
      } catch (sendError: any) {
        if (queueDoc?._id) {
          await WhatsappQueue.updateOne(
            { _id: queueDoc._id },
            {
              $set: {
                status: "failed",
                failedAt: new Date(),
                providerStatus: "failed",
                lastError: String(sendError?.message || sendError),
                errorMessage: String(sendError?.message || sendError),
                lockedAt: null,
                lockedBy: null,
              },
              $inc: { attempts: 1 },
            }
          );
        }

        throw sendError;
      }
    }

    /* ================= SMS ================= */

    const ownerId = String(invitation.ownerId || auth.userId);
    const user: any = await User.findById(ownerId).lean();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    const usesNewLogic =
      Boolean(user.allowedMessageRounds) ||
      Boolean(user.planLimits?.allowedMessageRounds);

    const remainingMessages = Math.max(
      (typeof user.maxMessages === "number" ? user.maxMessages : 0) -
        (typeof user.smsUsed === "number" ? user.smsUsed : 0),
      0
    );

    if (!usesNewLogic && remainingMessages <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "SMS_QUOTA_EXCEEDED",
          message: "מכסת הודעות ה-SMS נוצלה",
        },
        { status: 403 }
      );
    }

    const shortRsvpUrl = await shortenUrl(rsvpLink);

    const finalText = ROUND1_SMS_TEMPLATE.replace(
      /{{invitationTitle}}/g,
      invitationTitle
    )
      .replace(/{{rsvpLink}}/g, shortRsvpUrl)
      .replace(/{{name}}/g, cleanStr(guest.name));

    const parts = countBusinessSms(finalText);

    if (parts === -1) {
      return NextResponse.json(
        { success: false, error: "INVALID_SMS_CONTENT" },
        { status: 400 }
      );
    }

    if (!usesNewLogic && parts > remainingMessages) {
      return NextResponse.json(
        {
          success: false,
          error: "SMS_QUOTA_EXCEEDED",
          message: "מכסת הודעות ה-SMS אינה מספיקה לשליחה זו",
        },
        { status: 403 }
      );
    }

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

    if (!res.ok) {
      const providerText = await res.text().catch(() => "");

      return NextResponse.json(
        {
          success: false,
          error: "SMS_SEND_FAILED",
          message: providerText || "שליחת ה-SMS נכשלה",
        },
        { status: 502 }
      );
    }

    if (!usesNewLogic && parts > 0) {
      await User.updateOne({ _id: user._id }, { $inc: { smsUsed: parts } });
    }

    return NextResponse.json({
      success: true,
      channel: "sms",
      sent: 1,
      charged: parts,
      guestId: String(guest._id),
      // לא נוגעים בסבבים / rsvpRoundSent
      roundLocksTouched: false,
    });
  } catch (error: any) {
    console.error("❌ MANUAL RSVP INVITE SEND ERROR:", error?.message || error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "SEND_FAILED",
      },
      { status: 500 }
    );
  }
}
