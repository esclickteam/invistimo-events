import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Invitation from "@/models/Invitation";
import Event from "@/models/Event";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> } // ✅ Promise
) {
  try {
    await connectDB();

    /* =========================
       Auth
    ========================= */
    const auth = await getUserIdFromRequest();
    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const { eventId } = await params; // ✅ await
    if (!eventId) {
      return NextResponse.json(
        { success: false, error: "MISSING_EVENT_ID" },
        { status: 400 }
      );
    }

    /* =========================
       Load event
    ========================= */
    const event = await Event.findById(eventId).lean();
    if (!event) {
      return NextResponse.json(
        { success: false, error: "EVENT_NOT_FOUND" },
        { status: 404 }
      );
    }

    /* =========================
       Authorization
    ========================= */
    const isOwner = String(event.userId) === String(auth.userId);
    const isProducer =
      auth.role === "producer" &&
      String(event.createdByProducer) === String(auth.userId);
    const isAdmin = auth.role === "admin";

    if (!isOwner && !isProducer && !isAdmin) {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN" },
        { status: 403 }
      );
    }

    /* =========================
       Load invitation
    ========================= */
    const invitation = await Invitation.findOne({
  eventId: event._id,
}).lean();

    return NextResponse.json({
      success: true,
      invitation: invitation || null,
    });
  } catch (err) {
    console.error("❌ GET /api/invitations/by-event failed:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
