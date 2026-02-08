import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import Invitation from "@/models/Invitation";

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

    const cookieStore = await cookies(); // חובה await
    const token = cookieStore.get("authToken")?.value;

    if (!token) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as JwtPayload;

    const staffId =
      decoded.id || decoded._id || decoded.userId;

    if (!staffId) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    const staff = await User.findById(staffId).lean();

    if (
      !staff ||
      staff.role !== "staff" ||
      staff.staffType !== "producer_staff"
    ) {
      return NextResponse.json({ success: false }, { status: 403 });
    }

    const clientIds = Array.isArray(staff.assignedClientIds)
      ? staff.assignedClientIds
      : [];

    if (clientIds.length === 0) {
      return NextResponse.json({
        success: true,
        events: [],
      });
    }

    const invitations = await Invitation.find({
      ownerId: { $in: clientIds },
    })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      events: invitations,
    });
  } catch (err: any) {
    console.error("staff events error:", err);
    return NextResponse.json(
      { success: false, message: "שגיאת שרת" },
      { status: 500 }
    );
  }
}
