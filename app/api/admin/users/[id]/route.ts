import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export const dynamic = "force-dynamic";

/* =========================================================
   AUTH – ADMIN ONLY
========================================================= */
async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("authToken")?.value;

  if (!token) {
    throw new Error("UNAUTHORIZED");
  }

  const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

  if (decoded.role !== "admin") {
    throw new Error("FORBIDDEN");
  }

  return decoded;
}

/* =========================================================
   GET – SINGLE USER (ADMIN VIEW)
========================================================= */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    await requireAdmin();

    const user = await User.findById(params.id).lean();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, user });
  } catch (err) {
    console.error("ADMIN USER GET ERROR:", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

/* =========================================================
   PATCH – UPDATE USER (ADMIN FULL CONTROL)
========================================================= */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    await requireAdmin();

    const body = await req.json();

    /**
     * ❗ IMPORTANT:
     * אנחנו נותנים לאדמין לשלוט בהכל,
     * ולא מפעילים כאן שום לוגיקה חכמה.
     * כל auto-logic נשאר ב־UserSchema בלבד.
     */

    const allowedUpdate: any = {
      name: body.name,
      email: body.email,
      phone: body.phone,

      role: body.role,
      plan: body.plan,

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

      planLimits: body.planLimits,

      isTrial: body.isTrial,
      isDemoUser: body.isDemoUser,
    };

    // ניקוי undefined (לא לדרוס שדות סתם)
    Object.keys(allowedUpdate).forEach(
      (key) => allowedUpdate[key] === undefined && delete allowedUpdate[key]
    );

    const updatedUser = await User.findOneAndUpdate(
      { _id: params.id },
      { $set: allowedUpdate },
      { new: true }
    ).lean();

    if (!updatedUser) {
      return NextResponse.json(
        { success: false, error: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (err) {
    console.error("ADMIN USER UPDATE ERROR:", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

/* =========================================================
   DELETE – OPTIONAL (ADMIN)
   לא מוחק בפועל, רק אם תרצי בהמשך
========================================================= */
// export async function DELETE(...) {}
