import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import dbConnect from "@/lib/db";
import User from "@/models/User";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  try {
    await dbConnect();

    const cookieStore = await cookies();
    const token = cookieStore.get("authToken")?.value;
    if (!token) {
      return NextResponse.json({ success: false, message: "לא מחובר" }, { status: 401 });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    const me: any = await User.findById(decoded.id).lean();

    if (!me) {
      return NextResponse.json({ success: false, message: "משתמש לא נמצא" }, { status: 404 });
    }

    if (me.role !== "producer" && me.role !== "admin") {
      return NextResponse.json({ success: false, message: "אין הרשאה" }, { status: 403 });
    }

    const query =
      me.role === "admin"
        ? { role: "staff", staffType: "producer_staff" }
        : { role: "staff", staffType: "producer_staff", assignedProducerId: me._id };

    const staff = await User.find(query)
      .select("_id name email phone staffType assignedProducerId assignedClientIds")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, staff });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "שגיאת שרת" },
      { status: 500 }
    );
  }
}
