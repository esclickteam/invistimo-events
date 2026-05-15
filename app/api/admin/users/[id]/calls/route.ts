import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import User from "@/models/User";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* =========================================================
   AUTH
========================================================= */
function isAdminContext(auth: any) {
  return (
    auth?.role === "admin" ||
    auth?.impersonationRole === "admin" ||
    !!auth?.impersonatedBy
  );
}

async function requireAdmin(req: NextRequest) {
  const auth = await getUserIdFromRequest(req);

  if (!auth?.userId) {
    throw new Error("UNAUTHORIZED");
  }

  if (!isAdminContext(auth)) {
    throw new Error("FORBIDDEN");
  }

  return auth;
}

/* =========================================================
   POST – UPDATE CALLS SERVICE
========================================================= */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    await requireAdmin(req);

    const { id } = await context.params;

    const body = await req.json().catch(() => ({}));

    const includeCalls = Boolean(body.includeCalls);
    const callsRounds = includeCalls ? Number(body.callsRounds || 3) : 0;
    const callsAddonPrice = includeCalls
      ? Number(body.callsAddonPrice || 0)
      : 0;

    const updatedUser = await User.findByIdAndUpdate(
      id,
      {
        $set: {
          includeCalls,
          callsRounds,
          callsAddonPrice,

          callsEnabledBy: includeCalls ? "admin" : undefined,
          callsEnabledAt: includeCalls ? new Date() : null,

          "planLimits.callsEnabled": includeCalls,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    ).lean();

    if (!updatedUser) {
      return NextResponse.json(
        { success: false, error: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        user: updatedUser,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (err: any) {
    if (err?.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    if (err?.message === "FORBIDDEN") {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN" },
        { status: 403 }
      );
    }

    console.error("ADMIN CALLS UPDATE ERROR:", err);

    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}