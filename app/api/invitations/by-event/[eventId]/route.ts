import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Invitation from "@/models/Invitation";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
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
       Query params (חובה!)
    ========================= */
    const { searchParams } = new URL(req.url);
    const invitationId = searchParams.get("invitationId");

    if (!invitationId) {
      return NextResponse.json(
        { success: false, error: "MISSING_INVITATION_ID" },
        { status: 400 }
      );
    }

    /* =========================
       Load invitation
    ========================= */
    const invitation = await Invitation.findById(invitationId).lean();

    if (!invitation) {
      return NextResponse.json(
        { success: false, error: "INVITATION_NOT_FOUND" },
        { status: 404 }
      );
    }

    /* =========================
       Authorization
    ========================= */
    const isOwner =
      String(invitation.ownerId) === String(auth.userId);

    const isProducer =
      auth.role === "producer" &&
      String(invitation.producerId ?? "") === String(auth.userId);

    const isAdmin = auth.role === "admin";
    const isImpersonating = auth?.impersonated === true;

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
      invitation,
    });
  } catch (err) {
    console.error("❌ GET invitation failed:", err);

    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}