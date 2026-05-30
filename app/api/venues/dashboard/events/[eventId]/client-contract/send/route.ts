import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import connectDB from "@/lib/mongodb";
import ClientContract from "@/models/ClientContract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getBaseUrl(req: NextRequest) {
  const envUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.APP_URL;

  if (envUrl) return envUrl.replace(/\/$/, "");

  const host = req.headers.get("host") || "";
  const proto = req.headers.get("x-forwarded-proto") || "https";

  return `${proto}://${host}`.replace(/\/$/, "");
}

function makeToken() {
  return crypto.randomBytes(32).toString("hex");
}

function normalizePhone(value: unknown) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/-/g, "");
}

function buildSmsMessage({
  hallName,
  eventTitle,
  signingLink,
}: {
  hallName: string;
  eventTitle: string;
  signingLink: string;
}) {
  const cleanHallName = hallName || "האולם";
  const cleanEventTitle = eventTitle || "האירוע";

  return (
    `שלום, ${cleanHallName} שלח אליכם הסכם לחתימה עבור ${cleanEventTitle}.\n` +
    `לחתימה על ההסכם היכנסו לקישור:\n${signingLink}`
  );
}

function serializeContract(contract: any, req: NextRequest) {
  const object =
    typeof contract?.toObject === "function" ? contract.toObject() : contract;

  const baseUrl = getBaseUrl(req);
  const token = String(object?.signingToken || "");

  const signingLink = token
    ? `${baseUrl}/client-contracts/sign/${encodeURIComponent(token)}`
    : "";

  const viewLink = token
    ? `${baseUrl}/client-contracts/sign/${encodeURIComponent(token)}?view=1`
    : "";

  return {
    ...object,
    _id: String(object?._id || object?.id || ""),
    id: String(object?._id || object?.id || ""),
    signingLink,
    viewLink,
    signedViewLink: viewLink,
  };
}

async function sendSmsThroughExistingApi({
  req,
  phone,
  message,
  eventId,
  hallId,
  signingLink,
  contractId,
}: {
  req: NextRequest;
  phone: string;
  message: string;
  eventId: string;
  hallId: string;
  signingLink: string;
  contractId: string;
}) {
  const baseUrl = getBaseUrl(req);

  const res = await fetch(`${baseUrl}/api/sms/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: req.headers.get("cookie") || "",
    },
    body: JSON.stringify({
      phone,
      to: phone,
      recipient: phone,
      recipients: [phone],
      phones: [phone],

      message,
      text: message,
      content: message,

      eventId,
      hallId,
      contractId,
      type: "client_contract_signature",
      signingLink,
      contractSigningLink: signingLink,
      provider: "4free",
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || data?.success === false) {
    throw new Error(data?.message || data?.error || "שליחת ה-SMS נכשלה");
  }

  return data;
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ eventId: string }> }
) {
  try {
    await connectDB();

    const { eventId } = await context.params;

    if (!eventId) {
      return NextResponse.json(
        { success: false, message: "חסר מזהה אירוע" },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));

    const contractId = String(body?.contractId || "").trim();
    const hallId = String(body?.hallId || "").trim();
    const hallName = String(body?.hallName || "").trim();
    const eventTitle = String(body?.eventTitle || "").trim();
    const clientPhone = normalizePhone(body?.clientPhone);

    if (!contractId) {
      return NextResponse.json(
        { success: false, message: "חסר מזהה הסכם" },
        { status: 400 }
      );
    }

    if (!clientPhone) {
      return NextResponse.json(
        { success: false, message: "אין מספר טלפון לשליחת SMS" },
        { status: 400 }
      );
    }

    const contract = await ClientContract.findOne({
      _id: contractId,
      eventId,
    });

    if (!contract) {
      return NextResponse.json(
        { success: false, message: "ההסכם לא נמצא" },
        { status: 404 }
      );
    }

    if (contract.locked || contract.status === "signed" || contract.status === "locked") {
      return NextResponse.json(
        { success: false, message: "ההסכם כבר נחתם ונעול לצפייה בלבד" },
        { status: 423 }
      );
    }

    if (!contract.signingToken) {
      contract.signingToken = makeToken();
    }

    contract.status = "sent";
    contract.sentAt = new Date();

    if (hallId && !contract.hallId) contract.hallId = hallId;
    if (hallName) contract.hallName = hallName;
    if (eventTitle) contract.eventTitle = eventTitle;
    if (clientPhone) contract.clientPhone = clientPhone;

    await contract.save();

    const serialized = serializeContract(contract, req);
    const signingLink = serialized.signingLink;

    if (!signingLink) {
      return NextResponse.json(
        { success: false, message: "לא נוצר קישור חתימה" },
        { status: 500 }
      );
    }

    const smsMessage =
      String(body?.message || "").trim() ||
      buildSmsMessage({
        hallName: String(contract.hallName || hallName || ""),
        eventTitle: String(contract.eventTitle || eventTitle || ""),
        signingLink,
      });

    const smsResult = await sendSmsThroughExistingApi({
      req,
      phone: clientPhone,
      message: smsMessage,
      eventId,
      hallId: String(contract.hallId || hallId || ""),
      signingLink,
      contractId: serialized.id,
    });

    return NextResponse.json({
      success: true,
      message: "קישור החתימה נשלח ללקוח ב-SMS",
      smsResult,
      contract: serialized,
      clientContract: serialized,
      contractId: serialized.id,
      signingLink: serialized.signingLink,
      viewLink: serialized.viewLink,
    });
  } catch (error) {
    console.error("POST send client contract sms failed:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? `שליחת ההסכם נכשלה: ${error.message}`
            : "שליחת ההסכם נכשלה",
      },
      { status: 500 }
    );
  }
}