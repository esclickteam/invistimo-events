import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/db";
import { moveStuckPaymentsToDecember } from "@/lib/admin/moveStuckPaymentsToDecember";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("authToken")?.value;

  if (!token) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

  if (decoded.role !== "admin") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { decoded };
}

/**
 * מעביר את תשלומי גל ואורנית / רפאל אברמוב לדצמבר 2025.
 * לא מוחק משתמשים ולא משנה סטטוס פעיל.
 */
export async function POST(_req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    await connectDB();
    const result = await moveStuckPaymentsToDecember();

    return NextResponse.json(
      {
        success: true,
        message: "תשלומים תקועים נרשמו לדצמבר 2025",
        ...result,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (err) {
    console.error("❌ fix-december-payments error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
