import { NextResponse } from "next/server";
import db from "@/lib/db";
import Guest from "@/models/Guest";

export const dynamic = "force-dynamic"; // מבטל cache ב־App Router

// ❗ טיפוס context מוחלש ל-any כדי לעקוף את הבאג של Next לגבי params = Promise<{}>
export async function POST(req: Request, context: any) {
  try {
    await db();
    const body = await req.json();
    const { name, phone } = body;

    if (!name || !phone) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const id = context?.params?.id;
    if (!id) {
      return NextResponse.json({ error: "Missing invitation id" }, { status: 400 });
    }

    const guest = await Guest.create({
      name,
      phone,
      invitationId: id,
      rsvp: "pending",
    });

    return NextResponse.json({ success: true, guest }, { status: 201 });
  } catch (err) {
    console.error("❌ Error in POST /api/invitations/[id]/guests:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
