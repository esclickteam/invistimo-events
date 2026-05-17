import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import Stripe from "stripe";

import { connectDB } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import User from "@/models/User";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* =========================================================
   STRIPE
========================================================= */
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-11-17.clover",
});

/* =========================================================
   HELPERS
========================================================= */
function isAdminContext(auth: any) {
  return (
    auth?.role === "admin" ||
    auth?.impersonationRole === "admin" ||
    !!auth?.impersonatedBy
  );
}

function safeBoolean(value: any) {
  return value === true || value === "true";
}

function safeNumber(value: any, fallback = 0) {
  const num = Number(value);

  if (!Number.isFinite(num)) return fallback;

  return num;
}

function normalizeEmail(email?: string) {
  return String(email || "").trim().toLowerCase();
}

function normalizeAccessModules(body: any, fallback: any) {
  const fallbackRsvpSeating =
    Boolean(fallback?.accessModules?.rsvpSeating) ||
    Boolean(fallback?.includeDigitalSeating) ||
    Boolean(fallback?.planLimits?.seatingEnabled);

  const fallbackEventProduction =
    Boolean(fallback?.accessModules?.eventProduction) ||
    Boolean(fallback?.includeEventManagement) ||
    Boolean(fallback?.selfManageEnabled);

  const bodyAccessModules = body?.accessModules;

  return {
    rsvpSeating:
      typeof bodyAccessModules?.rsvpSeating === "boolean"
        ? bodyAccessModules.rsvpSeating
        : typeof body?.includeDigitalSeating !== "undefined"
          ? safeBoolean(body.includeDigitalSeating)
          : fallbackRsvpSeating,

    eventProduction:
      typeof bodyAccessModules?.eventProduction === "boolean"
        ? bodyAccessModules.eventProduction
        : typeof body?.includeEventManagement !== "undefined"
          ? safeBoolean(body.includeEventManagement)
          : fallbackEventProduction,
  };
}

/* =========================================================
   POST – ADMIN UPGRADE STRIPE CHECKOUT
   Used when admin chooses:
   "לשלם דרך Stripe"
========================================================= */
export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    /* =====================================================
       AUTH
    ===================================================== */
    const auth = await getUserIdFromRequest(req as NextRequest);

    if (!auth?.userId) {
      return NextResponse.json(
        {
          success: false,
          error: "UNAUTHORIZED",
        },
        { status: 401 }
      );
    }

    if (!isAdminContext(auth)) {
      return NextResponse.json(
        {
          success: false,
          error: "FORBIDDEN",
        },
        { status: 403 }
      );
    }

    /* =====================================================
       PARAMS
    ===================================================== */
    const { id: userId } = await context.params;

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: "MISSING_USER_ID",
        },
        { status: 400 }
      );
    }

    /* =====================================================
       BODY
    ===================================================== */
    const body = await req.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_BODY",
        },
        { status: 400 }
      );
    }

    const amount = safeNumber(body.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_AMOUNT",
        },
        { status: 400 }
      );
    }

    const plan = String(body.plan || body.priceKey || "");
    const priceKey = String(body.priceKey || body.plan || "");
    const packageName = String(body.packageName || "");

    const guests = safeNumber(body.guests || body.maxGuests);
    const maxGuests = safeNumber(body.maxGuests || body.guests);
    const smsLimit = safeNumber(body.smsLimit || body.maxMessages);
    const maxMessages = safeNumber(body.maxMessages || body.smsLimit);

    const includeCalls = safeBoolean(body.includeCalls);
    const includeCreditGifts = safeBoolean(body.includeCreditGifts);
    const includeDigitalSeating = safeBoolean(body.includeDigitalSeating);
    const includeEventManagement = safeBoolean(body.includeEventManagement);
    const includeCustomDesign = safeBoolean(body.includeCustomDesign);

    const extraRecords = safeNumber(body.extraRecords);
    const extraRecordsAmount = safeNumber(body.extraRecordsAmount);
    const extraRecordsPricePerRecord = safeNumber(
      body.extraRecordsPricePerRecord
    );

    const venueSeatingDepositAmount = safeNumber(
      body.venueSeatingDepositAmount
    );

    /* =====================================================
       USER
    ===================================================== */
    const user: any = await User.findById(userId).lean();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "USER_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    const userEmail = normalizeEmail(user.email);

    if (!userEmail) {
      return NextResponse.json(
        {
          success: false,
          error: "USER_EMAIL_MISSING",
        },
        { status: 400 }
      );
    }

    /*
      ✅ הרשאות מודולים:
      rsvpSeating = אישורי הגעה / הושבה
      eventProduction = מערכת ניהול אירוע
    */
    const accessModules = normalizeAccessModules(body, user);

    /* =====================================================
       SITE URL
    ===================================================== */
    const appUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

    if (!appUrl || !/^https?:\/\//.test(appUrl)) {
      throw new Error(`INVALID NEXT_PUBLIC_SITE_URL: ${appUrl}`);
    }

    const cleanBaseUrl = appUrl.replace(/\/+$/, "");

    /* =====================================================
       STRIPE CHECKOUT
       Important:
       We DO NOT update the user here yet.
       User should be updated after Stripe payment succeeds
       through webhook by reading this metadata.
    ===================================================== */
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: userEmail,

      line_items: [
        {
          price_data: {
            currency: "ils",
            product_data: {
              name: "Invistimo – שדרוג משתמש",
              description: `${user.name || userEmail} · ${
                packageName || priceKey || plan
              }`,
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],

      metadata: {
        source: "admin_upgrade",

        userId: String(user._id),
        email: userEmail,

        adminId: auth.impersonatedBy
          ? String(auth.impersonatedBy)
          : String(auth.userId),

        amount: String(amount),

        previousPlan: String(user.plan || user.priceKey || ""),
        plan,
        priceKey,
        packageName,

        guests: String(guests || 0),
        maxGuests: String(maxGuests || guests || 0),
        smsLimit: String(smsLimit || 0),
        maxMessages: String(maxMessages || smsLimit || 0),

        includeCalls: String(includeCalls),
        includeCreditGifts: String(includeCreditGifts),
        includeDigitalSeating: String(includeDigitalSeating),
        includeEventManagement: String(includeEventManagement),
        includeCustomDesign: String(includeCustomDesign),

        /*
          ✅ חשוב לוובהוק:
          שומרים גם כאובייקט JSON וגם כשדות שטוחים.
        */
        accessModules: JSON.stringify(accessModules),
        accessModulesRsvpSeating: String(accessModules.rsvpSeating),
        accessModulesEventProduction: String(accessModules.eventProduction),

        extraRecords: String(extraRecords || 0),
        extraRecordsAmount: String(extraRecordsAmount || 0),
        extraRecordsPricePerRecord: String(extraRecordsPricePerRecord || 0),

        venueSeatingDepositAmount: String(venueSeatingDepositAmount || 0),
      },

      success_url: `${cleanBaseUrl}/admin/users?upgradePaid=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${cleanBaseUrl}/admin/users?upgradeCanceled=1`,
    });

    return NextResponse.json(
      {
        success: true,
        checkoutUrl: session.url,
        url: session.url,
        sessionId: session.id,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (err) {
    console.error("❌ ADMIN UPGRADE STRIPE CHECKOUT ERROR:", err);

    return NextResponse.json(
      {
        success: false,
        error: "UPGRADE_CHECKOUT_FAILED",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}