import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

import db from "@/lib/db";
import User from "@/models/User";
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

type WhatsappTemplateKey = "lead_opening" | "reengagement" | "after_call";

type WhatsappTemplateConfig = {
  key: WhatsappTemplateKey;
  label: string;
  templateName: string;
  fallbackText: string;
};

const WHATSAPP_TEMPLATES: Record<WhatsappTemplateKey, WhatsappTemplateConfig> = {
  lead_opening: {
    key: "lead_opening",
    label: "פתיחה לליד חדש",
    templateName: "invistimo_lead_opening_agent",
    fallbackText:
      "שלום, כאן {{employee_name}} מ-Invistimo 😊\n\nקיבלנו את הפרטים שהשארת לגבי השירות שלנו.\nאשמח לבדוק איתך כמה פרטים קצרים כדי להתאים לך הצעה לאירוע:\n\nמה סוג האירוע?\nמה תאריך האירוע?\nכמה רשומות/מוזמנים יש לך בערך?",
  },
  reengagement: {
    key: "reengagement",
    label: "חידוש שיחה אחרי 24 שעות",
    templateName: "invistimo_reengagement_agent",
    fallbackText:
      "שלום, כאן {{employee_name}} מ-Invistimo 😊\n\nרציתי להמשיך איתך את השיחה לגבי השירותים שלנו לאירוע.\nאשמח לעזור לך בהמשך התהליך ולבדוק יחד מה הכי מתאים לך.",
  },
  after_call: {
    key: "after_call",
    label: "המשך אחרי שיחת טלפון",
    templateName: "invistimo_after_call_agent",
    fallbackText:
      "שלום, כאן {{employee_name}} מ-Invistimo 😊\n\nבהמשך לשיחה שלנו, רציתי להמשיך איתך כאן לגבי השירותים שלנו לאירוע.\n\nאפשר לענות לי כאן ונמשיך בצורה מסודרת.",
  },
};

const ALLOWED_TEMPLATE_NAMES = new Set(
  Object.values(WHATSAPP_TEMPLATES).map((template) => template.templateName)
);

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

function getWhatsappTemplateLanguageCode() {
  return (
    process.env.WHATSAPP_TEMPLATE_LANGUAGE ||
    process.env.WHATSAPP_LANGUAGE_CODE ||
    "he"
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
  const errorCode =
    data?.error?.code ||
    data?.errors?.[0]?.code ||
    data?.meta?.error?.code ||
    data?.code ||
    "";

  const errorMessage =
    data?.error?.message ||
    data?.errors?.[0]?.message ||
    data?.meta?.error?.message ||
    data?.message ||
    "";

  const cleanCode = cleanString(errorCode);
  const cleanMessage = cleanString(errorMessage);

  if (cleanCode && cleanMessage) {
    return `${cleanCode}: ${cleanMessage}`;
  }

  return cleanMessage || cleanCode;
}

function getReadableWhatsappError(error: unknown) {
  const clean = cleanString(error);

  if (!clean) return "שליחת WhatsApp נכשלה";

  if (clean.includes("131047") || clean.toLowerCase().includes("re-engagement")) {
    return "לא ניתן לשלוח הודעה רגילה כרגע, כי עברו יותר מ-24 שעות מאז שהלקוח ענה. יש לשלוח הודעה מוכנה מאושרת מהרשימה.";
  }

  return clean;
}

function replaceTemplateVariables(text: string, variables: Record<string, string>) {
  return text.replace(/\{\{\s*employee_name\s*\}\}/g, variables.employee_name || "");
}

function getTemplateByRequest(params: {
  templateKey?: unknown;
  templateName?: unknown;
}) {
  const templateKey = cleanString(params.templateKey) as WhatsappTemplateKey;
  const templateName = cleanString(params.templateName);

  if (templateKey && WHATSAPP_TEMPLATES[templateKey]) {
    return WHATSAPP_TEMPLATES[templateKey];
  }

  if (templateName && ALLOWED_TEMPLATE_NAMES.has(templateName)) {
    return Object.values(WHATSAPP_TEMPLATES).find(
      (template) => template.templateName === templateName
    );
  }

  return null;
}

async function getEmployeeDisplayName(params: {
  authUser: AuthUser | null;
  employeeId: string;
  bodyEmployeeName?: unknown;
}) {
  const fromBody = cleanString(params.bodyEmployeeName);
  if (fromBody) return fromBody;

  const fromAuth = cleanString(params.authUser?.name || params.authUser?.email);
  if (fromAuth) return fromAuth;

  const user = await User.findById(params.employeeId)
    .select("_id name email")
    .lean();

  return cleanString((user as any)?.name || (user as any)?.email) || "נציגת השירות";
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

async function sendWhatsappTemplateMessage({
  to,
  templateName,
  employeeName,
}: {
  to: string;
  templateName: string;
  employeeName: string;
}) {
  const apiKey = get360DialogApiKey();

  if (!apiKey) {
    throw new Error("חסר מפתח API של 360dialog במשתני הסביבה");
  }

  const normalizedTo = normalizePhoneForWhatsapp(to);

  if (!normalizedTo) {
    throw new Error("מספר טלפון לא תקין לשליחת WhatsApp");
  }

  if (!ALLOWED_TEMPLATE_NAMES.has(templateName)) {
    throw new Error("תבנית WhatsApp לא מאושרת במערכת");
  }

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: normalizedTo,
    type: "template",
    template: {
      name: templateName,
      language: {
        code: getWhatsappTemplateLanguageCode(),
      },
      components: [
        {
          type: "body",
          parameters: [
            {
              type: "text",
              parameter_name: "employee_name",
              text: employeeName || "נציגת השירות",
            },
          ],
        },
      ],
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

    throw new Error(providerError || "שליחת הודעת תבנית WhatsApp נכשלה");
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

    const requestedTemplate = getTemplateByRequest({
      templateKey: body?.templateKey,
      templateName: body?.templateName,
    });

    const isTemplateSend = Boolean(requestedTemplate);

    const employeeName = await getEmployeeDisplayName({
      authUser,
      employeeId,
      bodyEmployeeName: body?.templateVariables?.employee_name,
    });

    const messageText = isTemplateSend
      ? replaceTemplateVariables(requestedTemplate!.fallbackText, {
          employee_name: employeeName,
        })
      : cleanString(body?.messageText || body?.text);

    if (!messageText) {
      return NextResponse.json(
        {
          success: false,
          error: "EMPTY_MESSAGE",
          message: isTemplateSend
            ? "חסרים פרטים לשליחת ההודעה המוכנה"
            : "חובה לכתוב הודעה",
        },
        { status: 400 }
      );
    }

    if (!isTemplateSend && messageText.length > 4000) {
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

      templateKey: isTemplateSend ? requestedTemplate?.key : "",
      templateName: isTemplateSend ? requestedTemplate?.templateName : "",
      templateLabel: isTemplateSend ? requestedTemplate?.label : "",
      templateVariables: isTemplateSend
        ? {
            employee_name: employeeName,
          }
        : undefined,
    });

    try {
      const sent = isTemplateSend
        ? await sendWhatsappTemplateMessage({
            to: toPhone,
            templateName: requestedTemplate!.templateName,
            employeeName,
          })
        : await sendWhatsappTextMessage({
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
          message: isTemplateSend
            ? "ההודעה המוכנה נשלחה בהצלחה"
            : "הודעת WhatsApp נשלחה בהצלחה",
          leadMessage: savedMessage,
        },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    } catch (sendError) {
      console.error(
        isTemplateSend
          ? "SEND LEAD WHATSAPP TEMPLATE FAILED:"
          : "SEND LEAD WHATSAPP MESSAGE FAILED:",
        sendError
      );

      pendingMessage.status = "failed";
      pendingMessage.errorMessage = getReadableWhatsappError(
        sendError instanceof Error
          ? sendError.message
          : isTemplateSend
            ? "שליחת ההודעה המוכנה נכשלה"
            : "שליחת WhatsApp נכשלה"
      );

      await pendingMessage.save();

      const failedMessage = await CustomerLeadMessage.findById(
        pendingMessage._id
      )
        .populate("staffId", "_id name email role staffType")
        .lean();

      return NextResponse.json(
        {
          success: false,
          error: isTemplateSend
            ? "WHATSAPP_TEMPLATE_SEND_FAILED"
            : "WHATSAPP_SEND_FAILED",
          message: pendingMessage.errorMessage,
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