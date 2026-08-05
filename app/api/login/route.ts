import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "@/models/User";
import { connectDB } from "@/lib/db";
import {
  appendCookieDeletes,
  LOGIN_COOKIES_TO_CLEAR,
  setAuthCookie,
} from "@/lib/auth/clearAuthCookies";
import {
  phoneCoreDigits,
  phoneLookupVariants,
} from "@/lib/auth/phoneLookup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function looksLikeEmail(value: string) {
  return value.includes("@");
}

async function findLoginCandidates(identifier: string) {
  if (looksLikeEmail(identifier)) {
    const email = identifier.trim().toLowerCase();
    const user = await User.findOne({ email }).select("+password");
    return user ? [user] : [];
  }

  const variants = phoneLookupVariants(identifier);
  const users = variants.length
    ? await User.find({ phone: { $in: variants } })
        .select("+password")
        .sort({ updatedAt: -1 })
    : [];

  if (users.length > 0) return users;

  const core = phoneCoreDigits(identifier);
  if (core.length < 8) return [];

  const loosePattern = core.split("").join("\\D*");
  return User.find({ phone: { $regex: `${loosePattern}$` } })
    .select("+password")
    .sort({ updatedAt: -1 });
}

export async function POST(req: Request) {
  try {
    await connectDB();

    if (!process.env.JWT_SECRET) {
      console.error("❌ Missing JWT_SECRET");
      return NextResponse.json(
        { success: false, error: "שגיאת הגדרות שרת" },
        {
          status: 500,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    const body = await req.json();

    const identifier = String(body?.email || body?.phone || "")
      .trim()
      .toLowerCase();

    const password = String(body?.password || "");

    if (!identifier || !password) {
      return NextResponse.json(
        { success: false, error: "חסרים פרטי התחברות" },
        {
          status: 400,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    const candidates = await findLoginCandidates(identifier);

    if (!candidates.length) {
      return NextResponse.json(
        { success: false, error: "מייל/טלפון או סיסמה שגויים" },
        {
          status: 401,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    let user = null as (typeof candidates)[number] | null;

    for (const candidate of candidates) {
      const hash = String(candidate.password || "");
      if (!hash) continue;

      const match = await bcrypt.compare(password, hash);
      if (match) {
        user = candidate;
        break;
      }
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: "מייל/טלפון או סיסמה שגויים" },
        {
          status: 401,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    // Repair stuck flag after older reset-password saves.
    if (user.needsPasswordSetup) {
      await User.updateOne(
        { _id: user._id },
        { $set: { needsPasswordSetup: false } },
      );
      user.needsPasswordSetup = false;
    }

    /* ======================================================
       Business flags
    ====================================================== */

    const hasPaid = Boolean(user.hasPaid);
    const isTrial = Boolean(user.isTrial);

    const role = String(user.role || "user");
    const staffType = (user.staffType as string | null) ?? null;
    const employeeScope =
      (user.employeeScope as string | null) ?? null;

    const isUsherStaff =
      role === "staff" &&
      staffType === "usher_staff" &&
      employeeScope === "system";

    const isSystemStaff =
      role === "staff" &&
      employeeScope === "system" &&
      (staffType === "general_staff" || staffType === "usher_staff");

    const isProducerStaff =
      role === "staff" &&
      staffType === "producer_staff" &&
      employeeScope === "producer";

    const effectiveRole = isProducerStaff
      ? "producer_staff"
      : isSystemStaff
        ? "system_staff"
        : role;

    /* ======================================================
       JWT - 7 days
    ====================================================== */

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        role,
        hasPaid,
        isTrial,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    const res = NextResponse.json(
      {
        success: true,
        user: {
          _id: String(user._id),
          name: user.name ?? "",
          email: user.email ?? "",
          role,
          effectiveRole,
          staffType,
          employeeScope,
          isSystemStaff,
          isUsherStaff,
          isProducerStaff,
          hasPaid,
          isTrial,
          trialExpiresAt: user.trialExpiresAt ?? null,
          smsUsed: user.smsUsed ?? 0,
          smsLimit: user.planLimits?.smsLimit ?? 0,
        },
      },
      {
        headers: { "Cache-Control": "no-store" },
      }
    );

    /* ======================================================
       Clear stale cookies (host-only + .invistimo.com) via
       appended Set-Cookie headers — required for Safari/iPad
    ====================================================== */

    appendCookieDeletes(res, LOGIN_COOKIES_TO_CLEAR);

    /* ======================================================
       Auth token - HttpOnly
    ====================================================== */

    setAuthCookie(res, "authToken", token, { httpOnly: true });

    /* ======================================================
       Client-readable cookies - UX only
    ====================================================== */

    setAuthCookie(res, "role", role, { httpOnly: false });
    setAuthCookie(res, "hasPaid", String(hasPaid), { httpOnly: false });
    setAuthCookie(res, "isTrial", String(isTrial), { httpOnly: false });

    if (isTrial && user.trialExpiresAt) {
      setAuthCookie(
        res,
        "trialExpiresAt",
        String(user.trialExpiresAt.getTime()),
        { httpOnly: false }
      );
    }

    setAuthCookie(res, "smsUsed", String(user.smsUsed ?? 0), {
      httpOnly: false,
    });

    setAuthCookie(res, "smsLimit", String(user.planLimits?.smsLimit ?? 0), {
      httpOnly: false,
    });

    return res;
  } catch (error) {
    console.error("LOGIN ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "שגיאה בשרת",
      },
      {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }
}
