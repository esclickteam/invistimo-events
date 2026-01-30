export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

import dbConnect from "@/lib/db";
import User from "@/models/User";
import Event from "@/models/Event";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

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

/* =========================
   POST /api/producer/impersonate
========================= */
export async function POST(req: NextRequest) {
  console.log("🟡 [Producer Impersonate] Request received");

  try {
    await dbConnect();

    /* =========================
       🔐 Auth – מפיק אמיתי
    ========================= */
    const auth: any = await getUserIdFromRequest(req);

    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // ⭐️ אם כבר בהתחזות – לא עושים כלום
    if (auth.impersonated) {
      console.log("🟢 Already impersonated – skip");
      return NextResponse.json(
        { success: true, alreadyImpersonated: true },
        { status: 200 }
      );
    }

    const producer = await User.findById(auth.userId)
      .select("_id role")
      .lean();

    if (!producer || producer.role !== "producer") {
      return NextResponse.json(
        { success: false, message: "Forbidden – not producer" },
        { status: 403 }
      );
    }

    /* =========================
       📥 Input
    ========================= */
    const body = await req.json().catch(() => ({}));
    const clientId = body?.clientId;

    if (!clientId) {
      return NextResponse.json(
        { success: false, message: "Missing clientId" },
        { status: 400 }
      );
    }

    /* =========================
       👤 Client ownership
    ========================= */
    const client = await User.findOne({
  _id: clientId,
  $or: [
    { producerId: producer._id },
    { createdByProducer: producer._id },
  ],
})
  .select("_id")
  .lean();

if (!client) {
  return NextResponse.json(
    { success: false, message: "Client not found or not yours" },
    { status: 403 }
  );
}

    /* =========================
       🎬 Client Event
    ========================= */
    const event = await Event.findOne({
      userId: client._id,
    })
      .select("_id")
      .lean();

    if (!event) {
      return NextResponse.json(
        { success: false, message: "Event not found for client" },
        { status: 404 }
      );
    }

    /* =========================
       🍪 Cookies (read)
    ========================= */
    const cookieStore = await cookies();

    // זה הטוקן של המפיק לפני התחזות
    const currentAuthToken = cookieStore.get("authToken")?.value || null;
    const existingProducerToken =
      cookieStore.get("producerAuthToken")?.value || null;

    if (!currentAuthToken) {
      return NextResponse.json(
        { success: false, message: "Missing producer session" },
        { status: 401 }
      );
    }

    /* =========================
       🎭 Impersonation token
    ========================= */
    const impersonationToken = jwt.sign(
      {
        userId: client._id.toString(),
        role: "client",

        impersonated: true,
        impersonatedBy: producer._id.toString(),
        impersonationRole: "producer",
      },
      process.env.JWT_SECRET!,
      { expiresIn: "1h" }
    );

    /* =========================
       ✅ Response + Set-Cookies
    ========================= */
    const res = NextResponse.json(
      { success: true, eventId: event._id.toString() },
      { status: 200 }
    );

    const opts = httpOnlyCookieOptions();

    // ✅ שומרים את טוקן המפיק פעם אחת בלבד
    if (!existingProducerToken) {
      res.cookies.set("producerAuthToken", currentAuthToken, opts);
    }

    // ✅ מחליפים authToken לטוקן התחזות
    res.cookies.set("authToken", impersonationToken, opts);

    console.log("🍪 authToken overwritten; producerAuthToken preserved");

    return res;
  } catch (err) {
    console.error("❌ [Producer Impersonate] Error:", err);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}
