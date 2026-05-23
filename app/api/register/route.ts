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
      בשלב הזה עדיין לא חייבים לפתוח חבילת הושבה,
      כי אחרי ההרשמה המשתמש עובר לעמוד בחירת חבילה של לקוח אולם.
    */
    const registrationSource = cleanString(body?.registrationSource);
    const venueInviteToken = cleanString(body?.venueInviteToken);

    const isVenueClientRegistration =
      registrationSource === "venue" || Boolean(venueInviteToken);

    /*
      אם בעתיד תשלחי כבר hallId בהרשמה — נשמור אותו.
      אם לא, הוא יישמר בשלב הבא בעמוד /venue-client/packages
      אחרי שהשרת יפענח את venueInviteToken.
    */
    const venueClientHallId =
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

    const hashedPassword = await bcrypt.hash(password, 12);

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
      */
      plan: "plan1",
      hasPaid: false,
      paidAmount: 0,

      isActive: false,
      hasDashboardAccess: false,
      isTrial: false,

      guests: 0,

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
        אלה חשובים כדי שבשלב הבא נדע שהמשתמש הגיע מאולם,
        ונוכל לפתוח לו חבילת הושבה/אישורי הגעה בהתאם.
      */
      venueClientSource: isVenueClientRegistration,
      venueInviteToken: isVenueClientRegistration ? venueInviteToken : undefined,
      venueClientHallId: venueClientHallId || undefined,

      /*
        כאן התיקון:
        לא שולחים false לשדה ObjectId.
      */
      createdByProducer: producerObjectId,

      needsPasswordSetup: !isCreatedByProducer,

      billingSource: isCreatedByProducer
  ? "producer"
  : isVenueClientRegistration
    ? "pricing"
    : "site",
    });

    const userId = String(user._id);

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

    const res = NextResponse.json({
      success: true,
      userId,
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