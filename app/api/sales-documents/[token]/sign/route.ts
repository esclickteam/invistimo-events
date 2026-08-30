import { NextRequest, NextResponse } from "next/server";

import db from "@/lib/db";
import SalesDocument from "@/models/SalesDocument";
import CustomerAgreement from "@/models/CustomerAgreement";
import EmployeeSale from "@/models/EmployeeSale";
import User from "@/models/User";
import { sanitizeSalesDocumentForCustomer } from "@/lib/salesDocumentTerms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params:
    | {
        token: string;
      }
    | Promise<{
        token: string;
      }>;
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

function normalizePhone(value: unknown) {
  return cleanStr(value).replace(/[^\d+]/g, "");
}

function parseDateInput(value: unknown) {
  const str = cleanStr(value);

  if (!str) return null;

  const parts = str.split("-").map((part) => Number(part));

  if (
    parts.length === 3 &&
    Number.isFinite(parts[0]) &&
    Number.isFinite(parts[1]) &&
    Number.isFinite(parts[2])
  ) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  const date = new Date(str);

  if (!Number.isNaN(date.getTime())) {
    return date;
  }

  return null;
}

function getTodayDateInputValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getClientIp(req: NextRequest) {
  const forwardedFor = cleanStr(req.headers.get("x-forwarded-for"));

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "";
  }

  return (
    cleanStr(req.headers.get("x-real-ip")) ||
    cleanStr(req.headers.get("cf-connecting-ip")) ||
    ""
  );
}

async function getTokenFromContext(context: RouteContext) {
  const params = await context.params;
  return cleanStr(params?.token);
}

function getSignatureText(body: any) {
  return (
    cleanStr(body?.signatureText) ||
    cleanStr(body?.signature) ||
    cleanStr(body?.signatureValue)
  );
}

function getSignatureDataUrl(body: any) {
  const dataUrl =
    cleanStr(body?.signatureDataUrl) ||
    cleanStr(body?.signatureImage) ||
    cleanStr(body?.drawnSignature);

  if (!dataUrl) return "";

  if (dataUrl.startsWith("data:image/")) return dataUrl;

  return "";
}

function normalizeSignedDocumentForClient(document: any) {
  const obj =
    typeof document?.toObject === "function"
      ? document.toObject()
      : document || {};

  return sanitizeSalesDocumentForCustomer({
    ...obj,
    _id: obj._id ? String(obj._id) : "",
    createdByUserId: obj.createdByUserId ? String(obj.createdByUserId) : null,
  });
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    await db();

    const token = await getTokenFromContext(context);

    if (!token) {
      return jsonError("קישור לא תקין", 400);
    }

    const body = await req.json().catch(() => null);

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return jsonError("בקשה לא תקינה", 400);
    }

    const document = await SalesDocument.findOne({ token });

    if (!document) {
      return jsonError("המסמך לא נמצא", 404);
    }

    const documentType = cleanStr(document.get("type"));
    const currentStatus = cleanStr(document.get("status"));

    if (documentType !== "agreement") {
      return jsonError(
        "לא ניתן לחתום על הצעת מחיר. חתימה זמינה רק בהסכם.",
        400,
      );
    }

    if (currentStatus === "signed") {
      return jsonError("ההסכם כבר נחתם", 409, {
        signedAt:
          document.get("signature.signedAt") ||
          document.get("agreement.signedAt") ||
          document.get("signedAt"),
      });
    }

    if (currentStatus === "expired") {
      return jsonError("הקישור אינו פעיל", 410);
    }

    const fullName =
      cleanStr((body as any).fullName) ||
      cleanStr((body as any).signatureFullName) ||
      cleanStr(document.get("client.fullName"));

    const idNumber =
      cleanStr((body as any).idNumber) ||
      cleanStr((body as any).signatureIdNumber) ||
      cleanStr(document.get("client.idNumber"));

    const address =
      cleanStr((body as any).address) ||
      cleanStr((body as any).signatureAddress) ||
      cleanStr(document.get("client.address"));

    const phone =
      cleanStr((body as any).phone) ||
      cleanStr((body as any).signaturePhone) ||
      cleanStr(document.get("client.phone"));

    const signatureDate =
      cleanStr((body as any).date) ||
      cleanStr((body as any).signatureDate) ||
      getTodayDateInputValue();

    const signatureDataUrl = getSignatureDataUrl(body as any);

    if (!fullName) return jsonError("חסר שם מלא", 400);
    if (!phone) return jsonError("חסר מספר טלפון", 400);

    if (normalizePhone(phone).length < 9) {
      return jsonError("מספר הטלפון לא תקין", 400);
    }

    if (!parseDateInput(signatureDate)) {
      return jsonError("תאריך החתימה לא תקין", 400);
    }

    if (!signatureDataUrl) {
      return jsonError("יש לחתום בציור", 400);
    }

    const signedAt = new Date();
    const signedIp = getClientIp(req);
    const signedUserAgent = cleanStr(req.headers.get("user-agent"));

    document.set("status", "signed");
    document.set("signedAt", signedAt);

    document.set("signature.fullName", fullName);
    document.set("signature.idNumber", idNumber);
    document.set("signature.address", address);
    document.set("signature.phone", phone);
    document.set("signature.date", signatureDate);
    document.set("signature.signatureText", "");
    document.set("signature.signatureDataUrl", signatureDataUrl);
    document.set("signature.acceptedTerms", true);
    document.set("signature.signedAt", signedAt);
    document.set("signature.ip", signedIp);
    document.set("signature.userAgent", signedUserAgent);
    document.set("signature.signedIp", signedIp);
    document.set("signature.signedUserAgent", signedUserAgent);

    document.set("agreement.signatureFullName", fullName);
    document.set("agreement.signatureIdNumber", idNumber);
    document.set("agreement.signatureAddress", address);
    document.set("agreement.signaturePhone", phone);
    document.set("agreement.signatureDate", signatureDate);
    document.set("agreement.signatureText", "");
    document.set("agreement.signatureDataUrl", signatureDataUrl);
    document.set("agreement.acceptedTerms", true);
    document.set("agreement.signedAt", signedAt);

    if (!cleanStr(document.get("client.fullName"))) {
      document.set("client.fullName", fullName);
    }

    if (!cleanStr(document.get("client.idNumber"))) {
      document.set("client.idNumber", idNumber);
    }

    if (!cleanStr(document.get("client.address"))) {
      document.set("client.address", address);
    }

    if (!cleanStr(document.get("client.phone"))) {
      document.set("client.phone", phone);
    }

    document.set("audit.signedAt", signedAt);
    document.set("audit.signedIp", signedIp);
    document.set("audit.signedUserAgent", signedUserAgent);

    await document.save();

    const customerAgreement = await CustomerAgreement.findOneAndUpdate(
      { publicToken: token },
      {
        $set: {
          status: "signed",
          signedAt,

          signerName: fullName,
          signerIdNumber: idNumber,
          signerEmail: cleanStr(document.get("client.email")),
          signerPhone: phone,

          signatureText: "",
          signatureImageUrl: signatureDataUrl,

          ipAddress: signedIp,
        },
      },
      {
        new: true,
      },
    );

    if (!customerAgreement) {
      console.warn("CUSTOMER AGREEMENT NOT FOUND FOR SIGNED SALES DOCUMENT:", {
        token,
        salesDocumentId: String(document._id),
      });
    }

    await User.updateOne(
      { onboardingAgreementToken: token },
      {
        $set: {
          onboardingAgreementSignedAt: signedAt,
        },
      },
    );

    await EmployeeSale.updateOne(
      { agreementToken: token },
      {
        $set: {
          agreementStatus: "signed",
          agreementSignedAt: signedAt,
          signedAgreementToken: token,
        },
      },
    );

    const normalizedDocument = normalizeSignedDocumentForClient(document);

    return NextResponse.json({
      success: true,
      message: "ההסכם נחתם ונשמר בהצלחה",
      status: "signed",
      signedAt: signedAt.toISOString(),
      customerAgreementId: customerAgreement
        ? String((customerAgreement as any)._id)
        : "",
      document: normalizedDocument,
    });
  } catch (error) {
    console.error("SIGN SALES DOCUMENT FAILED:", error);

    return jsonError(
      error instanceof Error ? error.message : "שגיאה בשמירת החתימה",
      500,
    );
  }
}