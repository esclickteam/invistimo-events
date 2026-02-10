import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

import dbConnect from "@/lib/db";
import User from "@/models/User";

/* =========================================================
   Cookie helpers
========================================================= */
function getCookieDomain() {
  return process.env.NODE_ENV === "production" ? ".invistimo.com" : undefined;
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

/* =========================
   POST /api/producer/stop-impersonation
========================= */
export async function POST(_req: NextRequest) {
  console.log("🟡 [Stop Impersonation] Request received");

  try {
    await dbConnect();

    const cookieStore = await cookies();

    const producerAuthToken =
      cookieStore.get("producerAuthToken")?.value || null;

    if (!producerAuthToken) {
      return NextResponse.json(
        { success: false, message: "No active impersonation session" },
        { status: 401 }
      );
    }

    // verify token (must be producer)
    let decoded: any;
    try {
      decoded = jwt.verify(producerAuthToken, process.env.JWT_SECRET!);
    } catch (err) {
      console.error("❌ Invalid producerAuthToken", err);

      // מחזירים תשובה + מוחקים כדי לא להיתקע בלופ
      const res = NextResponse.json(
        { success: false, message: "Invalid producer session" },
        { status: 401 }
      );
      res.cookies.set("producerAuthToken", "", deleteCookieOptions());
      return res;
    }

    const producerId = decoded?.userId || decoded?.id || decoded?._id || null;
    const role = decoded?.role;

    if (!producerId || role !== "producer") {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 }
      );
    }

    // ensure producer exists
    const producer = await User.findById(producerId).select("_id role").lean();

    if (!producer || producer.role !== "producer") {
      return NextResponse.json(
        { success: false, message: "Producer not found" },
        { status: 403 }
      );
    }

    // ✅ restore producer session and delete producerAuthToken
    const res = NextResponse.json({ success: true, role: "producer" });

    res.cookies.set("authToken", producerAuthToken, httpOnlyCookieOptions());
    res.cookies.set("producerAuthToken", "", deleteCookieOptions());
res.cookies.set("impersonationToken", "", deleteCookieOptions());

    console.log("✅ Impersonation stopped, producer restored");

    return res;
  } catch (err) {
    console.error("❌ [Stop Impersonation] Error:", err);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}
