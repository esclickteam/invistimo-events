import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { connectDB } from "@/lib/db";
import User from "@/models/User";
import SalesDocument from "@/models/SalesDocument";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SetPasswordBody = {
  token?: string;
  password?: string;
  action?: string;
  acceptedTerms?: boolean;
};

function normalizeAllowedMessageRounds(value: any): 2 | 3 {
  return Number(value) === 3 ? 3 : 2;
}

async function getOnboardingAgreementState(user: any) {
  const requireAgreementBeforePassword = Boolean(
    user?.requireAgreementBeforePassword,
  );
  const agreementToken = String(user?.onboardingAgreementToken || "").trim();
  const alreadyMarkedSigned = Boolean(user?.onboardingAgreementSignedAt);

  if (!requireAgreementBeforePassword) {
    return {
      requireAgreementBeforePassword: false,
      agreementToken: "",
      agreementUrl: "",
      agreementSigned: true,
    };
  }

  if (!agreementToken) {
    return {
      requireAgreementBeforePassword: true,
      agreementToken: "",
      agreementUrl: "",
      agreementSigned: false,
    };
  }

  const document = await SalesDocument.findOne({ token: agreementToken })
    .select("token url status signedAt")
    .lean();

  const agreementSigned =
    alreadyMarkedSigned ||
    String((document as any)?.status || "").toLowerCase() === "signed";

  return {
    requireAgreementBeforePassword: true,
    agreementToken,
    agreementUrl: String((document as any)?.url || "").trim(),
    agreementSigned,
  };
}

function normalizeAccessModules(user: any) {
  const role = String(user?.role || "").toLowerCase().trim();

  if (role === "venue_owner") {
    return {
      rsvpSeating: false,
      eventProduction: false,
      venueDashboard: true,
    };
  }

  const includeDigitalSeating =
    Boolean(user?.includeDigitalSeating) ||
    Boolean(user?.planLimits?.seatingEnabled);

  const includeEventManagement =
    Boolean(user?.includeEventManagement) ||
    Boolean(user?.selfManageEnabled);

  return {
    rsvpSeating: Boolean(
      user?.accessModules?.rsvpSeating ?? includeDigitalSeating
    ),
    eventProduction: Boolean(
      user?.accessModules?.eventProduction ?? includeEventManagement
    ),
    venueDashboard: Boolean(user?.accessModules?.venueDashboard),
  };
}

export async function GET(req: Request) {
  try {
    const token = new URL(req.url).searchParams.get("token")?.trim() || "";

    if (!token) {
      return NextResponse.json(
        { success: false, message: "הקישור אינו תקף או חסר טוקן" },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findOne({ resetPasswordToken: token })
      .select(
        `
        _id
        name
        resetPasswordExpires
        requireAgreementBeforePassword
        onboardingAgreementToken
        onboardingAgreementSignedAt
        termsAcceptedAt
      `
      )
      .lean();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "הקישור אינו תקף או שפג תוקפו" },
        { status: 400 }
      );
    }

    if (
      !(user as any).resetPasswordExpires ||
      (user as any).resetPasswordExpires < new Date()
    ) {
      return NextResponse.json(
        { success: false, message: "הקישור פג תוקף" },
        { status: 400 }
      );
    }

    const agreementState = await getOnboardingAgreementState(user);

    return NextResponse.json({
      success: true,
      valid: true,
      name: String((user as any).name || ""),
      requireAgreementBeforePassword:
        agreementState.requireAgreementBeforePassword,
      agreementToken: agreementState.agreementToken,
      agreementUrl: agreementState.agreementUrl,
      agreementSigned: agreementState.agreementSigned,
      termsAcceptedAt: (user as any).termsAcceptedAt
        ? new Date((user as any).termsAcceptedAt).toISOString()
        : null,
    });
  } catch (error) {
    console.error("SET PASSWORD STATUS FAILED:", error);

    return NextResponse.json(
      { success: false, message: "שגיאה בשרת" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    console.log("🟢 SET PASSWORD API HIT");

    const body = (await req.json()) as SetPasswordBody;
    const rawToken = body?.token;
    const rawPassword = body?.password;
    const action = String(body?.action || "").trim();

    console.log("📦 BODY RECEIVED:", {
      hasToken: !!rawToken,
      passwordLength: rawPassword?.length ?? 0,
    });

    const token = String(rawToken ?? "").trim();
    const password = String(rawPassword ?? "");
    const isAcceptTerms = action === "accept-terms";

    /* =========================
       VALIDATION
    ========================= */
    if (!token) {
      return NextResponse.json(
        { success: false, message: "חסרים נתונים" },
        { status: 400 }
      );
    }

    if (!isAcceptTerms && !password) {
      return NextResponse.json(
        { success: false, message: "חסרים נתונים" },
        { status: 400 }
      );
    }

    if (!isAcceptTerms && password.length < 6) {
      console.log("❌ PASSWORD TOO SHORT");

      return NextResponse.json(
        { success: false, message: "הסיסמה חייבת להכיל לפחות 6 תווים" },
        { status: 400 }
      );
    }

    if (!process.env.JWT_SECRET) {
      console.error("❌ JWT_SECRET IS MISSING");

      return NextResponse.json(
        { success: false, message: "שגיאת תצורת שרת (JWT_SECRET חסר)" },
        { status: 500 }
      );
    }

    await connectDB();
    console.log("✅ DB CONNECTED");

    /* =========================
       FIND USER BY TOKEN
    ========================= */
    const user = await User.findOne({ resetPasswordToken: token }).select(
  `
    _id
    name
    email
    role
    password

    resetPasswordToken
    resetPasswordExpires
    needsPasswordSetup
    requireAgreementBeforePassword
    onboardingAgreementToken
    onboardingAgreementSignedAt
    termsAcceptedAt

    producerPricePerRecord
    staffType
    assignedProducerId
    billingSource
    hasPaid

    allowedMessageRounds
    planLimits

    includeCalls
    callsRounds
    callRoundsSchedule

    includeDigitalSeating
    includeEventManagement
    selfManageEnabled
    accessModules
  `
);

    console.log("👤 USER FOUND:", user ? user._id.toString() : null);

    if (!user) {
      console.log("❌ NO USER WITH TOKEN");

      return NextResponse.json(
        { success: false, message: "הקישור אינו תקף או שפג תוקפו" },
        { status: 400 }
      );
    }

    if (!user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
      console.log("❌ TOKEN EXPIRED");

      return NextResponse.json(
        { success: false, message: "הקישור פג תוקף" },
        { status: 400 }
      );
    }

    const agreementState = await getOnboardingAgreementState(user);

    if (isAcceptTerms) {
      const existing = (user as any).termsAcceptedAt;
      const acceptedAt = existing ? new Date(existing) : new Date();

      if (!existing) {
        await User.updateOne(
          { _id: user._id },
          { $set: { termsAcceptedAt: acceptedAt } }
        );
      }

      return NextResponse.json({
        success: true,
        termsAcceptedAt: acceptedAt.toISOString(),
      });
    }

    if (!(user as any).termsAcceptedAt && !body?.acceptedTerms) {
      return NextResponse.json(
        {
          success: false,
          error: "TERMS_REQUIRED",
          message: "יש לקרוא ולאשר את התקנון לפני שמירת הסיסמה",
        },
        { status: 403 }
      );
    }

    if (
      agreementState.requireAgreementBeforePassword &&
      !agreementState.agreementSigned
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "AGREEMENT_SIGNATURE_REQUIRED",
          message: "יש לחתום על ההסכם לפני שמירת הסיסמה והפעלת המשתמש",
          requireAgreementBeforePassword: true,
          agreementToken: agreementState.agreementToken,
          agreementUrl: agreementState.agreementUrl,
          agreementSigned: false,
        },
        { status: 403 }
      );
    }

    // Allow both first-time setup and later token-based resets.
    // needsPasswordSetup is cleared when the password is saved below.

    /* =========================
       NORMALIZE ROLE
    ========================= */
    const role = String(user.role ?? "").toLowerCase().trim();
    const isVenueOwner = role === "venue_owner";

    /*
      ✅ בעל אולם לא משתמש בסבבי הודעות.
      משאירים 2 רק כדי לא לשבור שדות קיימים במודל/טוקן.
    */
    const allowedMessageRounds = isVenueOwner
      ? 2
      : normalizeAllowedMessageRounds(
          Number((user as any).allowedMessageRounds) === 3 ||
            Number((user as any).planLimits?.allowedMessageRounds) === 3
            ? 3
            : 2
        );

    /*
      ✅ הרשאות מודולים:
      לבעל אולם חייבים לשמור venueDashboard:true
      ולא להדליק בטעות RSVP או הפקת אירוע.
    */
    const accessModules = normalizeAccessModules(user);

    (user as any).allowedMessageRounds = allowedMessageRounds;

    (user as any).planLimits = {
      ...((user as any).planLimits || {}),
      allowedMessageRounds,
      seatingEnabled: isVenueOwner ? false : accessModules.rsvpSeating,
    };

    (user as any).accessModules = accessModules;
    (user as any).includeDigitalSeating = isVenueOwner
      ? false
      : accessModules.rsvpSeating;
    (user as any).includeEventManagement = isVenueOwner
      ? false
      : accessModules.eventProduction;
    (user as any).selfManageEnabled = isVenueOwner
      ? false
      : accessModules.eventProduction;

    /* =========================
       SET PASSWORD
    ========================= */
    console.log("🔑 HASHING PASSWORD...");

    const hashedPassword = await bcrypt.hash(password, 10);
    const termsAcceptedAt = (user as any).termsAcceptedAt
      ? new Date((user as any).termsAcceptedAt)
      : new Date();

    /*
      חשוב מאוד:
      לא משתמשים כאן ב-user.save().
      save מפעיל hooks של User ועלול לבנות מחדש שדות שלא נטענו ב-select,
      כולל salesUpsells.preRsvpMessages, ואז להפוך אותם ל-false/default.

      לכן מעדכנים רק את השדות שקשורים להגדרת הסיסמה והרשאות קיימות,
      בלי לגעת בשום salesUpsells / preRsvpMessages.
    */
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          password: hashedPassword,
          needsPasswordSetup: false,
          termsAcceptedAt,

          allowedMessageRounds,
          "planLimits.allowedMessageRounds": allowedMessageRounds,
          "planLimits.seatingEnabled": isVenueOwner
            ? false
            : accessModules.rsvpSeating,

          accessModules,

          includeDigitalSeating: isVenueOwner
            ? false
            : accessModules.rsvpSeating,

          includeEventManagement: isVenueOwner
            ? false
            : accessModules.eventProduction,

          selfManageEnabled: isVenueOwner
            ? false
            : accessModules.eventProduction,
        },
        $unset: {
          resetPasswordToken: "",
          resetPasswordExpires: "",
        },
      }
    );

    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.needsPasswordSetup = false;

    try {
      const { revokeTelnyxWebRtcForUser } = await import(
        "@/lib/telnyx/webrtcCredentials"
      );
      await revokeTelnyxWebRtcForUser(user._id.toString(), "password_changed");
    } catch {
      console.error("TELNYX WEBRTC REVOKE ON SET PASSWORD FAILED");
    }

    console.log("✅ PASSWORD SAVED", {
      userId: user._id.toString(),
      role,
      allowedMessageRounds,
      accessModules,
    });

    /* =========================
       NORMALIZE FIELDS
    ========================= */
    const staffType = String(user.staffType ?? "").toLowerCase().trim();

    const billingSource = String((user as any).billingSource ?? "")
      .toLowerCase()
      .trim();

    const hasPaid = user.hasPaid === true;

    console.log("🔎 NORMALIZED USER FLAGS:", {
      role,
      staffType,
      assignedProducerId: user.assignedProducerId?.toString?.() ?? null,
      billingSource,
      hasPaid,
      allowedMessageRounds,
      accessModules,
    });

    /* =========================
       CREATE JWT
    ========================= */
    const authToken = jwt.sign(
      {
        userId: user._id.toString(),
        role,
        email: user.email,
        hasPaid,
        allowedMessageRounds,
        accessModules,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    console.log("Generated JWT");

    /* =========================
       SAFE USER
    ========================= */
    const safeUser = {
      _id: user._id.toString(),
      name: user.name ?? "",
      email: user.email ?? "",
      role,
      hasPaid,

      allowedMessageRounds,
      accessModules,

      planLimits: {
        ...((user as any).planLimits || {}),
        allowedMessageRounds,
        seatingEnabled: isVenueOwner ? false : accessModules.rsvpSeating,
      },

      includeDigitalSeating: isVenueOwner
        ? false
        : accessModules.rsvpSeating,

      includeEventManagement: isVenueOwner
        ? false
        : accessModules.eventProduction,

      selfManageEnabled: isVenueOwner
        ? false
        : accessModules.eventProduction,

      staffType: user.staffType ?? null,
      assignedProducerId: user.assignedProducerId
        ? user.assignedProducerId.toString()
        : null,
      producerPricePerRecord: Number(user.producerPricePerRecord ?? 0),
    };

    /* =========================
       REDIRECT
    ========================= */
    let redirectTo = "/dashboard";

    if (role === "admin") {
      redirectTo = "/admin";
    } else if (role === "venue_owner") {
      redirectTo = "/venues/dashboard";
    } else if (role === "producer") {
      redirectTo = "/producer/dashboard";
    } else {
      const isProducerStaffRole =
        role === "staff" ||
        role === "producer_staff" ||
        role === "staff_producer";

      const isProducerStaffByMeta =
        staffType === "producer_staff" ||
        !!user.assignedProducerId ||
        billingSource === "producer" ||
        billingSource === "admin";

      if (isProducerStaffRole && isProducerStaffByMeta) {
        redirectTo = "/producer-staff/dashboard";
      } else if (isProducerStaffRole) {
        redirectTo = "/producer-staff/dashboard";
      } else if (
        accessModules.eventProduction === true &&
        accessModules.rsvpSeating === false
      ) {
        redirectTo = "/events/production";
      } else {
        redirectTo = "/dashboard";
      }
    }

    console.log("🔀 REDIRECT DECISION:", {
      userId: safeUser._id,
      role,
      staffType,
      assignedProducerId: safeUser.assignedProducerId,
      billingSource,
      hasPaid,
      allowedMessageRounds,
      accessModules,
      redirectTo,
    });

    const response = NextResponse.json({
      success: true,
      message: "הסיסמה הוגדרה בהצלחה 🎉",
      user: safeUser,
      redirectTo,
    });

    response.cookies.set({
      name: "authToken",
      value: authToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    response.cookies.set({
      name: "producerAuthToken",
      value: "",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    response.cookies.set({
      name: "adminAuthToken",
      value: "",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    console.log("🍪 AUTH COOKIE SET", {
      userId: safeUser._id,
      role: safeUser.role,
      hasPaid: safeUser.hasPaid,
      allowedMessageRounds,
      accessModules,
      redirectTo,
    });

    return response;
  } catch (error) {
    console.error("🔥 SET PASSWORD SERVER ERROR:", error);

    return NextResponse.json(
      { success: false, message: "שגיאה בשרת" },
      { status: 500 }
    );
  }
}