import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

import db from "@/lib/db";
import CustomerFile from "@/models/CustomerFile";
import CustomerLeadMessage from "@/models/CustomerLeadMessage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AuthUser = {
  id?: string;
  _id?: string;
  userId?: string;
  role?: string;
  staffType?: string;
  businessId?: string;
  email?: string;
  name?: string;
};

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function normalizeRole(value: unknown) {
  return cleanString(value).toLowerCase();
}

function getJwtSecret() {
  return (
    process.env.JWT_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.AUTH_SECRET ||
    ""
  );
}

function get360DialogApiKey() {
  return (
    process.env.WHATSAPP_360DIALOG_API_KEY ||
    process.env.DIALOG360_API_KEY ||
    process.env.THREESIXTYDIALOG_API_KEY ||
    process.env.WHATSAPP_API_KEY ||
    ""
  );
}

function getWhatsappBusinessNumber() {
  return (
    process.env.WHATSAPP_BUSINESS_PHONE_NUMBER ||
    process.env.WHATSAPP_FROM_NUMBER ||
    process.env.INVISTIMO_WHATSAPP_NUMBER ||
    ""
  );
}

function toObjectId(value: unknown) {
  const id = cleanString(value);

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }

  return new mongoose.Types.ObjectId(id);
}

function getCookieValue(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
  names: string[]
) {
  for (const name of names) {
    const value = cookieStore.get(name)?.value;

    if (value) return value;
  }

  return "";
}

function getUserIdFromAuth(user: AuthUser | null) {
  const id = cleanString(user?.id || user?._id || user?.userId);

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return "";
  }

  return id;
}

async function getAuthUser(): Promise<AuthUser | null> {
  const secret = getJwtSecret();

  if (!secret) {
    console.error("EMPLOYEE LEAD MESSAGES AUTH ERROR: missing JWT secret");
    return null;
  }

  const cookieStore = await cookies();

  const token = getCookieValue(cookieStore, [
    "token",
    "auth-token",
    "authToken",
    "session",
    "next-auth.session-token",
    "__Secure-next-auth.session-token",
  ]);

  if (!token) return null;

  try {
    const decoded = jwt.verify(token, secret) as AuthUser;
    return decoded || null;
  } catch (error) {
    console.error("EMPLOYEE LEAD MESSAGES AUTH VERIFY ERROR:", error);
    return null;
  }
}

function isAdmin(user: AuthUser | null) {
  return normalizeRole(user?.role) === "admin";
}

function isEmployeeAllowed(user: AuthUser | null) {
  const role = normalizeRole(user?.role);
  const staffType = normalizeRole(user?.staffType);

  return (
    role === "staff" ||
    role === "employee" ||
    role === "admin" ||
    Boolean(staffType)
  );
}

function isLeadCustomer(customer: any) {
  return (
    cleanString(customer?.status) === "lead" ||
    cleanString(customer?.leadSource) !== "" ||
    cleanString(customer?.leadProvider) !== "" ||
    cleanString(customer?.facebookLeadId) !== "" ||
    cleanString(customer?.source) === "facebook_lead_make"
  );
}

function isAssignedToEmployee(customer: any, employeeId: string) {
  const assignedStaffIds = Array.isArray(customer?.assignedStaffIds)
    ? customer.assignedStaffIds
    : [];

  return assignedStaffIds.some((staffId: unknown) => {
    const id =
      typeof staffId === "object" && staffId
        ? cleanString((staffId as any)._id || (staffId as any).id)
        : cleanString(staffId);

    return id === employeeId;
  });
}

function normalizePhoneForWhatsapp(phone: unknown) {
  const digits = cleanString(phone).replace(/\D/g, "");

  if (!digits) return "";

  if (digits.startsWith("972")) return digits;

  if (digits.startsWith("0")) {
    return `972${digits.slice(1)}`;
  }

  return digits;
}

function extractProviderMessageId(data: any) {
  const messageId =
    data?.messages?.[0]?.id ||
    data?.messages?.[0]?.message_id ||
    data?.messageId ||
    data?.id ||
    "";

  return cleanString(messageId);
}

function extractProviderError(data: any) {
  const errorMessage =
    data?.error?.message ||
    data?.errors?.[0]?.message ||
    data?.meta?.error?.message ||
    data?.message ||
    "";

  return cleanString(errorMessage);
}

async function getLeadForEmployee(leadId: string, authUser: AuthUser | null) {
  if (!authUser || !isEmployeeAllowed(authUser)) {
    return {
      errorResponse: NextResponse.json(
        {
          success: false,
          error: "UNAUTHORIZED",
          message: "אין הרשאה לצפייה בהודעות הליד",
        },
        { status: 401 }
      ),
      lead: null,
      employeeId: "",
    };
  }

  const employeeId = getUserIdFromAuth(authUser);

  if (!employeeId) {
    return {
      errorResponse: NextResponse.json(
        {
          success: false,
          error: "INVALID_EMPLOYEE",
          message: "משתמש עובד לא תקין",
        },
        { status: 400 }
      ),
      lead: null,
      employeeId: "",
    };
  }

  const leadObjectId = toObjectId(leadId);

  if (!leadObjectId) {
    return {
      errorResponse: NextResponse.json(
        {
          success: false,
          error: "INVALID_LEAD_ID",
          message: "מזהה ליד לא תקין",
        },
        { status: 400 }
      ),
      lead: null,
      employeeId,
    };
  }

  const lead = await CustomerFile.findById(leadObjectId)
    .populate("assignedStaffIds", "_id name email role staffType")
    .lean();

  if (!lead) {
    return {
      errorResponse: NextResponse.json(
        {
          success: false,
          error: "LEAD_NOT_FOUND",
          message: "הליד לא נמצא",
        },
        { status: 404 }
      ),
      lead: null,
      employeeId,
    };
  }

  if (!isLeadCustomer(lead)) {
    return {
      errorResponse: NextResponse.json(
        {
          success: false,
          error: "NOT_A_LEAD",
          message: "התיק הזה אינו מוגדר כליד",
        },
        { status: 400 }
      ),
      lead: null,
      employeeId,
    };
  }

  const allowed = isAdmin(authUser) || isAssignedToEmployee(lead, employeeId);

  if (!allowed) {
    return {
      errorResponse: NextResponse.json(
        {
          success: false,
          error: "FORBIDDEN",
          message: "הליד לא משויך לעובד הזה",
        },
        { status: 403 }
      ),
      lead: null,
      employeeId,
    };
  }

  return {
    errorResponse: null,
    lead,
    employeeId,
  };
}

async function sendWhatsappTextMessage({
  to,
  messageText,
}: {
  to: string;
  messageText: string;
}) {
  const apiKey = get360DialogApiKey();

  if (!apiKey) {
    throw new Error("חסר מפתח API של 360dialog במשתני הסביבה");
  }

  const normalizedTo = normalizePhoneForWhatsapp(to);

  if (!normalizedTo) {
    throw new Error("מספר טלפון לא תקין לשליחת WhatsApp");
  }

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: normalizedTo,
    type: "text",
    text: {
      preview_url: false,
      body: messageText,
    },
  };

  const response = await fetch("https://waba-v2.360dialog.io/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "D360-API-KEY": apiKey,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const providerError = extractProviderError(data);

    throw new Error(
      providerError ||
        "שליחת WhatsApp נכשלה. אם זו הודעה ראשונה אחרי 24 שעות צריך Template מאושר."
    );
  }

  return {
    providerMessageId: extractProviderMessageId(data),
    rawPayload: data,
  };
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ leadId: string }> }
) {
  try {
    await db();

    const authUser = await getAuthUser();
    const { leadId } = await context.params;

    const { errorResponse, employeeId } = await getLeadForEmployee(
      leadId,
      authUser
    );

    if (errorResponse) return errorResponse;

    const leadObjectId = toObjectId(leadId);

    if (!leadObjectId) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_LEAD_ID",
          message: "מזהה ליד לא תקין",
        },
        { status: 400 }
      );
    }

    const messages = await CustomerLeadMessage.find({
      customerFileId: leadObjectId,
    })
      .populate("staffId", "_id name email role staffType")
      .sort({ createdAt: 1 })
      .limit(500)
      .lean();

    return NextResponse.json(
      {
        success: true,
        employeeId,
        messages,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("GET EMPLOYEE LEAD MESSAGES ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "SERVER_ERROR",
        message: "שגיאה בטעינת הודעות הליד",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ leadId: string }> }
) {
  try {
    await db();

    const authUser = await getAuthUser();
    const { leadId } = await context.params;

    const { errorResponse, lead, employeeId } = await getLeadForEmployee(
      leadId,
      authUser
    );

    if (errorResponse) return errorResponse;

    const leadObjectId = toObjectId(leadId);
    const staffObjectId = toObjectId(employeeId);

    if (!leadObjectId || !staffObjectId) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_IDS",
          message: "מזהה ליד או עובד לא תקין",
        },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => null);
    const messageText = cleanString(body?.messageText || body?.text);

    if (!messageText) {
      return NextResponse.json(
        {
          success: false,
          error: "EMPTY_MESSAGE",
          message: "חובה לכתוב הודעה",
        },
        { status: 400 }
      );
    }

    if (messageText.length > 4000) {
      return NextResponse.json(
        {
          success: false,
          error: "MESSAGE_TOO_LONG",
          message: "ההודעה ארוכה מדי",
        },
        { status: 400 }
      );
    }

    const toPhone = normalizePhoneForWhatsapp((lead as any)?.phone);

    if (!toPhone) {
      return NextResponse.json(
        {
          success: false,
          error: "MISSING_LEAD_PHONE",
          message: "אין לליד מספר טלפון תקין",
        },
        { status: 400 }
      );
    }

    const fromPhone = normalizePhoneForWhatsapp(getWhatsappBusinessNumber());

    const pendingMessage = await CustomerLeadMessage.create({
      customerFileId: leadObjectId,
      staffId: staffObjectId,
      direction: "outgoing",
      channel: "whatsapp",
      from: fromPhone,
      to: toPhone,
      messageText,
      provider: "360dialog",
      providerMessageId: "",
      status: "pending",
      errorMessage: "",
      rawPayload: null,
    });

    try {
      const sent = await sendWhatsappTextMessage({
        to: toPhone,
        messageText,
      });

      pendingMessage.status = "sent";
      pendingMessage.providerMessageId = sent.providerMessageId;
      pendingMessage.rawPayload = sent.rawPayload;
      pendingMessage.errorMessage = "";

      await pendingMessage.save();

      await CustomerFile.findByIdAndUpdate(leadObjectId, {
        $set: {
          leadStatus:
            cleanString((lead as any)?.leadStatus) === "new"
              ? "contacted"
              : (lead as any)?.leadStatus || "contacted",
          status: "lead",
        },
      });

      const savedMessage = await CustomerLeadMessage.findById(
        pendingMessage._id
      )
        .populate("staffId", "_id name email role staffType")
        .lean();

      return NextResponse.json(
        {
          success: true,
          message: "הודעת WhatsApp נשלחה בהצלחה",
          leadMessage: savedMessage,
        },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    } catch (sendError) {
      console.error("SEND LEAD WHATSAPP MESSAGE FAILED:", sendError);

      pendingMessage.status = "failed";
      pendingMessage.errorMessage =
        sendError instanceof Error
          ? sendError.message
          : "שליחת WhatsApp נכשלה";

      await pendingMessage.save();

      const failedMessage = await CustomerLeadMessage.findById(
        pendingMessage._id
      )
        .populate("staffId", "_id name email role staffType")
        .lean();

      return NextResponse.json(
        {
          success: false,
          error: "WHATSAPP_SEND_FAILED",
          message:
            sendError instanceof Error
              ? sendError.message
              : "שליחת WhatsApp נכשלה",
          leadMessage: failedMessage,
        },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error("POST EMPLOYEE LEAD MESSAGE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "SERVER_ERROR",
        message: "שגיאה בשליחת הודעת ליד",
      },
      { status: 500 }
    );
  }
}