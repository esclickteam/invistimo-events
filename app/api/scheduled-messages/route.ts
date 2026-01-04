import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import ScheduledMessage from "@/models/ScheduledMessage";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

export async function GET() {
  await dbConnect();

  const cookieStore = cookies();
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

  const messages = await ScheduledMessage.find({
    userId: decoded.userId,
    status: "scheduled",
  }).sort({ scheduledAt: 1 });

  return NextResponse.json({
    success: true,
    messages,
  });
}
