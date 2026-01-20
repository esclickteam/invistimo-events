import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await dbConnect();

    /* =========================
       🔐 Auth – מפיק מחובר
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
       👥 Fetch clients
       🔑 Single Source of Truth: producerId
    ========================= */
    const clients = await User.find({
      role: "client",
      producerId: producerId,
    })
      .select(
        "name email phone guests includeCalls plan planLimits hasPaid createdAt"
      )
      .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      clients,
    });
  } catch (error) {
    console.error("❌ ERROR FETCHING PRODUCER CLIENTS:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch clients" },
      { status: 500 }
    );
  }
}
