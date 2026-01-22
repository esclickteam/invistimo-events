import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Invitation from "@/models/Invitation";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await dbConnect();

    /* =========================
       🔐 Auth – Producer only
    ========================= */
    const auth = await getUserIdFromRequest();

    if (!auth?.userId || auth.role !== "producer") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const producerId = auth.userId;

    /* =========================
       📩 Fetch Invitations (SOURCE OF TRUTH)
    ========================= */
    const invitations = await Invitation.find({
      producerId,
    })
      .select(`
        fullName
        email
        phone
        eventDate
        eventLocation
        status
        createdAt
      `)
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      clients: invitations,
    });
  } catch (error) {
    console.error("❌ ERROR FETCHING PRODUCER CLIENTS:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch clients" },
      { status: 500 }
    );
  }
}
