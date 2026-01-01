import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/db";

import User from "@/models/User";
import Invitation from "@/models/Invitation";
import Call from "@/models/Call"; // אם קיים

export async function GET() {
  try {
    await connectDB();

    // ✅ חובה await
    const cookieStore = await cookies();
    const token = cookieStore.get("authToken")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

    if (decoded.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [users, invitations, calls] = await Promise.all([
      User.countDocuments(),
      Invitation.countDocuments(),
      Call?.countDocuments?.() ?? 0,
    ]);

    return NextResponse.json({
      users,
      invitations,
      calls,
    });
  } catch (err) {
    console.error("❌ Admin stats error:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
