import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import SeatingTable from "@/models/SeatingTable";

type RouteContext = {
  params: { invitationId: string };
};

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    await dbConnect();

    const record = await SeatingTable.findOne({
      invitationId: params.invitationId,
    });

    return NextResponse.json({
      success: true,
      tables: record?.tables || [],
    });
  } catch (err) {
    console.error("❌ Load seating tables error:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
