import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import Event from "@/models/Event";

export const dynamic = "force-dynamic";

type JwtPayload = {
  id?: string;
  _id?: string;
  userId?: string;
  role?: string;
};

export async function GET(_req: NextRequest) {
  try {
    await dbConnect();

    const cookieStore = await cookies();
    const token = cookieStore.get("authToken")?.value;

    if (!token) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as JwtPayload;

    const staffId = decoded.id || decoded._id || decoded.userId;

    if (!staffId) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    const staff: any = await User.findById(staffId).lean();

    if (
      !staff ||
      staff.role !== "staff" ||
      staff.staffType !== "producer_staff"
    ) {
      return NextResponse.json({ success: false }, { status: 403 });
    }

    const assignedClientIds = Array.isArray(staff.assignedClientIds)
      ? staff.assignedClientIds
      : [];

    if (assignedClientIds.length === 0) {
      return NextResponse.json({
        success: true,
        clients: [],
      });
    }

    // 🔑 מביאים רק לקוחות שהוקצו לעובד
    const clients = await User.find({
      _id: { $in: assignedClientIds },
      role: "client",
    })
      .select("_id name email phone")
      .lean();

    // 🔑 מביאים אירועים ללקוחות האלו
    const events = await Event.find({
      clientId: { $in: assignedClientIds },
    }).lean();

    const eventMap = new Map(
      events.map((e: any) => [String(e.clientId), e])
    );

    const clientsWithEvents = clients.map((c: any) => ({
      ...c,
      event: eventMap.get(String(c._id)) || null,
    }));

    return NextResponse.json({
      success: true,
      clients: clientsWithEvents,
    });
  } catch (err: any) {
    console.error("staff clients error:", err);
    return NextResponse.json(
      { success: false, message: "שגיאת שרת" },
      { status: 500 }
    );
  }
}
