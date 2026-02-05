import { NextResponse, NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import ScheduledMessage from "@/models/ScheduledMessage";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

/* ======================================================
   PATCH – Edit Scheduled Message
====================================================== */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await dbConnect();

  /* ================= AUTH ================= */
  const cookieStore = await cookies();
  const token = cookieStore.get("authToken")?.value;

  if (!token) {
    return NextResponse.json(
      { success: false, error: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  let decoded: any;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET!);
  } catch {
    return NextResponse.json(
      { success: false, error: "INVALID_TOKEN" },
      { status: 401 }
    );
  }

  /* ================= PARAMS ================= */
  const { id } = await context.params;

  /* ================= BODY ================= */
  const { text, scheduledAt } = await request.json();

  if (!text || !scheduledAt) {
    return NextResponse.json(
      { success: false, error: "MISSING_PARAMS" },
      { status: 400 }
    );
  }

  /* ================= VALIDATE TEMPLATE ================= */
// ❌ אסור לשמור מספר שולחן קשיח (שולחן 5, שולחן 12 וכו')
const forbiddenTableLiteral = /שולחן\s+\d+/;

if (forbiddenTableLiteral.test(text)) {
  return NextResponse.json(
    {
      success: false,
      error: "INVALID_TEMPLATE",
      message: "אין לשמור מספר שולחן בטקסט. השתמש/י ב־placeholder.",
    },
    { status: 400 }
  );
}


  const msg = await ScheduledMessage.findOne({
    _id: id,
    userId: decoded.userId,
    status: "scheduled",
  });

  if (!msg) {
    return NextResponse.json(
      { success: false, error: "NOT_FOUND_OR_LOCKED" },
      { status: 404 }
    );
  }

  msg.text = text;
  msg.scheduledAt = new Date(scheduledAt);
  await msg.save();

  return NextResponse.json({ success: true });
}

/* ======================================================
   DELETE – Cancel Scheduled Message
====================================================== */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await dbConnect();

  /* ================= AUTH ================= */
  const cookieStore = await cookies();
  const token = cookieStore.get("authToken")?.value;

  if (!token) {
    return NextResponse.json(
      { success: false, error: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  let decoded: any;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET!);
  } catch {
    return NextResponse.json(
      { success: false, error: "INVALID_TOKEN" },
      { status: 401 }
    );
  }

  /* ================= PARAMS ================= */
  const { id } = await context.params;

  const msg = await ScheduledMessage.findOne({
    _id: id,
    userId: decoded.userId,
    status: "scheduled",
  });

  if (!msg) {
    return NextResponse.json(
      { success: false, error: "NOT_FOUND_OR_LOCKED" },
      { status: 404 }
    );
  }

  await msg.deleteOne();

  return NextResponse.json({ success: true });
}
