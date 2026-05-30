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

function buildInviteTokenQuery(token: string) {
  return {
    $or: [
      { venueClientInviteToken: token },
      { venueInviteToken: token },
      { clientInviteToken: token },
      { registrationToken: token },
      { inviteToken: token },
    ],
  };
}

function normalizeHallId(body: any) {
  return cleanString(
    body?.venueClientHallId ||
      body?.hallId ||
      body?.venueHallId ||
      body?.assignedHallId ||
      ""
  );
}

function isInviteExpired(event: any) {
  if (!event?.venueClientInviteExpiresAt) return false;

  const expiresAt = new Date(event.venueClientInviteExpiresAt);

  if (Number.isNaN(expiresAt.getTime())) return false;

  return expiresAt.getTime() < Date.now();
}

function isSameLockedUser(event: any, userId: string, email: string) {
  const lockedUserId = cleanString(event?.venueClientInviteLockedByUserId);
  const lockedEmail = cleanString(
    event?.venueClientInviteLockedEmail
  ).toLowerCase();

  return (
    (!!lockedUserId && lockedUserId === userId) ||
    (!!lockedEmail && lockedEmail === email.toLowerCase())
  );
}

function getFindOneAndUpdateDoc(result: any) {
  /*
    חשוב:
    בגרסאות שונות של MongoDB driver:
    - לפעמים findOneAndUpdate מחזיר document ישיר
    - לפעמים הוא מחזיר { value: document }
    לכן לא בודקים רק result.value.
  */
  return result?.value || result || null;
}

async function tryReturnExistingStripeSession({
  stripe,
  events,
  event,
}: {
  stripe: Stripe;
  events: any;
  event: any;
}) {
  const sessionId = cleanString(
    event?.venueClientStripeSessionId || event?.venueClientPaymentSessionId
  );

  if (!sessionId) {
    return null;
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session?.payment_status === "paid") {
      return {
        status: 409,
        body: {
          success: false,
          message: "התשלום כבר בוצע עבור הקישור הזה.",
        },
      };
    }

    if (session?.url && session?.status === "open") {
      return {
        status: 200,
        body: {
          success: true,
          url: session.url,
          sessionId: session.id,
          totalPrice: Number(event?.venueClientPaymentAmount || 0),
          resumed: true,
        },
      };
    }
  } catch (error) {
    console.warn("Failed to retrieve existing Stripe session:", error);
  }

  /*
    אם היה pending_payment אבל אין session פעיל,
    משחררים את הקישור לאותו משתמש כדי שאפשר יהיה ליצור session חדש.
  */
  await events.updateOne(
    { _id: event._id },
    {
      $set: {
        venueClientInviteStatus: "sent",
        venueClientInviteLockedAt: null,
        venueClientInviteLockedByUserId: null,
        venueClientInviteLockedEmail: "",
        venueClientPaymentStatus: "pending",
        venueClientPaymentSessionId: "",
        venueClientStripeSessionId: "",
        updatedAt: new Date(),
      },
    }
  );

  return null;
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

    const venueInviteToken = cleanString(
      body.venueInviteToken ||
        body.inviteToken ||
        body.registrationToken ||
        body.clientInviteToken ||
        body.token
    );

    const userId = cleanString(
      body.userId || body.clientUserId || body.venueClientUserId
    );

    const email = cleanString(body.email || body.clientEmail).toLowerCase();
    const packageTypeRaw = cleanString(body.packageType);
    const recordsCount = normalizeRecords(body.recordsCount);
    const venueClientHallId = normalizeHallId(body);

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
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const totalPrice = calculateTotal(packageType, recordsCount);
    const amountInAgorot = totalPrice * 100;
    const baseUrl = getBaseUrl(req);

    const existingEvent = await events.findOne(
      buildInviteTokenQuery(venueInviteToken)
    );

    if (!existingEvent) {
      return NextResponse.json(
        {
          success: false,
          message: "קישור ההרשמה לא נמצא או שאינו פעיל",
        },
        { status: 404 }
      );
    }

    if (isInviteExpired(existingEvent)) {
      return NextResponse.json(
        {
          success: false,
          message: "קישור ההרשמה פג תוקף. צריך ליצור קישור חדש.",
        },
        { status: 410 }
      );
    }

    const currentStatus = cleanString(existingEvent?.venueClientInviteStatus);

    if (
      existingEvent?.venueClientInviteUsedAt ||
      currentStatus === "used" ||
      currentStatus === "paid"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "קישור ההרשמה כבר נוצל. צריך ליצור קישור חדש.",
        },
        { status: 409 }
      );
    }

    /*
      אם המשתמש כבר לחץ המשך לתשלום והקישור ננעל עליו,
      לא חוסמים אותו. מחזירים את Stripe session הקיים או יוצרים חדש.
    */
    if (currentStatus === "pending_payment") {
      if (!isSameLockedUser(existingEvent, userId, email)) {
        return NextResponse.json(
          {
            success: false,
            message:
              "קישור ההרשמה כבר נמצא בתהליך תשלום. צריך ליצור קישור חדש.",
          },
          { status: 409 }
        );
      }

      const existingSessionResponse = await tryReturnExistingStripeSession({
        stripe,
        events,
        event: existingEvent,
      });

      if (existingSessionResponse) {
        return NextResponse.json(existingSessionResponse.body, {
          status: existingSessionResponse.status,
        });
      }
    }

    if (
      existingEvent.venueAccessStatus &&
      existingEvent.venueAccessStatus !== "linked"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "האירוע לא משויך לאולם ולכן לא ניתן לפתוח תשלום",
        },
        { status: 409 }
      );
    }

    /*
      נעילה אטומית:
      מאפשרים נעילה רק אם הקישור לא נוצל.
      תומך גם באירועים ישנים שאין להם status.
    */
    const lockedResult = await events.findOneAndUpdate(
      {
        _id: existingEvent._id,
        $or: [
          { venueClientInviteStatus: "sent" },
          { venueClientInviteStatus: "" },
          { venueClientInviteStatus: { $exists: false } },
          { venueClientInviteStatus: null },
        ],
        $and: [
          {
            $or: [
              { venueClientInviteUsedAt: { $exists: false } },
              { venueClientInviteUsedAt: null },
            ],
          },
        ],
      },
      {
        $set: {
          venueClientInviteStatus: "pending_payment",
          venueClientInviteLockedAt: new Date(),
          venueClientInviteLockedByUserId: userObjectId,
          venueClientInviteLockedEmail: email,

          venueClientUserId: userObjectId,
          venueClientPackageType: packageType,
          venueClientRecordsCount: recordsCount,
          venueClientPaymentStatus: "pending",
          venueClientPaymentAmount: totalPrice,
          venueClientHallId:
            venueClientHallId ||
            cleanString(existingEvent.venueClientHallId) ||
            cleanString(existingEvent.venueHallId),
          venueAccessStatus: existingEvent.venueAccessStatus || "linked",
          updatedAt: new Date(),
        },
      },
      {
        returnDocument: "after",
      }
    );

    const event = getFindOneAndUpdateDoc(lockedResult);

    if (!event) {
      return NextResponse.json(
        {
          success: false,
          message:
            "קישור ההרשמה כבר נוצל או ננעל לתהליך תשלום. צריך ליצור קישור חדש.",
        },
        { status: 409 }
      );
    }

    const cancelUrl = new URL(`${baseUrl}/venue-client/packages`);
    cancelUrl.searchParams.set("venueInviteToken", venueInviteToken);
    cancelUrl.searchParams.set("userId", userId);
    cancelUrl.searchParams.set("email", email);

    if (venueClientHallId) {
      cancelUrl.searchParams.set("venueClientHallId", venueClientHallId);
      cancelUrl.searchParams.set("hallId", venueClientHallId);
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      success_url: `${baseUrl}/venue-client/payment-success?session_id={CHECKOUT_SESSION_ID}&redirectTo=${encodeURIComponent(
        "/dashboard"
      )}`,
      cancel_url: cancelUrl.toString(),
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
        venueClientHallId,
      },
    });

    if (!session.url) {
      await events.updateOne(
        { _id: event._id },
        {
          $set: {
            venueClientInviteStatus: "sent",
            venueClientInviteLockedAt: null,
            venueClientInviteLockedByUserId: null,
            venueClientInviteLockedEmail: "",
            venueClientPaymentStatus: "failed",
            updatedAt: new Date(),
          },
        }
      );

      return NextResponse.json(
        {
          success: false,
          message: "לא נוצר קישור תשלום",
        },
        { status: 500 }
      );
    }

    await events.updateOne(
      { _id: event._id },
      {
        $set: {
          venueClientStripeSessionId: session.id,
          venueClientPaymentSessionId: session.id,
          updatedAt: new Date(),
        },
      }
    );

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
