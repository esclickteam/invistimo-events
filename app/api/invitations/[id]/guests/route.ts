import { NextResponse } from "next/server";
import db from "@/lib/db";
import Guest from "@/models/Guest";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    await db();
    const body = await req.json();
    const { name, phone } = body;

    if (!name || !phone) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const guest = await Guest.create({
      name,
      phone,
      invitationId: params.id,
      rsvp: "pending",
    });

    return NextResponse.json({ success: true, guest }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
