import { NextRequest, NextResponse } from "next/server";

import db from "@/lib/db";
import SalesDocument from "@/models/SalesDocument";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SMS4FREE_API_URL =
  process.env.SMS4FREE_API_URL ||
  "https://api.sms4free.co.il/ApiSMS/v2/SendSMS";

type RouteContext = {
  params:
    | {
        token: string;
      }
    | Promise<{
        token: string;
      }>;
};

type Sms4FreeResult = {
  success: boolean;
  provider: "sms4free";
  phone: string;
  parts: number;
  responseText: string;
};

function cleanStr(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function jsonError(message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    {
      success: false,
      error: message,
      message,
      details,
    },
    { status },
  );
}

async function getTokenFromContext(context: RouteContext) {
  const params = await context.params;
  return cleanStr(params?.token);
}

function getBaseUrl(req: NextRequest) {
  const fromEnv =
    cleanStr(process.env.NEXT_PUBLIC_APP_URL) ||
    cleanStr(process.env.NEXT_PUBLIC_SITE_URL) ||
    cleanStr(process.env.NEXTAUTH_URL) ||
    cleanStr(process.env.APP_URL);

  if (fromEnv) {
    return fromEnv.replace(/\/+$/, "");
  }

  return req.nextUrl.origin.replace(/\/+$/, "");
}

function normalizeSms4FreePhone(value: unknown) {
  let phone = cleanStr(value).replace(/\D/g, "");

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

function countBusinessSms(text: string) {
  const length = [...String(text || "")].length;

  if (length <= 200) return 1;
  if (length <= 320) return 2;

  return -1;
}

function getDocumentTitle(type: string) {
  if (type === "agreement") {
    return "הסכם ותנאי עסקה לחתימה";
  }

  return "הצעת מחיר";
}

function buildSmsText({
  type,
  link,
  clientName,
}: {
  type: string;
  link: string;
  clientName: string;
}) {
  const title = getDocumentTitle(type);

  if (clientName) {
    return `היי ${clientName}, מצורף קישור ל${title} עבור האירוע שלך ב-Invistimo: ${link}`;
  }

  return `Invistimo - מצורף קישור ל${title} עבור האירוע שלך: ${link}`;
}

function getSms4FreeConfig() {
  const key =
    cleanStr(process.env.SMS4FREE_KEY) ||
    cleanStr(process.env.SMS4FREE_API_KEY);

  const user =
    cleanStr(process.env.SMS4FREE_USER) ||
    cleanStr(process.env.SMS4FREE_USERNAME);

  const pass =
    cleanStr(process.env.SMS4FREE_PASS) ||
    cleanStr(process.env.SMS4FREE_PASSWORD);

  const sender =
    cleanStr(process.env.SMS4FREE_SENDER) ||
    cleanStr(process.env.SMS_SENDER) ||
    "Invistimo";

  const missing: string[] = [];

  if (!key) missing.push("SMS4FREE_KEY / SMS4FREE_API_KEY");
  if (!user) missing.push("SMS4FREE_USER / SMS4FREE_USERNAME");
  if (!pass) missing.push("SMS4FREE_PASS / SMS4FREE_PASSWORD");
  if (!sender) missing.push("SMS4FREE_SENDER");

  return {
    key,
    user,
    pass,
    sender,
    missing,
  };
}

function isSms4FreeFailureText(text: string) {
  const normalized = String(text || "").trim().toLowerCase();

  if (!normalized) return false;

  return (
    normalized.includes("error") ||
    normalized.includes("failed") ||
    normalized.includes("invalid") ||
    normalized.includes("unauthorized") ||
    normalized.includes("not enough") ||
    normalized.includes("missing") ||
    normalized.includes("denied") ||
    normalized.includes("שגיאה") ||
    normalized.includes("נכשל") ||
    normalized.includes("נכשלה") ||
    normalized.includes("לא תקין") ||
    normalized.includes("אין מספיק")
  );
}

async function sendSmsViaSms4Free({
  to,
  text,
}: {
  to: string;
  text: string;
}): Promise<Sms4FreeResult> {
  const config = getSms4FreeConfig();

  if (config.missing.length > 0) {
    throw new Error(
      `חסרים משתני סביבה של SMS4FREE: ${config.missing.join(", ")}`,
    );
  }

  const phone = normalizeSms4FreePhone(to);

  if (!phone || phone.length < 11) {
    throw new Error("מספר טלפון לא תקין לשליחת SMS");
  }

  const parts = countBusinessSms(text);

  if (parts === -1) {
    throw new Error("הודעת ה-SMS ארוכה מדי. יש לקצר את ההודעה או הקישור.");
  }

  const response = await fetch(SMS4FREE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify({
      key: config.key,
      user: config.user,
      pass: config.pass,
      sender: config.sender,
      recipient: phone,
      msg: text,
    }),
  });

  const responseText = await response.text().catch(() => "");

  if (!response.ok || isSms4FreeFailureText(responseText)) {
    console.error("❌ SMS4FREE SALES DOCUMENT SEND FAILED:", {
      status: response.status,
      response: responseText,
      phone,
    });

    throw new Error(responseText || "שגיאה בשליחת SMS דרך SMS4FREE");
  }

  return {
    success: true,
    provider: "sms4free",
    phone,
    parts,
    responseText,
  };
}

function normalizeDocumentForClient(document: any) {
  const obj =
    typeof document?.toObject === "function"
      ? document.toObject()
      : document || {};

  return {
    ...obj,
    _id: obj._id ? String(obj._id) : "",
    createdByUserId: obj.createdByUserId ? String(obj.createdByUserId) : null,
  };
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    await db();

    const token = await getTokenFromContext(context);

    if (!token) {
      return jsonError("קישור לא תקין", 400);
    }

    const body = await req.json().catch(() => null);

    const document = await SalesDocument.findOne({
      token,
    });

    if (!document) {
      return jsonError("המסמך לא נמצא", 404);
    }

    const documentType = cleanStr(document.get("type"));
    const currentStatus = cleanStr(document.get("status"));

    if (documentType !== "quote" && documentType !== "agreement") {
      return jsonError("סוג מסמך לא תקין", 400);
    }

    if (currentStatus === "expired") {
      return jsonError("לא ניתן לשלוח מסמך שפג תוקף", 410);
    }

    const baseUrl = getBaseUrl(req);

    const documentUrl =
      cleanStr(document.get("url")) || `${baseUrl}/sales-documents/${token}`;

    if (!cleanStr(document.get("url"))) {
      document.set("url", documentUrl);
    }

    const phoneFromBody =
      body && typeof body === "object" && !Array.isArray(body)
        ? cleanStr((body as any).phone)
        : "";

    const customMessage =
      body && typeof body === "object" && !Array.isArray(body)
        ? cleanStr((body as any).message)
        : "";

    const phoneFromDocument = cleanStr(document.get("client.phone"));
    const phone = phoneFromBody || phoneFromDocument;

    if (!phone) {
      return jsonError("חסר טלפון לקוח לשליחת SMS", 400);
    }

    const smsText =
      customMessage ||
      buildSmsText({
        type: documentType,
        link: documentUrl,
        clientName: cleanStr(document.get("client.fullName")),
      });

    let smsResult: Sms4FreeResult;

    try {
      smsResult = await sendSmsViaSms4Free({
        to: phone,
        text: smsText,
      });
    } catch (sendError) {
      const errorMessage =
        sendError instanceof Error
          ? sendError.message
          : "שגיאה בשליחת SMS";

      document.set("sms.sentTo", phone);
      document.set("sms.normalizedSentTo", normalizeSms4FreePhone(phone));
      document.set("sms.provider", "sms4free");
      document.set("sms.message", smsText);
      document.set("sms.lastError", errorMessage);
      document.set("sms.lastTriedAt", new Date());

      await document.save();

      return jsonError(errorMessage, 500);
    }

    if (currentStatus !== "signed") {
      document.set("status", "sent");
    }

    document.set("sms.sentAt", new Date());
    document.set("sms.lastTriedAt", new Date());
    document.set("sms.sentTo", phone);
    document.set("sms.normalizedSentTo", smsResult.phone);
    document.set("sms.provider", "sms4free");
    document.set("sms.parts", smsResult.parts);
    document.set("sms.message", smsText);
    document.set("sms.response", smsResult.responseText);
    document.set("sms.lastError", "");

    await document.save();

    const normalizedDocument = normalizeDocumentForClient(document);

    return NextResponse.json({
      success: true,
      message:
        documentType === "agreement"
          ? "קישור ההסכם נשלח בהצלחה ב-SMS"
          : "קישור הצעת המחיר נשלח בהצלחה ב-SMS",
      provider: "sms4free",
      sentTo: phone,
      normalizedSentTo: smsResult.phone,
      charged: smsResult.parts,
      parts: smsResult.parts,
      url: documentUrl,
      documentUrl,
      type: documentType,
      status: normalizedDocument.status,
      document: normalizedDocument,
    });
  } catch (error) {
    console.error("SEND SALES DOCUMENT SMS FAILED:", error);

    return jsonError(
      error instanceof Error ? error.message : "שגיאה בשליחת SMS",
      500,
    );
  }
}