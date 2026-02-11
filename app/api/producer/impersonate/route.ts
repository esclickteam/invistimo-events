export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

import dbConnect from "@/lib/db";
import User from "@/models/User";
import Event from "@/models/Event"; // ✅ חדש
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
  try {
    await dbConnect();

    /* =========================
       🔐 Auth – Producer
    ========================= */
    const auth: any = await getUserIdFromRequest(req);

    if (!auth?.userId || auth.role !== "producer") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const producerId = String(auth.userId);

    /* =========================
       📥 Input
    ========================= */
    const body = await req.json().catch(() => ({}));
    const clientId = body?.clientId ? String(body.clientId) : "";

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
      assignedProducerId: producerId,
    })
      .select("_id")
      .lean();

    if (!client) {
      return NextResponse.json(
        { success: false, message: "Client not assigned to producer" },
        { status: 403 }
      );
    }

    /* =========================
       📅 Find client's event (for navigation)
    ========================= */
    const event = await Event.findOne({ userId: client._id })
      .select("_id")
      .sort({ createdAt: -1 })
      .lean();

    const eventId = event?._id ? String(event._id) : null;

    /* =========================
       🍪 Cookies
    ========================= */
    const cookieStore = await cookies();

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
       אם כבר בהתחזות - נחזיר eventId
    ========================= */
    if (auth.impersonated) {
      return NextResponse.json(
        {
          success: true,
          alreadyImpersonated: true,
          eventId, // ✅ חשוב
        },
        { status: 200 }
      );
    }

    /* =========================
       🎭 Impersonation token
    ========================= */
    const impersonationToken = jwt.sign(
      {
        userId: String(client._id),
        role: "client",
        impersonated: true,
        impersonatedBy: producerId,
        impersonationRole: "producer",
      },
      process.env.JWT_SECRET!,
      { expiresIn: "1h" }
    );

    /* =========================
       ✅ Response
    ========================= */
    const res = NextResponse.json(
      {
        success: true,
        eventId, // ✅ זה מה שה-frontend צריך לניווט
      },
      { status: 200 }
    );

    const opts = httpOnlyCookieOptions();

    // שומרים את טוקן המפיק פעם אחת
    if (!existingProducerToken) {
      res.cookies.set("producerAuthToken", currentAuthToken, opts);
    }

    // מחליפים authToken ללקוח
    res.cookies.set("authToken", impersonationToken, opts);

    return res;
  } catch (err) {
    console.error("❌ [Producer Impersonate] Error:", err);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}
