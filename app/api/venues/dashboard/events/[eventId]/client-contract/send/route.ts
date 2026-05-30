import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import ClientContract from "@/models/ClientContract";
import connectDB from "@/lib/mongodb";

export const runtime = "nodejs";

function getBaseUrl(req: NextRequest) {
  const envUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "";

  if (envUrl) return envUrl.replace(/\/$/, "");

  const proto = req.headers.get("x-forwarded-proto") || "http";
  const host = req.headers.get("host") || "localhost:3000";

  return `${proto}://${host}`;
}

function buildLinks(req: NextRequest, token: string) {
  const baseUrl = getBaseUrl(req);

  return {
    signingLink: `${baseUrl}/client-contracts/sign/${token}`,
    viewLink: `${baseUrl}/client-contracts/sign/${token}?view=1`,
  };
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ eventId: string }> }
) {
  try {
    await connectDB();

    const { eventId } = await context.params;
    const body = await req.json().catch(() => ({}));

    if (!eventId) {
      return NextResponse.json(
        { success: false, message: "חסר מזהה אירוע" },
        { status: 400 }
      );
    }

    const clientPhone = String(body.clientPhone || "").trim();

    if (!clientPhone) {
      return NextResponse.json(
        { success: false, message: "חסר מספר טלפון ללקוח" },
        { status: 400 }
      );
    }

    let contract = null;

    if (body.contractId) {
      contract = await ClientContract.findOne({
        _id: String(body.contractId),
        eventId,
      });
    }

    if (!contract) {
      contract = await ClientContract.findOne({ eventId }).sort({ createdAt: -1 });
    }

    if (!contract) {
      return NextResponse.json(
        { success: false, message: "לא נמצא הסכם לשליחה. קודם צריך לשמור הסכם" },
        { status: 404 }
      );
    }

    if (contract.locked || contract.status === "signed") {
      return NextResponse.json(
        { success: false, message: "ההסכם כבר נחתם וננעל" },
        { status: 423 }
      );
    }

    if (!Array.isArray(contract.fields) || contract.fields.length === 0) {
      return NextResponse.json(
        { success: false, message: "צריך להוסיף לפחות שדה אחד להסכם" },
        { status: 400 }
      );
    }

    if (!contract.signingToken) {
      contract.signingToken = randomBytes(24).toString("hex");
    }

    if (!contract.signingTokenExpiresAt) {
      contract.signingTokenExpiresAt = new Date(
        Date.now() + 1000 * 60 * 60 * 24 * 30
      );
    }

    contract.clientPhone = clientPhone;
    contract.clientName = String(body.clientName || contract.clientName || "");
    contract.clientEmail = String(body.clientEmail || contract.clientEmail || "");
    contract.hallName = String(body.hallName || contract.hallName || "");
    contract.eventTitle = String(body.eventTitle || contract.eventTitle || "");

    contract.status = "sent";
    contract.sentAt = new Date();

    contract.auditLog.push({
      action: "contract_sent_sms",
      at: new Date(),
      ip: req.headers.get("x-forwarded-for") || "",
      userAgent: req.headers.get("user-agent") || "",
    });

    await contract.save();

    const links = buildLinks(req, contract.signingToken);

    const message = `שלום ${contract.clientName || ""}, נשלח אליך הסכם לחתימה עבור ${contract.eventTitle || "האירוע"} ב-${contract.hallName || "האולם"}: ${links.signingLink}`;

    /**
     * משתמש ב-API SMS הקיים שלך.
     * אם אצלך הנתיב שונה — תשני רק את ה-fetch הזה.
     */
    const smsRes = await fetch(`${getBaseUrl(req)}/api/sms/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: req.headers.get("cookie") || "",
      },
      body: JSON.stringify({
        phone: clientPhone,
        to: clientPhone,
        recipient: clientPhone,
        recipients: [clientPhone],
        phones: [clientPhone],

        message,
        text: message,
        content: message,

        eventId,
        hallId: contract.hallId,
        type: "client_contract_signature",
        signingLink: links.signingLink,
        provider: "4free",
      }),
    });

    const smsData = await smsRes.json().catch(() => ({}));

    if (!smsRes.ok || smsData?.success === false) {
      console.error("SMS send contract failed:", smsData);

      return NextResponse.json(
        {
          success: false,
          message: smsData?.message || smsData?.error || "שליחת ה-SMS נכשלה",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      contractId: String(contract._id),
      signingLink: links.signingLink,
      viewLink: links.viewLink,
      contract: {
        ...contract.toObject(),
        signingLink: links.signingLink,
        viewLink: links.viewLink,
      },
    });
  } catch (error) {
    console.error("POST send client contract failed:", error);

    return NextResponse.json(
      { success: false, message: "שליחת ההסכם נכשלה" },
      { status: 500 }
    );
  }
}