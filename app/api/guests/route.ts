import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Guest from "@/models/Guest";

export async function GET() {
  try {
    await connectDB();
    const guests = await Guest.find().sort({ createdAt: -1 });
    return NextResponse.json({ guests });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();

    const guest = await Guest.create({
      name: body.name,
      phone: body.phone,
      rsvp: "pending",
    });

    return NextResponse.json({ guest });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
