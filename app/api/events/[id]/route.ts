import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Event from "@/models/Event";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  await dbConnect();

  const auth = await getUserIdFromRequest(req);
  if (!auth?.userId) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    );
  }

  const event = await Event.findById(params.id).lean();

  if (!event) {
    return NextResponse.json(
      { success: false, message: "Event not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    event,
  });
}
