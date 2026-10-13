import { NextRequest, NextResponse } from "next/server";
import jwt, { JwtPayload } from "jsonwebtoken";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { sendPasswordSetupMail } from "@/lib/sendPasswordSetupMail";
import {
  buildProducerClientPasswordSms,
  passwordSmsStatusPatch,
} from "@/lib/producerBilling/passwordSms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AuthTokenPayload = JwtPayload & {
  userId?: string;
  id?: string;
  _id?: string;
  role?: string;
};

type CreateClientBody = {
  email: string;
  name: string;
  phone?: string;
  guests: number;
  includeCalls?: boolean;
};

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const producerToken = req.cookies.get("producerAuthToken")?.value ?? null;
    const authToken = req.cookies.get("authToken")?.value ?? null;
    const token = producerToken || authToken;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let decoded: AuthTokenPayload;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!) as AuthTokenPayload;
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const producerId = decoded.userId || decoded.id || decoded._id;
    if (!producerId) {
      return NextResponse.json(
        { error: "Invalid token payload" },
        { status: 401 },
      );
    }

    await connectDB();

    const producer = await User.findById(producerId);
    if (!producer || producer.role !== "producer") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let body: CreateClientBody;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const email = String(body.email || "").trim().toLowerCase();
    const name = String(body.name || "").trim();
    const phone = String(body.phone || "").trim();
    const records = Number(body.guests);

    if (!email || !name || !Number.isFinite(records) || records <= 0) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const existingUser = await User.findOne({ email }).select("_id").lean();
    if (existingUser) {
      return NextResponse.json(
        { error: "EMAIL_ALREADY_EXISTS" },
        { status: 409 },
      );
    }

    const pricePerRecord = Math.max(
      0,
      Number(producer.producerPricePerRecord || 0),
    );

    const clientUser = await User.create({
      name,
      email,
      phone,

      role: "client",

      assignedProducerId: producer._id,
      assignedProducerIds: [producer._id],
      createdByProducer: producer._id,
      billingSource: "producer",

      guests: records,
      smsPerRecord: 3,
      maxMessages: records * 3,
      includeCalls: !!body.includeCalls,

      paidAmount: 0,
      isActive: true,
      needsPasswordSetup: true,

      producerBilling: {
        grantAccessBeforePayment: true,
        payerProducerId: producer._id,
        pricePerRecord,
        initialRecords: records,
        finalRecords: records,
        finalRecordsConfirmed: true,
        payments: [],
        history: [],
      },
    });

    try {
      const { recordNewCustomer } = await import(
        "@/lib/customerNotifications/adminCenterLive"
      );
      await recordNewCustomer({
        customerId: String(clientUser._id),
        name,
        role: "client",
      });
    } catch (notifyError) {
      console.error("new customer notice failed", notifyError);
    }

    const passwordSms = await deliverProducerPasswordSms(String(clientUser._id));

    return NextResponse.json({
      success: true,
      clientId: String(clientUser._id),
      passwordSms,
    });
  } catch (err) {
    console.error("create-client error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

async function deliverProducerPasswordSms(userId: string) {
  const now = new Date();
  try {
    const delivery = await sendPasswordSetupMail(userId, {
      message: (link) => buildProducerClientPasswordSms(link),
    });

    if (delivery.smsSent) {
      await User.updateOne(
        { _id: userId },
        passwordSmsStatusPatch({ status: "sent", now, countAttempt: true }) as any,
      );
      return { status: "sent" as const, error: null };
    }

    const missingPhone = delivery.smsError === "MISSING_PHONE_FOR_PASSWORD_SMS";
    const status = missingPhone ? "missing_phone" : "failed";
    await User.updateOne(
      { _id: userId },
      passwordSmsStatusPatch({
        status,
        error: delivery.smsError || "SMS_FAILED",
        now,
        countAttempt: false,
      }) as any,
    );
    return { status, error: delivery.smsError || "SMS_FAILED" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    try {
      await User.updateOne(
        { _id: userId },
        passwordSmsStatusPatch({
          status: "failed",
          error: message,
          now,
          countAttempt: false,
        }) as any,
      );
    } catch (updateError) {
      console.error("password sms status save failed", updateError);
    }
    return { status: "failed" as const, error: message };
  }
}
