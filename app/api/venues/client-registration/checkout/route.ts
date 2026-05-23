import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import Stripe from "stripe";

import { connectDB } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PackageType = "rsvp_seating" | "full_event_management";

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function normalizeRecords(value: unknown) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) return 0;

  return Math.max(0, Math.floor(numberValue));
}

function getBaseUrl(req: NextRequest) {
  const envUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_URL;

  if (envUrl) {
    if (envUrl.startsWith("http://") || envUrl.startsWith("https://")) {
      return envUrl.replace(/\/$/, "");
    }

    return `https://${envUrl}`.replace(/\/$/, "");
  }

  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}

function isPaidPackage(value: unknown): value is PackageType {
  return value === "rsvp_seating" || value === "full_event_management";
}

function getPackageTitle(packageType: PackageType) {
  if (packageType === "rsvp_seating") {
    return "הושבה + אישורי הגעה דרך אולם";
  }

  return "הושבה + אישורי הגעה + ניהול אירוע דרך אולם";
}

function getPackageDescription(packageType: PackageType, recordsCount: number) {
  if (packageType === "rsvp_seating") {
    return `${recordsCount} רשומות × 2 ₪`;
  }

  return `${recordsCount} רשומות × 2 ₪ + 100 ₪ מערכת ניהול אירוע`;
}

function calculateTotal(packageType: PackageType, recordsCount: number) {
  const perRecordTotal = recordsCount * 2;

  if (packageType === "full_event_management") {
    return perRecordTotal + 100;
  }

  return perRecordTotal;
}

function getCollection(name: string) {
  return mongoose.connection.db?.collection(name);
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

    if (!stripeSecretKey) {
      return NextResponse.json(
        {
          success: false,
          message: "חסר STRIPE_SECRET_KEY",
        },
        { status: 500 }
      );
    }

    const stripe = new Stripe(stripeSecretKey);

    const events = getCollection("events");

    if (!events) {
      return NextResponse.json(
        {
          success: false,
          message: "לא נמצאה קולקשן events",
        },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));

    const venueInviteToken = cleanString(body.venueInviteToken);
    const userId = cleanString(body.userId);
    const email = cleanString(body.email).toLowerCase();
    const packageTypeRaw = cleanString(body.packageType);
    const recordsCount = normalizeRecords(body.recordsCount);

    if (!venueInviteToken) {
      return NextResponse.json(
        {
          success: false,
          message: "חסר token של אולם",
        },
        { status: 400 }
      );
    }

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        {
          success: false,
          message: "מזהה משתמש לא תקין",
        },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          message: "חסר אימייל",
        },
        { status: 400 }
      );
    }

    if (!isPaidPackage(packageTypeRaw)) {
      return NextResponse.json(
        {
          success: false,
          message: "חבילה לא תקינה לתשלום",
        },
        { status: 400 }
      );
    }

    if (!recordsCount || recordsCount <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "חובה להזין מספר רשומות",
        },
        { status: 400 }
      );
    }

    const packageType: PackageType = packageTypeRaw;

    const event = await events.findOne({
      venueClientInviteToken: venueInviteToken,
      venueClientInviteStatus: "sent",
      venueAccessStatus: "linked",
    });

    if (!event) {
      return NextResponse.json(
        {
          success: false,
          message: "קישור ההרשמה לא נמצא או שאינו פעיל",
        },
        { status: 404 }
      );
    }

    const totalPrice = calculateTotal(packageType, recordsCount);
    const amountInAgorot = totalPrice * 100;
    const baseUrl = getBaseUrl(req);

    await events.updateOne(
      {
        _id: event._id,
      },
      {
        $set: {
          venueClientUserId: new mongoose.Types.ObjectId(userId),
          venueClientPackageType: packageType,
          venueClientRecordsCount: recordsCount,
          venueClientPaymentStatus: "pending",
          venueClientPaymentAmount: totalPrice,
          updatedAt: new Date(),
        },
      }
    );

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      success_url: `${baseUrl}/venue-client/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/venue-client/packages?venueInviteToken=${encodeURIComponent(
        venueInviteToken
      )}&userId=${encodeURIComponent(userId)}&email=${encodeURIComponent(email)}`,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "ils",
            unit_amount: amountInAgorot,
            product_data: {
              name: getPackageTitle(packageType),
              description: getPackageDescription(packageType, recordsCount),
            },
          },
        },
      ],
      metadata: {
        source: "venue_client_package",
        venueInviteToken,
        userId,
        eventId: String(event._id),
        email,
        packageType,
        recordsCount: String(recordsCount),
        totalPrice: String(totalPrice),
      },
    });

    if (!session.url) {
      return NextResponse.json(
        {
          success: false,
          message: "לא נוצר קישור תשלום",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      url: session.url,
      sessionId: session.id,
      totalPrice,
    });
  } catch (error: any) {
    console.error(
      "POST /api/venues/client-registration/checkout failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "יצירת תשלום נכשלה",
      },
      { status: 500 }
    );
  }
}