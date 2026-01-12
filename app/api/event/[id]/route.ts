import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Event from "@/models/Event";
import { getUserIdFromRequest } from "@/lib/auth";

type Params = {
  params: { id: string };
};

export async function PUT(req: Request, { params }: Params) {
  try {
    await connectDB();
    const userId = await getUserIdFromRequest(req);
    const body = await req.json();

    const event = await Event.findOneAndUpdate(
      { _id: params.id, userId }, // אבטחה: רק בעל האירוע
      body,
      { new: true }
    );

    if (!event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, event });
  } catch (err) {
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
