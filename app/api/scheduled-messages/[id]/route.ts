import { NextResponse, NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import ScheduledMessage from "@/models/ScheduledMessage";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

/* ======================================================
   Helpers
====================================================== */
async function getAuthUserId() {
  const cookieStore = await cookies();

  // תאימות אם אצלך לפעמים משתמשים בשם token אחר
  const token =
    cookieStore.get("authToken")?.value ||
    cookieStore.get("token")?.value ||
    null;

  if (!token) {
    return { ok: false as const, error: "UNAUTHORIZED", status: 401 };
  }

  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    const userId = decoded?.userId || decoded?.id || decoded?._id || null;

    if (!userId) {
      return { ok: false as const, error: "INVALID_TOKEN", status: 401 };
    }

    return { ok: true as const, userId: String(userId) };
  } catch {
    return { ok: false as const, error: "INVALID_TOKEN", status: 401 };
  }
}

function normalizeEditPayload(body: any) {
  const text =
    typeof body?.text === "string"
      ? body.text
      : typeof body?.messageContent === "string"
      ? body.messageContent
      : "";

  const scheduledAtRaw = body?.scheduledAt;
  const scheduledAt = scheduledAtRaw ? new Date(scheduledAtRaw) : null;

  return {
    text: text.trim(),
    scheduledAt,
  };
}

/* ======================================================
   PATCH – Edit Scheduled Message
====================================================== */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();

    /* ================= AUTH ================= */
    const auth = await getAuthUserId();
    if (!auth.ok) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status }
      );
    }

    /* ================= PARAMS ================= */
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: "MISSING_ID" },
        { status: 400 }
      );
    }

    /* ================= BODY ================= */
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { success: false, error: "INVALID_JSON" },
        { status: 400 }
      );
    }

    const { text, scheduledAt } = normalizeEditPayload(body);

    if (!text || !scheduledAt || Number.isNaN(scheduledAt.getTime())) {
      return NextResponse.json(
        { success: false, error: "MISSING_PARAMS" },
        { status: 400 }
      );
    }

    // לא לאפשר זמן עבר
    if (scheduledAt.getTime() <= Date.now()) {
      return NextResponse.json(
        { success: false, error: "PAST_TIME_NOT_ALLOWED" },
        { status: 400 }
      );
    }

    const msg = await ScheduledMessage.findOne({
      _id: id,
      userId: auth.userId,
      status: "scheduled",
    });

    if (!msg) {
      return NextResponse.json(
        { success: false, error: "NOT_FOUND_OR_LOCKED" },
        { status: 404 }
      );
    }

    msg.text = text;
    msg.scheduledAt = scheduledAt;
    await msg.save();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PATCH scheduled message error:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}

/* ======================================================
   DELETE – Cancel Scheduled Message
====================================================== */
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();

    /* ================= AUTH ================= */
    const auth = await getAuthUserId();
    if (!auth.ok) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status }
      );
    }

    /* ================= PARAMS ================= */
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: "MISSING_ID" },
        { status: 400 }
      );
    }

    const msg = await ScheduledMessage.findOne({
      _id: id,
      userId: auth.userId,
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
  } catch (err) {
    console.error("DELETE scheduled message error:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
