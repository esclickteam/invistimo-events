import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await dbConnect();

    const auth = await getUserIdFromRequest();
    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const producerId = auth.userId;

    const clients = await User.find({
      role: "client",
      createdByProducer: producerId, // ⭐ זה השדה שכבר יש לך
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
