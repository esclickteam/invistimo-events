import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import WhatsappQueue from "@/models/tempQueue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const invitationId = searchParams.get("invitationId");

    if (!invitationId) {
      return NextResponse.json(
        { success: false, error: "MISSING_INVITATION_ID" },
        { status: 400 }
      );
    }

    await db();

    const [
      total,
      delivered,
      failed,
      sent,
      pending,
    ] = await Promise.all([
      WhatsappQueue.countDocuments({ invitationId }),

      WhatsappQueue.countDocuments({
        invitationId,
        status: "delivered",
      }),

      WhatsappQueue.countDocuments({
        invitationId,
        status: "failed",
      }),

      WhatsappQueue.countDocuments({
        invitationId,
        status: "sent",
      }),

      WhatsappQueue.countDocuments({
        invitationId,
        status: { $in: ["pending", "sending"] },
      }),
    ]);

     return NextResponse.json({
      success: true,
      total,
      delivered,
      failed,
      sent,
      pending,
    });
  } catch (err: any) {
    console.error("❌ WHATSAPP STATS ERROR:", err);
    return NextResponse.json(
      { success: false, error: "STATS_FAILED" },
      { status: 500 }
    );
  }
}
