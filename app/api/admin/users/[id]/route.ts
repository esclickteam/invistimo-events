import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import User from "@/models/User";

export const dynamic = "force-dynamic";

/* =========================================================
   AUTH – ADMIN ONLY (supports impersonation context)
========================================================= */
function isAdminContext(auth: any) {
  return (
    auth?.role === "admin" ||
    auth?.impersonationRole === "admin" ||
    !!auth?.impersonatedBy
  );
}

async function requireAdmin(req?: NextRequest) {
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
   GET – SINGLE USER (ADMIN VIEW)
========================================================= */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    await requireAdmin(req);

    const { id } = await context.params;

    const user = await User.findById(id).lean();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, user },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err: any) {
    if (err?.message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
    }
    if (err?.message === "FORBIDDEN") {
      return NextResponse.json({ success: false, error: "FORBIDDEN" }, { status: 403 });
    }

    console.error("ADMIN USER GET ERROR:", err);
    return NextResponse.json({ success: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}

/* =========================================================
   PATCH – UPDATE USER (ADMIN FULL CONTROL)
========================================================= */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    await requireAdmin(req);

    const { id } = await context.params;
    const body = await req.json();

    /**
     * ❗ IMPORTANT:
     * שליטה מלאה לאדמין.
     * כל לוגיקה חכמה נשארת ב־UserSchema בלבד.
     */
    const allowedUpdate: any = {
      name: body.name,
      email: body.email,
      phone: body.phone,

      role: body.role,
      plan: body.plan,
      staffType: body.staffType,

      guests: body.guests,
      maxMessages: body.maxMessages,

      includeCalls: body.includeCalls,
      callsAddonPrice: body.callsAddonPrice,

      includeCreditGifts: body.includeCreditGifts,
      creditGiftsAddonPrice: body.creditGiftsAddonPrice,

      paidAmount: body.paidAmount,
      hasPaid: body.hasPaid,

      producerId: body.producerId ?? null,
      createdByProducer: body.createdByProducer ?? null,

      assignedProducerId: body.assignedProducerId ?? null,
      assignedClientIds: body.assignedClientIds,
      assignedStaffIds: body.assignedStaffIds,

      producerPricePerRecord: body.producerPricePerRecord,

      planLimits: body.planLimits,

      isTrial: body.isTrial,
      isDemoUser: body.isDemoUser,
    };

    // ניקוי undefined – לא לדרוס שדות קיימים
    Object.keys(allowedUpdate).forEach((key) => {
      if (allowedUpdate[key] === undefined) delete allowedUpdate[key];
    });

    const updatedUser = await User.findOneAndUpdate(
      { _id: id },
      { $set: allowedUpdate },
      { new: true }
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
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err: any) {
    if (err?.message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
    }
    if (err?.message === "FORBIDDEN") {
      return NextResponse.json({ success: false, error: "FORBIDDEN" }, { status: 403 });
    }

    console.error("ADMIN USER UPDATE ERROR:", err);
    return NextResponse.json({ success: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}

/* =========================================================
   DELETE – OPTIONAL (ADMIN)
========================================================= */
// export async function DELETE(...) {}
