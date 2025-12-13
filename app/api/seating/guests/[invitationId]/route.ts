import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";

export const dynamic = "force-dynamic";

/* ============================================================
   GET – Load guests by invitationId
   Next.js 16 (params is Promise)
============================================================ */
type RouteContext = {
  params: Promise<{
    invitationId: string;
  }>;
};

export async function GET(
  req: NextRequest,
  context: RouteContext
) {
  try {
    await dbConnect();

    /* ⭐ params הוא Promise ב־Next 16 */
    const { invitationId } = await context.params;

    if (!invitationId) {
      return NextResponse.json(
        { success: false, guests: [] },
        { status: 400 }
      );
    }

    const guests = await InvitationGuest.find({
      invitationId,
    })
      .lean()
      .exec();

    return NextResponse.json({
      success: true,
      guests: Array.isArray(guests) ? guests : [],
    });
  } catch (err) {
    console.error("❌ Error loading seating guests:", err);
    return NextResponse.json(
      { success: false, guests: [], error: "Server error" },
      { status: 500 }
    );
  }
}
