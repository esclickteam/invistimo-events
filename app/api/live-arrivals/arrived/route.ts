import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import LiveArrival from "@/models/LiveArrival";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

type PatchBody = {
  invitationId: string;
  guestId: string;
  arrivedCount: number;
};

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();

    // 🔐 אימות – חייב להיות מחובר
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = (await req.json()) as PatchBody;
    const { invitationId, guestId, arrivedCount } = body;

    if (!invitationId || !guestId) {
      return NextResponse.json(
        { error: "Missing invitationId or guestId" },
        { status: 400 }
      );
    }

    const count = Math.max(0, Number(arrivedCount || 0));

    const doc = await LiveArrival.findOneAndUpdate(
      { invitationId, guestId },
      {
        $set: {
          arrivedCount: count,
          arrivedAt: count > 0 ? new Date() : null,
          updatedBy: userId,
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    ).lean();

    return NextResponse.json({
      success: true,
      arrivedCount: doc?.arrivedCount ?? 0,
    });
  } catch (e) {
    console.error("❌ PATCH /api/live-arrivals/arrived failed:", e);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
