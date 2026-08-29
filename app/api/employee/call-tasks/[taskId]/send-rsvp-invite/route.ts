import { NextRequest, NextResponse } from "next/server";
import mongoose, { Types } from "mongoose";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

import db from "@/lib/db";
import { getHighQualityCloudinaryImageUrl } from "@/lib/cloudinary";
import { shortenUrl } from "@/lib/shortenUrl";
import { buildGuestInviteUrl, getInvitationRsvpSiteMode } from "@/lib/guestInviteUrl";
import { sendRsvpTemplateMedia } from "@/lib/whatsapp/sendRsvpTemplateMedia";

import InvitationGuest from "@/models/InvitationGuest";
import Invitation from "@/models/Invitation";
import User from "@/models/User";
import CallTask from "@/models/CallTask";
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
  params: Promise<{ taskId: string }>;
};

type Channel = "whatsapp" | "sms";

type AuthUser = {
  id: string;
  role?: string;
  email?: string;
  name?: string;
};

function cleanStr(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function extractIdString(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value instanceof mongoose.Types.ObjectId) return String(value);
  if (typeof value === "object") {
    const anyValue = value as any;
    if (anyValue._id) return extractIdString(anyValue._id);
    if (anyValue.id) return extractIdString(anyValue.id);
  }
  return String(value || "");
}

function toObjectId(value: unknown) {
  const id = extractIdString(value);
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return new mongoose.Types.ObjectId(id);
}

function getJwtSecret() {
  return process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "";
}

async function getAuthUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();

  const token =
    cookieStore.get("token")?.value ||
    cookieStore.get("auth_token")?.value ||
    cookieStore.get("authToken")?.value ||
    cookieStore.get("jwt")?.value ||
    cookieStore.get("session")?.value ||
    "";

  if (!token) return null;

  const secret = getJwtSecret();
  if (!secret) return null;

  try {
    const decoded = jwt.verify(token, secret) as any;
    const id = String(
      decoded.id || decoded._id || decoded.userId || decoded.sub || ""
    );
    if (!id) return null;

    return {
      id,
      role: decoded.role,
      email: decoded.email,
      name: decoded.name,
    };
  } catch {
    return null;
  }
}

async function requireEmployee() {
  const auth = await getAuthUser();

  if (!auth?.id) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { success: false, error: "לא מחובר" },
        { status: 401 }
      ),
    };
  }

  const userObjectId = toObjectId(auth.id);
  const userConditions: any[] = [];

  if (userObjectId) userConditions.push({ _id: userObjectId });
  userConditions.push({ id: auth.id });
  if (auth.email) userConditions.push({ email: auth.email.toLowerCase() });

  const currentUser = await User.findOne({ $or: userConditions })
    .select("_id id name email role")
    .lean();

  if (!currentUser) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { success: false, error: "משתמש לא נמצא" },
        { status: 404 }
      ),
    };
  }

  const employeeObjectId = toObjectId((currentUser as any)._id);

  if (!employeeObjectId) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { success: false, error: "מזהה עובד לא תקין" },
        { status: 400 }
      ),
    };
  }

  return {
    ok: true as const,
    employeeId: employeeObjectId,
    employeeIdString: String(employeeObjectId),
  };
}

function normalizePhone(phoneRaw: unknown) {
  let phone = String(phoneRaw || "").replace(/\D/g, "");
  if (!phone) return "";
  if (phone.startsWith("0")) phone = "972" + phone.slice(1);
  else if (!phone.startsWith("972")) phone = "972" + phone;
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

function buildEmployeeAssignmentMatch(employeeId: Types.ObjectId) {
  const employeeIdString = String(employeeId);

  return {
    $or: [
      { assignedToEmployeeId: employeeId },
      { assignedEmployeeId: employeeId },
      { employeeId },
      { assignedToEmployeeId: employeeIdString },
      { assignedEmployeeId: employeeIdString },
      { employeeId: employeeIdString },
    ],
  };
}

/**
 * שליחה מיידית של הזמנת אישור הגעה לאורח ממסך תור השיחות של העובד.
 * תבנית סבב 1 + קישור אישי. לא נוגע בסבבי הודעות.
 */
export async function POST(req: NextRequest, context: RouteContext) {
  try {
    await db();

    const employee = await requireEmployee();
    if (!employee.ok) return employee.response;

    const { taskId } = await context.params;

    if (!taskId || !mongoose.Types.ObjectId.isValid(taskId)) {
      return NextResponse.json(
        { success: false, error: "INVALID_TASK_ID" },
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

    const taskObjectId = new mongoose.Types.ObjectId(taskId);

    const task: any = await CallTask.findOne({
      _id: taskObjectId,
      ...buildEmployeeAssignmentMatch(employee.employeeId),
    }).lean();

    if (!task) {
      return NextResponse.json(
        { success: false, error: "TASK_NOT_FOUND" },
        { status: 404 }
      );
    }

    const guestId =
      extractIdString(task.guestId) || extractIdString(task.invitationGuestId);

    if (!guestId || !mongoose.Types.ObjectId.isValid(guestId)) {
      return NextResponse.json(
        { success: false, error: "GUEST_NOT_FOUND" },
        { status: 404 }
      );
    }

    const guest: any = await InvitationGuest.findById(guestId).lean();

    if (!guest) {
      return NextResponse.json(
        { success: false, error: "GUEST_NOT_FOUND" },
        { status: 404 }
      );
    }

    const invitationId =
      extractIdString(task.invitationId) ||
      extractIdString(guest.invitationId);

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

    const phone =
      normalizePhone(guest.phone) ||
      normalizePhone(task.guestPhone) ||
      normalizePhone(task.phone);

    if (!phone) {
      return NextResponse.json(
        {
          success: false,
          error: "GUEST_PHONE_MISSING",
          message: "לאורח אין מספר טלפון תקין",
        },
        { status: 400 }
      );
    }

    const token = cleanStr(guest.token);
    const shareId = cleanStr(invitation.shareId);

    if (!token || !shareId) {
      return NextResponse.json(
        {
          success: false,
          error: "GUEST_INVITE_LINK_MISSING",
          message: "חסר קישור אישי להזמנה",
        },
        { status: 400 }
      );
    }

    const urlSuffix = `${shareId}?token=${token}`;
    const rsvpLink = buildGuestInviteUrl({
      shareId,
      token,
      rsvpSiteMode: getInvitationRsvpSiteMode(invitation),
    });
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
          {
            success: false,
            error: "INVITATION_IMAGE_MISSING",
            message: "חסרה תמונת הזמנה לשליחת WhatsApp",
          },
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
        name: cleanStr(guest.name) || cleanStr(task.guestName),
        urlSuffix,
      };

      const idempotencyKey = [
        "whatsapp",
        "employee_manual_rsvp_invite",
        String(invitation._id),
        String(guest._id),
        String(task._id),
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
          lockedBy: "employee-manual-rsvp-invite",
        });
      } catch (queueError: any) {
        console.error(
          "⚠️ EMPLOYEE RSVP WHATSAPP QUEUE CREATE FAILED:",
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
          taskId: String(task._id),
          guestId: String(guest._id),
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

    const ownerId = extractIdString(invitation.ownerId);
    const owner: any = ownerId ? await User.findById(ownerId).lean() : null;

    if (!owner) {
      return NextResponse.json(
        { success: false, error: "OWNER_NOT_FOUND" },
        { status: 404 }
      );
    }

    const usesNewLogic =
      Boolean(owner.allowedMessageRounds) ||
      Boolean(owner.planLimits?.allowedMessageRounds);

    const remainingMessages = Math.max(
      (typeof owner.maxMessages === "number" ? owner.maxMessages : 0) -
        (typeof owner.smsUsed === "number" ? owner.smsUsed : 0),
      0
    );

    if (!usesNewLogic && remainingMessages <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "SMS_QUOTA_EXCEEDED",
          message: "מכסת הודעות ה-SMS של הלקוח נוצלה",
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
      .replace(/{{name}}/g, cleanStr(guest.name) || cleanStr(task.guestName));

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
          message: "מכסת הודעות ה-SMS של הלקוח אינה מספיקה לשליחה זו",
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
      await User.updateOne({ _id: owner._id }, { $inc: { smsUsed: parts } });
    }

    return NextResponse.json({
      success: true,
      channel: "sms",
      sent: 1,
      charged: parts,
      taskId: String(task._id),
      guestId: String(guest._id),
      roundLocksTouched: false,
    });
  } catch (error: any) {
    console.error(
      "❌ EMPLOYEE RSVP INVITE SEND ERROR:",
      error?.message || error
    );

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "SEND_FAILED",
      },
      { status: 500 }
    );
  }
}
