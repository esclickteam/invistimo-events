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
    ========================= */
    const user = await User.findOne({ resetPasswordToken: token }).select(
      "_id name email role password resetPasswordToken resetPasswordExpires needsPasswordSetup producerPricePerRecord staffType assignedProducerId billingSource hasPaid"
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

    /* =========================
       SET PASSWORD
    ========================= */
    console.log("🔑 HASHING PASSWORD...");
    user.password = await bcrypt.hash(password, 10);

    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.needsPasswordSetup = false;

    await user.save();
    console.log("✅ PASSWORD SAVED");

    /* =========================
       NORMALIZE ROLE FIELDS
    ========================= */
    const role = String(user.role ?? "").toLowerCase().trim();
    const staffType = String(user.staffType ?? "").toLowerCase().trim();
    const billingSource = String((user as any).billingSource ?? "")
      .toLowerCase()
      .trim();

    const hasPaid = user.hasPaid === true;

    /* =========================
       CREATE JWT
    ========================= */
    console.log("User hasPaid status before JWT creation:", hasPaid);

    const authToken = jwt.sign(
      {
        userId: user._id.toString(),
        role, // normalized
        email: user.email,
        hasPaid, // always boolean
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    console.log("Generated JWT:", authToken);

    /* =========================
       RESPONSE + COOKIE
    ========================= */
    const safeUser = {
      _id: user._id.toString(),
      name: user.name ?? "",
      email: user.email ?? "",
      role,
      hasPaid, // ✅ חשוב לפרונט
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
    } else if (role === "staff") {
      const isProducerStaff =
        staffType === "producer_staff" ||
        !!user.assignedProducerId ||
        billingSource === "producer" ||
        billingSource === "admin";

      if (isProducerStaff) {
        redirectTo = "/producer-staff/dashboard";
      }
    }

    console.log("🔀 REDIRECT DECISION", {
      userId: safeUser._id,
      role,
      staffType,
      assignedProducerId: safeUser.assignedProducerId,
      billingSource,
      hasPaid,
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
      maxAge: 60 * 60 * 24 * 7, // 7 ימים
    });

    // clear optional tokens
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
