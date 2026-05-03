import { NextRequest, NextResponse } from "next/server";
import ScheduledMessage from "@/models/ScheduledMessage";
import dbConnect from "@/lib/db";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

/* ================= AUTH ================= */
async function getAuthUserId() {
  const cookieStore = await cookies();

  const token =
    cookieStore.get("authToken")?.value ||
    cookieStore.get("token")?.value ||
    null;

  if (!token) return null;

  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    return decoded?.userId || decoded?.id || decoded?._id || null;
  } catch {
    return null;
  }
}

/* ================= POST ================= */

export async function POST(req: NextRequest) {
  await dbConnect();

  const userId = await getAuthUserId();

  if (!userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = await req.json();

  const {
    invitationId,
    type,
    channel,
    scheduledAt,
    audience,
    round,
  } = body;

  if (!invitationId || !type || !channel || !scheduledAt) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  let existing = await ScheduledMessage.findOne({
    invitationId,
    type,
    channel,
    round: round ?? 1,
    userId, // 🔥 חשוב
    status: "pending",
  });

  // UPDATE
  if (existing) {
    if (existing.lockedAt) {
      return NextResponse.json(
        { error: "ההודעה כבר בתהליך שליחה ולא ניתן לערוך" },
        { status: 400 }
      );
    }

    existing.scheduledAt = new Date(scheduledAt);
    existing.audience = audience ?? existing.audience;

    await existing.save();

    return NextResponse.json(existing);
  }

  // CREATE
  const msg = await ScheduledMessage.create({
    invitationId,
    type,
    channel,
    round: round ?? 1,
    scheduledAt: new Date(scheduledAt),
    audience: audience ?? [],
    status: "pending",
    lockedAt: null,
    userId, // 🔥🔥🔥 זה התיקון
  });

  return NextResponse.json(msg);
}