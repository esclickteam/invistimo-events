import { NextResponse } from "next/server";
import db from "@/lib/db";
import Invitation from "@/models/Invitation";
import { nanoid } from "nanoid";

export async function POST(req: Request) {
  try {
    await db();
    const body = await req.json();
    const { title, canvasData } = body;

    if (!canvasData) {
      return NextResponse.json({ error: "Missing canvas data" }, { status: 400 });
    }

    const shareId = nanoid(10);

    const newInvite = await Invitation.create({
      title: title || "Untitled Invitation",
      canvasData,
      shareId,
      guests: [],
    });

    return NextResponse.json({ success: true, invitation: newInvite }, { status: 201 });
  } catch (err) {
    console.error("❌ Error creating invitation:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
