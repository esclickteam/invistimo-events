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
    })
      .select({
        name: 1,
        phone: 1,
        rsvp: 1,
        guestsCount: 1,
        tableNumber: 1, // ⭐ חשוב לדשבורד
        notes: 1,       // ⭐ הערות מה־RSVP
        token: 1,
        relation: 1,
        createdAt: 1,
      })
      .lean();

    return NextResponse.json({
      success: true,
      guests,
    });
  } catch (err) {
    console.error("❌ Error loading invitation guests:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
