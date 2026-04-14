import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Invitation from "@/models/Invitation";
import Event from "@/models/Event";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> } // נשאר כמו שביקשת
) {
  try {
    console.log("👉 [by-event] START");

    await connectDB();
    console.log("👉 DB connected");

    /* =========================
       Auth
    ========================= */
    const auth = await getUserIdFromRequest();
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
    console.log("👉 raw params:", params);

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
       Load event
    ========================= */
    const event = await Event.findById(eventId).lean();
    console.log("👉 event query result:", event);

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
      eventUserId: event.userId,
      authUserId: auth.userId,
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
    const invitation = await Invitation.findOne({ eventId }).lean();
    console.log("👉 invitation query result:", invitation);

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