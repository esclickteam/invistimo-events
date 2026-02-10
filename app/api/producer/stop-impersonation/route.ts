import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

import dbConnect from "@/lib/db";
import User from "@/models/User";

/* =========================================================
   Cookie helpers
========================================================= */
function getCookieDomain() {
  return process.env.NODE_ENV === "production"
    ? ".invistimo.com"
    : undefined;
}

function httpOnlyCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    domain: getCookieDomain(),
  };
}

function deleteCookieOptions() {
  return {
    ...httpOnlyCookieOptions(),
    maxAge: 0,
  };
}

/* =========================================================
   POST /api/producer/stop-impersonation
========================================================= */
export async function POST(_req: NextRequest) {
  try {
    await dbConnect();
    const cookieStore = await cookies();

    const producerAuthToken =
      cookieStore.get("producerAuthToken")?.value;

    if (!producerAuthToken) {
      return NextResponse.json(
        { success: false, message: "No active impersonation" },
        { status: 401 }
      );
    }

    // 🔐 verify producer token
    let decoded: any;
    try {
      decoded = jwt.verify(
        producerAuthToken,
        process.env.JWT_SECRET!
      );
    } catch {
      const res = NextResponse.json(
        { success: false, message: "Invalid producer token" },
        { status: 401 }
      );
      res.cookies.set(
        "producerAuthToken",
        "",
        deleteCookieOptions()
      );
      res.cookies.set(
        "impersonationToken",
        "",
        deleteCookieOptions()
      );
      return res;
    }

    const producerId = decoded.userId || decoded._id;
    if (!producerId || decoded.role !== "producer") {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 }
      );
    }

    const producer = await User.findById(producerId)
      .select("_id role")
      .lean();

    if (!producer) {
      return NextResponse.json(
        { success: false, message: "Producer not found" },
        { status: 404 }
      );
    }

    // ✅ restore producer session
    const res = NextResponse.json({
      success: true,
      restoredRole: "producer",
    });

    res.cookies.set(
      "authToken",
      producerAuthToken,
      httpOnlyCookieOptions()
    );

    // 🧹 clean impersonation completely
    res.cookies.set(
      "producerAuthToken",
      "",
      deleteCookieOptions()
    );
    res.cookies.set(
      "impersonationToken",
      "",
      deleteCookieOptions()
    );

    return res;
  } catch (err) {
    console.error("❌ stop-impersonation error:", err);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}
