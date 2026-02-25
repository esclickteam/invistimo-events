import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import db from "@/lib/db";
import WhatsappQueue from "@/models/WhatsappQueue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const invitationIdParam = searchParams.get("invitationId");

    if (!invitationIdParam) {
      return NextResponse.json(
        { success: false, error: "MISSING_INVITATION_ID" },
        { status: 400 }
      );
    }

    if (!Types.ObjectId.isValid(invitationIdParam)) {
      return NextResponse.json(
        { success: false, error: "INVALID_INVITATION_ID" },
        { status: 400 }
      );
    }

    await db();

    const invitationId = new Types.ObjectId(invitationIdParam);

    // 🔥 זה העקיפה הנכונה והיחידה
    const filter = { invitationId } as any;

    const [total, sent, failed, pending] = await Promise.all([
      WhatsappQueue.countDocuments(filter),

      WhatsappQueue.countDocuments({
        ...filter,
        status: "sent",
      }),

      WhatsappQueue.countDocuments({
        ...filter,
        status: "failed",
      }),

      WhatsappQueue.countDocuments({
        ...filter,
        status: { $in: ["pending", "sending"] },
      }),
    ]);

    return NextResponse.json({
      success: true,
      total,
      sent,
      failed,
      pending,
    });
  } catch (err) {
    console.error("❌ WHATSAPP STATS ERROR:", err);
    return NextResponse.json(
      { success: false, error: "STATS_FAILED" },
      { status: 500 }
    );
  }
}