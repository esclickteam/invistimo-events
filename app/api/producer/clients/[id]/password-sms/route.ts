import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import User from "@/models/User";
import { sendPasswordSetupMail } from "@/lib/sendPasswordSetupMail";
import {
  buildProducerClientPasswordSms,
  evaluatePasswordSmsRateLimit,
  passwordSmsStatusPatch,
} from "@/lib/producerBilling/passwordSms";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await connectDB();
    const auth = await getUserIdFromRequest(req);
    if (!auth?.userId || auth.role !== "producer") {
      return NextResponse.json({ success: false, error: "FORBIDDEN" }, { status: 403 });
    }

    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "NOT_FOUND" }, { status: 404 });
    }

    const producerId = new mongoose.Types.ObjectId(auth.userId);
    const client = await User.findOne({
      _id: id,
      role: { $in: ["client", "user"] },
      $or: [
        { assignedProducerId: producerId },
        { assignedProducerIds: producerId },
      ],
    }).select("_id phone producerBilling.passwordSms");

    if (!client) {
      return NextResponse.json({ success: false, error: "NOT_FOUND" }, { status: 404 });
    }

    const decision = evaluatePasswordSmsRateLimit(client.producerBilling?.passwordSms as any);
    if (!decision.ok) {
      return NextResponse.json(
        { success: false, error: decision.code },
        { status: 429 },
      );
    }

    const now = new Date();
    await User.updateOne(
      { _id: client._id },
      {
        $set: { "producerBilling.passwordSms.lastAttemptAt": now },
      },
    );

    const delivery = await sendPasswordSetupMail(String(client._id), {
      message: (link) => buildProducerClientPasswordSms(link),
    });

    if (delivery.smsSent) {
      await User.updateOne(
        { _id: client._id },
        passwordSmsStatusPatch({ status: "sent", now, countAttempt: true }) as any,
      );
      return NextResponse.json({ success: true, passwordSms: { status: "sent" } });
    }

    const missingPhone = delivery.smsError === "MISSING_PHONE_FOR_PASSWORD_SMS";
    const status = missingPhone ? "missing_phone" : "failed";
    await User.updateOne(
      { _id: client._id },
      passwordSmsStatusPatch({
        status,
        error: delivery.smsError || "SMS_FAILED",
        now,
        countAttempt: false,
      }) as any,
    );

    return NextResponse.json({
      success: true,
      passwordSms: { status, error: delivery.smsError || "SMS_FAILED" },
    });
  } catch (err) {
    console.error("producer password sms failed", err);
    return NextResponse.json({ success: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
