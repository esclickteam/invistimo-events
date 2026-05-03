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

/* ======================================================
   POST – Create OR Update Scheduled Message
====================================================== */
export async function POST(request: NextRequest) {
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

    /* ================= BODY ================= */
    const body = await request.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        { success: false, error: "INVALID_JSON" },
        { status: 400 }
      );
    }

    const {
      invitationId,
      templateName,
      scheduledAt,
      audience,
      round,
    } = body;

    if (!invitationId || !templateName || !scheduledAt) {
      return NextResponse.json(
        { success: false, error: "MISSING_PARAMS" },
        { status: 400 }
      );
    }

    const date = new Date(scheduledAt);

    if (Number.isNaN(date.getTime())) {
      return NextResponse.json(
        { success: false, error: "INVALID_DATE" },
        { status: 400 }
      );
    }

    if (date.getTime() <= Date.now()) {
      return NextResponse.json(
        { success: false, error: "PAST_TIME_NOT_ALLOWED" },
        { status: 400 }
      );
    }

    /* ================= FIND EXISTING ================= */
    const existing = await ScheduledMessage.findOne({
      invitationId,
      templateName,
      round,
      status: "scheduled",
    });

    if (existing) {
      // 🔥 UPDATE
      existing.scheduledAt = date;
      existing.lockedAt = null;

      await existing.save();

      return NextResponse.json({
        success: true,
        updated: true,
        data: existing,
      });
    }

    /* ================= CREATE ================= */
    const newMsg = await ScheduledMessage.create({
      invitationId,
      templateName,
      scheduledAt: date,
      audience,
      round,
      userId: auth.userId,
      status: "scheduled",
    });

    return NextResponse.json({
      success: true,
      created: true,
      data: newMsg,
    });
  } catch (err) {
    console.error("POST scheduled message error:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}

/* ======================================================
   PATCH – Edit Scheduled Message (לפי ID)
====================================================== */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();

    const auth = await getAuthUserId();
    if (!auth.ok) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status }
      );
    }

    const { id } = await context.params;

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { success: false, error: "INVALID_JSON" },
        { status: 400 }
      );
    }

    const scheduledAt = new Date(body?.scheduledAt);

    if (!scheduledAt || Number.isNaN(scheduledAt.getTime())) {
      return NextResponse.json(
        { success: false, error: "INVALID_DATE" },
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

    const auth = await getAuthUserId();
    if (!auth.ok) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status }
      );
    }

    const { id } = await context.params;

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