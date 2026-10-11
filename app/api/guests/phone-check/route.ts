import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import Invitation from "@/models/Invitation";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { inspectPhoneAvailability } from "@/lib/guestPhonePolicy";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const invitationId = String(body?.invitationId || "").trim();

    if (!invitationId) {
      return NextResponse.json(
        { success: false, error: "Missing invitationId" },
        { status: 400 }
      );
    }

    await db();

    const auth = await getUserIdFromRequest(req);
    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const invitation = await Invitation.findById(invitationId)
      .select("_id ownerId producerId")
      .lean();

    if (!invitation) {
      return NextResponse.json(
        { success: false, error: "NO_INVITATION" },
        { status: 404 }
      );
    }

    const userId = String(auth.userId);
    const canAccess =
      (invitation as { ownerId?: { toString(): string } }).ownerId?.toString() ===
        userId ||
      (invitation as { producerId?: { toString(): string } }).producerId?.toString() ===
        userId;

    if (!canAccess) {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const result = await inspectPhoneAvailability({
      invitationId,
      phone: body?.phone,
      excludeGuestId: body?.excludeGuestId,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("phone-check error", error);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
