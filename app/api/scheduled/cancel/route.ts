import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import WhatsappQueue from "@/models/tempQueue";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

/* ====================================================== */

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
    const userId = decoded?.userId || decoded?.id || decoded?._id;

    if (!userId) {
      return { ok: false as const, error: "INVALID_TOKEN", status: 401 };
    }

    return { ok: true as const, userId };
  } catch (err) {
    return { ok: false as const, error: "INVALID_TOKEN", status: 401 };
  }
}

/* ====================================================== */

export async function POST(req: NextRequest) {
  await dbConnect();

  try {
    const auth = await getAuthUserId();
    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const body = await req.json();
    const { scheduleId } = body;

    if (!scheduleId) {
      return NextResponse.json(
        { error: "Missing scheduleId" },
        { status: 400 }
      );
    }

    /* ================= FIND ================= */

    const schedule = await WhatsappQueue.findById(scheduleId); // 🔥 שינוי

    if (!schedule) {
      return NextResponse.json(
        { error: "Schedule not found" },
        { status: 404 }
      );
    }

    /* ================= SECURITY ================= */

    if (schedule.userId?.toString() !== auth.userId.toString()) {
      return NextResponse.json(
        { error: "Not allowed" },
        { status: 403 }
      );
    }

    /* ================= LOGIC ================= */

    if (schedule.status === "sent") {
      return NextResponse.json(
        { error: "Already sent - cannot cancel" },
        { status: 400 }
      );
    }

    if (schedule.status === "cancelled") {
      return NextResponse.json({
        success: true,
        alreadyCancelled: true,
      });
    }

    /* ================= UPDATE ================= */

    schedule.status = "cancelled";
    schedule.lockedAt = null;

    await schedule.save();

    /* ================= RESPONSE ================= */

    return NextResponse.json({
      success: true,
      scheduleId: schedule._id,
      status: schedule.status,
    });
  } catch (err: any) {
    console.error("Cancel schedule error:", err);

    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}