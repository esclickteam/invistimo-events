import { NextRequest, NextResponse } from "next/server";

import db from "@/lib/db";
import SalesDocument from "@/models/SalesDocument";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SMS4FREE_API_URL = "https://api.sms4free.co.il/ApiSMS/v2/SendSMS";

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
    return `היי ${clientName},\nמצורף קישור ל${title} עבור האירוע שלך ב-Invistimo:\n${link}`;
  }

  return `Invistimo - מצורף קישור ל${title} עבור האירוע שלך:\n${link}`;
}

function getMissingSms4FreeEnv() {
  const required = [
    "SMS4FREE_KEY",
    "SMS4FREE_USER",
    "SMS4FREE_PASS",
    "SMS4FREE_SENDER",
  ];

  return required.filter((key) => !cleanStr(process.env[key]));
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
    normalized.includes("שגיאה") ||
    normalized.includes("נכשל") ||
    normalized.includes("לא תקין")
  );
}

async function sendSmsViaSms4Free({
  to,
  text,
}: {
  to: string;
  text: string;
}) {
  const missingEnv = getMissingSms4FreeEnv();

  if (missingEnv.length > 0) {
    throw new Error(
      `חסרים משתני סביבה של SMS4FREE: ${missingEnv.join(", ")}`,
    );
  }

  const phone = normalizeSms4FreePhone(to);

  if (!phone) {
    throw new Error("מספר טלפון לא תקין");
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
      key: process.env.SMS4FREE_KEY,
      user: process.env.SMS4FREE_USER,
      pass: process.env.SMS4FREE_PASS,
      sender: process.env.SMS4FREE_SENDER,
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

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  try {
    await db();

    const { token } = await context.params;
    const cleanToken = cleanStr(token);

    if (!cleanToken) {
      return jsonError("קישור לא תקין", 400);
    }

    const body = await req.json().catch(() => null);

    const document = await SalesDocument.findOne({
      token: cleanToken,
    });

    if (!document) {
      return jsonError("המסמך לא נמצא", 404);
    }

    const documentUrl =
      cleanStr(document.url) ||
      `${req.nextUrl.origin}/sales-documents/${document.token}`;

    const phoneFromBody = cleanStr(body?.phone);
    const phoneFromDocument = cleanStr(document.client?.phone);
    const phone = phoneFromBody || phoneFromDocument;

    if (!phone) {
      return jsonError("חסר טלפון לקוח לשליחת SMS", 400);
    }

    const customMessage = cleanStr(body?.message);

    const smsText =
      customMessage ||
      buildSmsText({
        type: cleanStr(document.type),
        link: documentUrl,
        clientName: cleanStr(document.client?.fullName),
      });

    let smsResult: {
      success: boolean;
      provider: string;
      phone: string;
      parts: number;
      responseText: string;
    };

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
      document.set("sms.provider", "sms4free");
      document.set("sms.lastError", errorMessage);
      document.set("sms.lastTriedAt", new Date());

      await document.save();

      return jsonError(errorMessage, 500);
    }

    if (document.status !== "signed") {
      document.status = "sent";
    }

    document.set("sms.sentAt", new Date());
    document.set("sms.sentTo", phone);
    document.set("sms.normalizedSentTo", smsResult.phone);
    document.set("sms.provider", "sms4free");
    document.set("sms.parts", smsResult.parts);
    document.set("sms.message", smsText);
    document.set("sms.response", smsResult.responseText);
    document.set("sms.lastError", "");

    await document.save();

    return NextResponse.json({
      success: true,
      message: "הקישור נשלח בהצלחה ב-SMS",
      provider: "sms4free",
      sentTo: phone,
      normalizedSentTo: smsResult.phone,
      charged: smsResult.parts,
      parts: smsResult.parts,
      url: documentUrl,
      documentUrl,
      type: document.type,
      status: document.status,
    });
  } catch (error) {
    console.error("SEND SALES DOCUMENT SMS FAILED:", error);

    return jsonError(
      error instanceof Error ? error.message : "שגיאה בשליחת SMS",
      500,
    );
  }
}