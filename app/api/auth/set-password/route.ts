import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { connectDB } from "@/lib/db";
import User from "@/models/User";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SetPasswordBody = {
  token?: string;
  password?: string;
};

function normalizeAllowedMessageRounds(value: any): 2 | 3 {
  return Number(value) === 3 ? 3 : 2;
}

export async function POST(req: Request) {
  try {
    console.log("🟢 SET PASSWORD API HIT");

    const body = (await req.json()) as SetPasswordBody;
    const rawToken = body?.token;
    const rawPassword = body?.password;

    console.log("📦 BODY RECEIVED:", {
      hasToken: !!rawToken,
      passwordLength: rawPassword?.length ?? 0,
    });

    const token = String(rawToken ?? "").trim();
    const password = String(rawPassword ?? "");

    /* =========================
       VALIDATION
    ========================= */
    if (!token || !password) {
      console.log("❌ MISSING DATA", {
        hasToken: !!token,
        hasPassword: !!password,
      });

      return NextResponse.json(
        { success: false, message: "חסרים נתונים" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
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
       ✅ חשוב:
       חייבים להביא גם allowedMessageRounds וגם planLimits
       אחרת user.save() מפעיל defaults ומחזיר ל־2.
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

        producerPricePerRecord
        staffType
        assignedProducerId
        billingSource
        hasPaid

        allowedMessageRounds
        planLimits
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

    if (!user.needsPasswordSetup) {
      console.log("❌ PASSWORD ALREADY SET");

      return NextResponse.json(
        { success: false, message: "הסיסמה כבר הוגדרה עבור חשבון זה" },
        { status: 400 }
      );
    }

    /*
      ✅ שמירת הערך לפני save
      אם אחד מהם 3 — נשאיר 3.
    */
    const allowedMessageRounds = normalizeAllowedMessageRounds(
      Number((user as any).allowedMessageRounds) === 3 ||
        Number((user as any).planLimits?.allowedMessageRounds) === 3
        ? 3
        : 2
    );

    (user as any).allowedMessageRounds = allowedMessageRounds;

    (user as any).planLimits = {
      ...((user as any).planLimits || {}),
      allowedMessageRounds,
    };

    /* =========================
       SET PASSWORD
    ========================= */
    console.log("🔑 HASHING PASSWORD...");

    user.password = await bcrypt.hash(password, 10);

    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.needsPasswordSetup = false;

    await user.save();

    /*
      ✅ הגנה נוספת אחרי save:
      מוודאים שלא נדרס חזרה ל־2 בזמן ה־hook.
    */
    await User.findByIdAndUpdate(user._id, {
      $set: {
        allowedMessageRounds,
        "planLimits.allowedMessageRounds": allowedMessageRounds,
      },
    });

    console.log("✅ PASSWORD SAVED", {
      userId: user._id.toString(),
      allowedMessageRounds,
    });

    /* =========================
       NORMALIZE FIELDS
    ========================= */
    const role = String(user.role ?? "").toLowerCase().trim();
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
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    console.log("Generated JWT");

    /* =========================
       RESPONSE + COOKIE
    ========================= */
    const safeUser = {
      _id: user._id.toString(),
      name: user.name ?? "",
      email: user.email ?? "",
      role,
      hasPaid,

      allowedMessageRounds,

      planLimits: {
        ...((user as any).planLimits || {}),
        allowedMessageRounds,
      },

      staffType: user.staffType ?? null,
      assignedProducerId: user.assignedProducerId
        ? user.assignedProducerId.toString()
        : null,
      producerPricePerRecord: Number(user.producerPricePerRecord ?? 0),
    };

    let redirectTo = "/dashboard";

    if (role === "admin") {
      redirectTo = "/admin";
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