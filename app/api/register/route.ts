import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import User from "@/models/User";
import { connectDB } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function toObjectId(value: unknown) {
  const id = cleanString(value);

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }

  return new mongoose.Types.ObjectId(id);
}

function getProducerObjectId(value: unknown) {
  const producerId = cleanString(value);

  if (!producerId || producerId === "true" || producerId === "false") {
    return null;
  }

  if (!mongoose.Types.ObjectId.isValid(producerId)) {
    return null;
  }

  return new mongoose.Types.ObjectId(producerId);
}

function getCollection(name: string) {
  return mongoose.connection.db?.collection(name);
}

function getBaseUrl(req: Request) {
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

function normalizeDateForQuery(value: unknown) {
  const clean = cleanString(value);

  if (!clean) return null;

  const date = new Date(clean);

  if (Number.isNaN(date.getTime())) {
    return clean;
  }

  return date;
}

export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json().catch(() => ({}));

    const name = cleanString(body?.name);
    const email = cleanString(body?.email).toLowerCase();
    const password = String(body?.password || "");
    const phone = cleanString(body?.phone);

    /*
      הרשמה דרך אולם:
      מגיעה מעמוד הרשמה עם venueInviteToken.
      כאן לא פותחים עדיין חבילה ולא יוצרים הושבה.
      רק מזהים את האירוע, שומרים על המשתמש את נתוני האולם,
      ושומרים את התבנית שבעל האולם בחר מראש.
    */
    const registrationSource = cleanString(body?.registrationSource);
    const venueInviteToken = cleanString(body?.venueInviteToken);

    const isVenueClientRegistration =
      registrationSource === "venue" || Boolean(venueInviteToken);

    const bodyVenueClientHallId =
      cleanString(body?.venueClientHallId) ||
      cleanString(body?.hallId) ||
      cleanString(body?.venueHallId) ||
      cleanString(body?.assignedHallId);

    /*
      חשוב:
      createdByProducer במודל User הוא ObjectId.
      לכן אסור לשמור בו true/false.
      אם מגיע id תקין של מפיק — נשמור ObjectId.
      אם לא — נשמור null.
    */
    const producerObjectId = getProducerObjectId(body?.createdByProducer);
    const isCreatedByProducer = Boolean(producerObjectId);

    /* ============================================================
       Validation
    ============================================================ */

    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, error: "נא למלא את כל השדות" },
        { status: 400 }
      );
    }

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!emailOk) {
      return NextResponse.json(
        { success: false, error: "אימייל לא תקין" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: "הסיסמה חייבת להכיל לפחות 6 תווים" },
        { status: 400 }
      );
    }

    if (isVenueClientRegistration && !venueInviteToken) {
      return NextResponse.json(
        { success: false, error: "חסר קישור אולם / טוקן אולם" },
        { status: 400 }
      );
    }

    const existing = await User.findOne({ email }).lean();

    if (existing) {
      return NextResponse.json(
        { success: false, error: "המייל כבר קיים במערכת" },
        { status: 400 }
      );
    }

    /* ============================================================
       Load venue invite event
       רק בהרשמה דרך אולם.
    ============================================================ */

    let venueEvent: any = null;

    if (isVenueClientRegistration) {
      const events = getCollection("events");

      if (!events) {
        return NextResponse.json(
          { success: false, error: "לא נמצאה קולקשן events" },
          { status: 500 }
        );
      }

      venueEvent = await events.findOne({
        venueClientInviteToken: venueInviteToken,
        venueClientInviteStatus: { $in: ["sent", "opened", "pending"] },
      });

      if (!venueEvent) {
        return NextResponse.json(
          {
            success: false,
            error: "קישור האולם לא תקין או שכבר אינו פעיל",
          },
          { status: 404 }
        );
      }

      const selectedTemplateId = toObjectId(
        venueEvent?.venueClientSelectedSeatingTemplateId
      );

      if (!selectedTemplateId) {
        return NextResponse.json(
          {
            success: false,
            error:
              "לא נבחרה תבנית הושבה לאירוע הזה. יש לבקש מהאולם ליצור קישור חדש עם תבנית.",
          },
          { status: 400 }
        );
      }
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const venueHallId =
      cleanString(venueEvent?.venueClientVenueHallId) ||
      cleanString(venueEvent?.venueHallId) ||
      bodyVenueClientHallId;

    const venueHallName =
      cleanString(venueEvent?.venueClientVenueHallName) ||
      cleanString(venueEvent?.venueHallName);

    const venueOwnerId =
      toObjectId(venueEvent?.venueClientVenueOwnerId) ||
      toObjectId(venueEvent?.venueOwnerId) ||
      null;

    const venueEventId =
      toObjectId(venueEvent?.venueClientEventId) ||
      toObjectId(venueEvent?._id) ||
      null;

    const venueSeatingTemplateId = toObjectId(
      venueEvent?.venueClientSelectedSeatingTemplateId
    );

    const venueSeatingTemplateName = cleanString(
      venueEvent?.venueClientSelectedSeatingTemplateName
    );

    const venueClientRecordsCount = Number(
      venueEvent?.venueClientRecordsCount || 0
    );

    const venueClientPackageType =
      cleanString(venueEvent?.venueClientPackageType) || "seating_only";

    const canonicalVenueInviteToken = isVenueClientRegistration
      ? cleanString(venueEvent?.venueClientInviteToken) || venueInviteToken
      : "";

    /* ============================================================
       Create user
       הרשמה רגילה / הרשמה דרך אולם / יצירה עתידית ע"י מפיק
    ============================================================ */

    const user = await User.create({
      name,
      email,
      phone,
      password: hashedPassword,

      role: "user",

      /*
        בהרשמה דרך אולם לא פותחים עדיין חבילה כאן.
        החבילה תיפתח בעמוד /venue-client/packages.
        לכן המשתמש עדיין לא פעיל עד בחירת החבילה.
      */
      plan: "plan1",
      hasPaid: false,
      paidAmount: 0,

      isActive: false,
      hasDashboardAccess: false,
      isTrial: false,

      guests: 0,
      maxGuests: 0,

      maxMessages: 0,
      remainingMessages: 0,

      smsBalance: 0,
      smsUsed: 0,

      whatsappBalance: 0,
      whatsappUsed: 0,

      includeCalls: false,
      includeCreditGifts: false,
      includeSeating: false,
      includeDigitalSeating: false,
      includeSystem: false,
      includeDesign: false,

      /*
        שדות לקוח אולם:
        כאן נשמר החיבור הראשוני בלבד.
        לא יוצרים כאן הושבה ולא נוגעים בלייב.
      */
      venueClientSource: isVenueClientRegistration,
      venueInviteToken: isVenueClientRegistration
        ? canonicalVenueInviteToken
        : undefined,

      venueOwnerId: isVenueClientRegistration ? venueOwnerId : undefined,

      venueHallId: isVenueClientRegistration ? venueHallId : undefined,
      venueHallName: isVenueClientRegistration ? venueHallName : undefined,

      venueClientHallId: isVenueClientRegistration ? venueHallId : undefined,
      venueClientHallName: isVenueClientRegistration ? venueHallName : undefined,

      venueClientPackageType: isVenueClientRegistration
        ? venueClientPackageType
        : undefined,

      venueClientPaymentStatus: isVenueClientRegistration
        ? "pending"
        : undefined,

      venueClientPaymentAmount: isVenueClientRegistration ? 0 : undefined,

      venueClientRecordsCount: isVenueClientRegistration
        ? venueClientRecordsCount
        : undefined,

      /*
        זה השדה הקריטי:
        בעל האולם בחר תבנית באירוע.
        כאן אנחנו רק שומרים אותה על המשתמש.
        ההעתקה בפועל להושבה הרגילה תקרה בשלב /venue-client/packages.
      */
      venueSeatingTemplateId: isVenueClientRegistration
        ? venueSeatingTemplateId
        : undefined,

      venueSeatingTemplateName: isVenueClientRegistration
        ? venueSeatingTemplateName
        : undefined,

      venueSeatingTemplateImportedAt: null,

      venueClientEventId: isVenueClientRegistration
        ? venueEventId
        : undefined,

      venueClientEventTitle: isVenueClientRegistration
        ? cleanString(venueEvent?.venueClientEventTitle) ||
          cleanString(venueEvent?.title) ||
          cleanString(venueEvent?.eventName) ||
          "אירוע"
        : undefined,

      venueClientEventDate: isVenueClientRegistration
        ? normalizeDateForQuery(
            venueEvent?.venueClientEventDate ||
              venueEvent?.date ||
              venueEvent?.eventDate
          )
        : undefined,

      venueClientEventTime: isVenueClientRegistration
        ? cleanString(
            venueEvent?.venueClientEventTime ||
              venueEvent?.time ||
              venueEvent?.startTime
          )
        : undefined,

      /*
        כאן התיקון:
        לא שולחים false לשדה ObjectId.
      */
      createdByProducer: producerObjectId,

      needsPasswordSetup: !isCreatedByProducer,

      billingSource: isCreatedByProducer
        ? "producer"
        : isVenueClientRegistration
          ? "venue"
          : "site",
    });

    const userId = String(user._id);

    /* ============================================================
       Update event after venue registration
       מסמנים שהלקוח נרשם ומחברים את המשתמש לאירוע.
       לא יוצרים כאן seatingtables.
    ============================================================ */

    if (isVenueClientRegistration && venueEvent?._id) {
      const events = getCollection("events");
      const now = new Date();

      await events?.updateOne(
        {
          _id: venueEvent._id,
          venueClientInviteToken: canonicalVenueInviteToken,
        },
        {
          $set: {
            venueClientInviteStatus: "registered",
            venueClientRegisteredAt: now,

            venueClientUserId: user._id,
            venueClientUserEmail: email,
            venueClientUserName: name,
            venueClientUserPhone: phone,

            updatedAt: now,
          },
        }
      );
    }

    /* ============================================================
       If created by producer → no login
    ============================================================ */

    if (isCreatedByProducer) {
      return NextResponse.json({
        success: true,
        userId,
      });
    }

    /* ============================================================
       Issue JWT
       גם בהרשמה דרך אולם צריך cookie כדי שהמשתמש יוכל להמשיך לחבילות.
    ============================================================ */

    if (!process.env.JWT_SECRET) {
      return NextResponse.json(
        { success: false, error: "JWT secret missing" },
        { status: 500 }
      );
    }

    const token = jwt.sign(
      {
        userId,
        role: "user",
        hasPaid: false,
        email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const baseUrl = getBaseUrl(req);

    const redirectUrl = isVenueClientRegistration
      ? `${baseUrl}/venue-client/packages?venueInviteToken=${encodeURIComponent(
          canonicalVenueInviteToken
        )}&userId=${encodeURIComponent(userId)}&email=${encodeURIComponent(
          email
        )}&venueClientHallId=${encodeURIComponent(venueHallId || "")}`
      : "/dashboard";

    const res = NextResponse.json({
      success: true,
      userId,
      redirectUrl,
      isVenueClientRegistration,
    });

    const isProd = process.env.NODE_ENV === "production";
    const cookieDomain = isProd ? ".invistimo.com" : undefined;

    res.cookies.set("authToken", token, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      ...(cookieDomain ? { domain: cookieDomain } : {}),
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    res.cookies.set("role", "user", {
      httpOnly: false,
      secure: isProd,
      sameSite: "lax",
      ...(cookieDomain ? { domain: cookieDomain } : {}),
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (error) {
    console.error("REGISTER ERROR:", error);

    return NextResponse.json(
      { success: false, error: "שגיאה בשרת" },
      { status: 500 }
    );
  }
}