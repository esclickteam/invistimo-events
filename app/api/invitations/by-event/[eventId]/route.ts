import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Invitation from "@/models/Invitation";
import Event from "@/models/Event";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    console.log("👉 [by-event] START");

    await connectDB();

    /* =========================
       Auth
    ========================= */
    const auth = await getUserIdFromRequest(req);

    console.log("👉 auth:", auth);

    if (!auth?.userId) {
      console.warn("⛔ UNAUTHORIZED");
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const { eventId } = params;

    console.log("👉 eventId from params:", eventId);

    if (!eventId) {
      console.warn("⛔ MISSING_EVENT_ID");
      return NextResponse.json(
        { success: false, error: "MISSING_EVENT_ID" },
        { status: 400 }
      );
    }

    /* =========================
       ✅ בדיקה קריטית ל־ObjectId
    ========================= */
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      console.warn("⛔ INVALID_OBJECT_ID:", eventId);
      return NextResponse.json(
        { success: false, error: "INVALID_EVENT_ID" },
        { status: 400 }
      );
    }

    /* =========================
       Load event
    ========================= */
    const event = await Event.findById(eventId).lean();

    console.log("👉 event found:", event);

    if (!event) {
      console.warn("⛔ EVENT_NOT_FOUND:", eventId);
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

    console.log("👉 permissions:", {
      isOwner,
      isProducer,
      isAdmin,
    });

    if (!isOwner && !isProducer && !isAdmin) {
      console.warn("⛔ FORBIDDEN");
      return NextResponse.json(
        { success: false, error: "FORBIDDEN" },
        { status: 403 }
      );
    }

    /* =========================
       Load invitation
    ========================= */
    const invitation = await Invitation.findOne({
      eventId: event._id, // ✅ החשוב
    }).lean();

    console.log("👉 invitation found:", invitation);

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