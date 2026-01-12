import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Event from "@/models/Event";
import { getUserIdFromRequest } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    await connectDB();
    const userId = await getUserIdFromRequest(req);

    const event = await Event.findOne({ userId });
    return NextResponse.json(event || {});
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const userId = await getUserIdFromRequest(req);
    const body = await req.json();

    let event = await Event.findOne({ userId });

    if (!event) {
      event = await Event.create({ userId, ...body });
    } else {
      await event.updateOne(body);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
