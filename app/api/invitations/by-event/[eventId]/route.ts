import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Invitation from "@/models/Invitation";
import Event from "@/models/Event";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    console.log("👉 [by-event] START");

    await connectDB();
    console.log("👉 DB connected");

    /* =========================
       Auth ✅ FIX
    ========================= */
    const auth = await getUserIdFromRequest(req); // 🔥 הכי חשוב
    console.log("👉 auth result:", auth);

    if (!auth?.userId) {
      console.warn("⛔ UNAUTHORIZED");
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    /* =========================
       Params
    ========================= */
    const { eventId } = await params;
    console.log("👉 eventId extracted:", eventId);

    if (!eventId) {
      console.warn("⛔ MISSING_EVENT_ID");
      return NextResponse.json(
        { success: false, error: "MISSING_EVENT_ID" },
        { status: 400 }
      );
    }

    /* =========================
       Validate ObjectId ✅ FIX
    ========================= */
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return NextResponse.json(
        { success: false, error: "INVALID_EVENT_ID" },
        { status: 400 }
      );
    }

    const eventObjectId = new mongoose.Types.ObjectId(eventId);

    /* =========================
       Load event
    ========================= */
    const event = await Event.findById(eventObjectId).lean();
    console.log("👉 event query result:", event);

    if (!event) {
      console.warn("⛔ EVENT_NOT_FOUND:", eventId);
      return NextResponse.json(
        { success: false, error: "EVENT_NOT_FOUND" },
        { status: 404 }
      );
    }

    /* =========================
       Load invitation 🔥 לפני הרשאות
    ========================= */
    const invitation = await Invitation.findOne({
      eventId: eventObjectId,
    }).lean();

    console.log("👉 invitation query result:", invitation);

    /* =========================
       Authorization ✅ משופר
    ========================= */
    const isOwner = String(event.userId) === String(auth.userId);

    const isProducer =
      auth.role === "producer" &&
      String(event.createdByProducer) === String(auth.userId);

    const isAdmin = auth.role === "admin";

    const isInvitationOwner =
      invitation &&
      String(invitation.ownerId) === String(auth.userId);

    console.log("👉 permissions:", {
      isOwner,
      isProducer,
      isAdmin,
      isInvitationOwner,
    });

    if (!isOwner && !isProducer && !isAdmin && !isInvitationOwner) {
      console.warn("⛔ FORBIDDEN");
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