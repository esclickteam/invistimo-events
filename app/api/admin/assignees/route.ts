import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import User from "@/models/User";

export const dynamic = "force-dynamic";

/* =========================================================
   Helpers
========================================================= */
function isAdminContext(auth: any) {
  return (
    auth?.role === "admin" ||
    auth?.impersonationRole === "admin" ||
    !!auth?.impersonatedBy
  );
}

/* =========================================================
   GET – ASSIGNEES (PRODUCERS + STAFF)
========================================================= */
export async function GET(req: Request) {
  try {
    await connectDB();

    const auth = await getUserIdFromRequest(req);

    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    if (!isAdminContext(auth)) {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const [producers, staff] = await Promise.all([
      User.find({ role: "producer" })
        .select("name email")
        .sort({ name: 1 })
        .lean(),

      User.find({ role: "staff" })
        .select("name email staffType assignedProducerId")
        .sort({ name: 1 })
        .lean(),
    ]);

    return NextResponse.json(
      { success: true, producers, staff },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("❌ ASSIGNEES GET ERROR:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
