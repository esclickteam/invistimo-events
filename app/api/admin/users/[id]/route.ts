import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import User from "@/models/User";
import Payment from "@/models/Payment";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* =========================================================
   PLAN CONFIG
========================================================= */
const PLAN_CONFIG: Record<
  string,
  {
    label: string;
    guests: number;
    sms: number;
    price: number;
  }
> = {
  plan1: {
    label: "חבילה 1",
    guests: 100,
    sms: 300,
    price: 402,
  },
  plan2: {
    label: "חבילה 2",
    guests: 200,
    sms: 600,
    price: 789,
  },
  plan3: {
    label: "חבילה 3",
    guests: 300,
    sms: 900,
    price: 1171,
  },
};

function getPlanConfig(plan?: string) {
  return PLAN_CONFIG[String(plan || "plan1")] || PLAN_CONFIG.plan1;
}

function normalizeEmail(email?: string) {
  return String(email || "").trim().toLowerCase();
}

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

function cleanUndefined(obj: Record<string, any>) {
  Object.keys(obj).forEach((key) => {
    if (obj[key] === undefined) {
      delete obj[key];
    }
  });

  return obj;
}

/* =========================================================
   GET – SINGLE USER
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

    const payments = await Payment.find({
      email: normalizeEmail((user as any).email),
      isTest: { $ne: true },
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    return NextResponse.json(
      {
        success: true,
        user,
        payments,
      },
      { headers: { "Cache-Control": "no-store" } }
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

    console.error("ADMIN USER GET ERROR:", err);

    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}

/* =========================================================
   PATCH – UPDATE USER / UPGRADE USER
========================================================= */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const auth = await requireAdmin(req);

    const { id } = await context.params;
    const body = await req.json();

    const currentUser: any = await User.findById(id).lean();

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    const selectedPlanKey =
      body.plan || body.priceKey || currentUser.priceKey || currentUser.plan;

    const selectedPlan = getPlanConfig(selectedPlanKey);

    const finalGuests =
      body.guests ??
      body.maxGuests ??
      selectedPlan.guests ??
      currentUser.guests ??
      0;

    const finalSmsLimit =
      body.smsLimit ??
      body.maxMessages ??
      selectedPlan.sms ??
      currentUser.smsLimit ??
      currentUser.maxMessages ??
      0;

    const includeCalls =
      body.includeCalls !== undefined
        ? Boolean(body.includeCalls)
        : Boolean(currentUser.includeCalls);

    const includeCreditGifts =
      body.includeCreditGifts !== undefined
        ? Boolean(body.includeCreditGifts)
        : Boolean(currentUser.includeCreditGifts);

    const includeDigitalSeating =
      body.includeDigitalSeating !== undefined
        ? Boolean(body.includeDigitalSeating)
        : Boolean(currentUser.includeDigitalSeating);

    const includeEventManagement =
      body.includeEventManagement !== undefined
        ? Boolean(body.includeEventManagement)
        : Boolean(currentUser.includeEventManagement);

    const includeCustomDesign =
      body.includeCustomDesign !== undefined
        ? Boolean(body.includeCustomDesign)
        : Boolean(currentUser.includeCustomDesign);

    const planLimits =
      body.planLimits ||
      {
        ...(currentUser.planLimits || {}),
        maxGuests: finalGuests,
        smsEnabled: true,
        smsLimit: finalSmsLimit,
        seatingEnabled: includeDigitalSeating,
        remindersEnabled: true,
        callsEnabled: includeCalls,
      };

    const allowedUpdate: any = cleanUndefined({
      name: body.name,
      email: body.email ? normalizeEmail(body.email) : undefined,
      phone: body.phone,

      role: body.role,
      staffType: body.staffType,

      plan: body.plan,
      priceKey: body.priceKey || body.plan,
      packageName:
        body.packageName ||
        (body.plan || body.priceKey ? selectedPlan.label : undefined),

      guests: finalGuests,
      maxGuests: finalGuests,
      maxMessages: finalSmsLimit,
      smsLimit: finalSmsLimit,

      includeCalls,
      callsRounds:
        body.callsRounds !== undefined
          ? Number(body.callsRounds || 0)
          : includeCalls
            ? Number(currentUser.callsRounds || 3)
            : 0,
      callsAddonPrice:
        body.callsAddonPrice !== undefined
          ? Number(body.callsAddonPrice || 0)
          : undefined,

      includeCreditGifts,
      creditGiftsAddonPrice:
        body.creditGiftsAddonPrice !== undefined
          ? Number(body.creditGiftsAddonPrice || 0)
          : undefined,

      includeDigitalSeating,
      includeEventManagement,
      includeCustomDesign,

      selfManageEnabled: includeEventManagement,
      customDesignEnabled: includeCustomDesign,

      paidAmount: body.paidAmount,
      hasPaid: body.hasPaid,
      isActive: body.isActive,

      producerId: body.producerId,
      createdByProducer: body.createdByProducer,

      assignedProducerId: body.assignedProducerId,
      assignedClientIds: body.assignedClientIds,
      assignedStaffIds: body.assignedStaffIds,

      producerPricePerRecord: body.producerPricePerRecord,

      planLimits,

      isTrial: body.isTrial,
      isDemoUser: body.isDemoUser,

      eventDate: body.eventDate,
    });

    const updatedUser: any = await User.findOneAndUpdate(
      { _id: id },
      { $set: allowedUpdate },
      { new: true, runValidators: true }
    ).lean();

    const upgradeAmount = Number(body.upgradeAmount || 0);

    if (upgradeAmount > 0) {
      const paymentEmail = normalizeEmail(updatedUser.email || currentUser.email);

      await Payment.create({
        email: paymentEmail,

        stripeSessionId: undefined,
        stripePaymentIntentId: undefined,
        stripeCustomerId: undefined,
        stripePriceId: undefined,

        priceKey: updatedUser.priceKey || updatedUser.plan || selectedPlanKey,
        maxGuests: Number(updatedUser.maxGuests || updatedUser.guests || 0),

        includeCalls: Boolean(updatedUser.includeCalls),
        callsAddonPrice: Number(updatedUser.callsAddonPrice || 0),

        includeCreditGifts: Boolean(updatedUser.includeCreditGifts),
        creditGiftsAddonPrice: Number(updatedUser.creditGiftsAddonPrice || 0),

        amount: upgradeAmount,
        refundAmount: 0,
        currency: "ils",

        type: "upgrade",
        status: "paid",
        isTest: false,

        meta: {
          source: "admin_upgrade",
          adminId: auth.impersonatedBy
            ? String(auth.impersonatedBy)
            : String(auth.userId),
          userId: String(updatedUser._id),
          previousPlan: currentUser.plan || currentUser.priceKey || null,
          newPlan: updatedUser.plan || updatedUser.priceKey || null,
          packageName: updatedUser.packageName || selectedPlan.label,
          manualAmount: true,
          includeDigitalSeating: Boolean(updatedUser.includeDigitalSeating),
          includeEventManagement: Boolean(updatedUser.includeEventManagement),
          includeCustomDesign: Boolean(updatedUser.includeCustomDesign),
        },
      });

      await User.findByIdAndUpdate(updatedUser._id, {
        $inc: {
          paidAmount: upgradeAmount,
        },
        $set: {
          hasPaid: true,
          isActive: true,
        },
      });
    }

    const finalUser = await User.findById(id).lean();

    return NextResponse.json(
      {
        success: true,
        user: finalUser,
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

    console.error("ADMIN USER UPDATE ERROR:", err);

    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}

/* =========================================================
   DELETE – ADMIN DELETE USER
========================================================= */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    await requireAdmin(req);

    const { id } = await context.params;

    const deletedUser = await User.findByIdAndDelete(id);

    if (!deletedUser) {
      return NextResponse.json(
        {
          success: false,
          error: "USER_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
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
        {
          success: false,
          error: "UNAUTHORIZED",
        },
        { status: 401 }
      );
    }

    if (err?.message === "FORBIDDEN") {
      return NextResponse.json(
        {
          success: false,
          error: "FORBIDDEN",
        },
        { status: 403 }
      );
    }

    console.error("ADMIN USER DELETE ERROR:", err);

    return NextResponse.json(
      {
        success: false,
        error: "SERVER_ERROR",
      },
      { status: 500 }
    );
  }
}