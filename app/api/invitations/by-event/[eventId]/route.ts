import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Invitation from "@/models/Invitation";
import Event from "@/models/Event";
import User from "@/models/User";
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
       Auth
    ========================= */
    const auth = await getUserIdFromRequest(req);
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
       Validate ObjectId
    ========================= */
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      console.warn("⛔ INVALID_EVENT_ID:", eventId);
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
       Load invitation
    ========================= */
    const invitation = await Invitation.findOne({
      eventId: eventObjectId,
    }).lean();

    console.log("👉 invitation query result:", invitation);

    /* =========================
       Load event owner user
    ========================= */
    const eventOwner = await User.findById(event.userId)
      .select("_id assignedProducerId")
      .lean();

    console.log("👉 eventOwner query result:", eventOwner);

    /* =========================
       Authorization
       ✅ producer מורשה לפי assignedProducerId של הלקוח
    ========================= */
    const isOwner = String(event.userId) === String(auth.userId);

    const isProducerByClient =
      auth.role === "producer" &&
      !!eventOwner &&
      String(eventOwner.assignedProducerId) === String(auth.userId);

    const isAdmin = auth.role === "admin";

    const isInvitationOwner =
      !!invitation &&
      String(invitation.ownerId) === String(auth.userId);

    console.log("👉 auth.userId:", String(auth.userId));
    console.log("👉 auth.role:", auth.role);
    console.log("👉 event.userId:", String(event.userId));
    console.log(
      "👉 eventOwner.assignedProducerId:",
      eventOwner ? String(eventOwner.assignedProducerId) : null
    );
    console.log(
      "👉 invitation.ownerId:",
      invitation ? String(invitation.ownerId) : null
    );

    console.log("👉 permissions:", {
      isOwner,
      isProducerByClient,
      isAdmin,
      isInvitationOwner,
    });

    if (!isOwner && !isProducerByClient && !isAdmin && !isInvitationOwner) {
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