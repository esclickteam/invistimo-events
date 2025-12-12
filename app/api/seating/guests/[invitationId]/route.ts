import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";

export const dynamic = "force-dynamic";

/* ⭐ טיפוס נכון ל־Next.js 16 */
type RouteContext = {
  params: Promise<{ invitationId: string }>;
};

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    await dbConnect();

    /* ⭐ חובה await — params הוא Promise */
    const { invitationId } = await context.params;

    const guests = await InvitationGuest.find({
      invitationId,
    }).lean();

    return NextResponse.json({
      success: true,
      guests,
    });
  } catch (err) {
    console.error("❌ Error loading seating guests:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
