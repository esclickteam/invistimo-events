import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Invitation from "@/models/Invitation";
import Event from "@/models/Event";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
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

    /* =========================
       Query params
    ========================= */
    const { searchParams } = new URL(req.url);
    const invitationIdFromQuery = searchParams.get("invitationId");

    const { eventId } = await params;

    if (!invitationIdFromQuery && !eventId) {
      return NextResponse.json(
        { success: false, error: "MISSING_EVENT_OR_INVITATION_ID" },
        { status: 400 }
      );
    }

    let invitation: any = null;
    let event: any = null;

    /* =========================
       1️⃣ לפי invitationId (עדיפות)
    ========================= */
    if (invitationIdFromQuery) {
      invitation = await Invitation.findById(invitationIdFromQuery).lean();

      if (!invitation) {
        return NextResponse.json(
          { success: false, error: "INVITATION_NOT_FOUND" },
          { status: 404 }
        );
      }

      if (invitation.eventId) {
        event = await Event.findById(invitation.eventId).lean();
      }

      if (!event) {
        return NextResponse.json(
          { success: false, error: "EVENT_NOT_FOUND" },
          { status: 404 }
        );
      }
    }

    /* =========================
       2️⃣ fallback לפי eventId
    ========================= */
    if (!invitation && eventId) {
      event = await Event.findById(eventId).lean();

      if (!event) {
        return NextResponse.json(
          { success: false, error: "EVENT_NOT_FOUND" },
          { status: 404 }
        );
      }

      invitation = await Invitation.findOne({ eventId }).lean();
    }

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
      Array.isArray(event.producers) &&
      event.producers.some(
        (p: any) => String(p.userId ?? p) === String(auth.userId)
      );

    const isImpersonating = auth?.impersonated === true;

    const isAdmin = auth.role === "admin";

    if (!isOwner && !isProducer && !isAdmin && !isImpersonating) {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN" },
        { status: 403 }
      );
    }

    /* =========================
       Response
    ========================= */
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