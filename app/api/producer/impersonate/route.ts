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

/* =========================================================
   POST /api/producer/impersonate
========================================================= */
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

    const producerId = auth.userId;

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
       👤 Validate client ownership
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
       📅 Find client event
    ========================= */
    const event = await Event.findOne({
      clientId: client._id,
    })
      .sort({ date: 1 }) // אם יש כמה – לוקחים הקרוב
      .select("_id")
      .lean();

    /* =========================
       🍪 Cookies
    ========================= */
    const cookieStore = await cookies();

    const currentAuthToken =
      cookieStore.get("authToken")?.value || null;

    const existingProducerToken =
      cookieStore.get("producerAuthToken")?.value || null;

    if (!currentAuthToken) {
      return NextResponse.json(
        { success: false, message: "Missing producer session" },
        { status: 401 }
      );
    }

    /* =========================
       🎭 Create impersonation token
    ========================= */
    const impersonationToken = jwt.sign(
      {
        userId: client._id.toString(),
        role: "client",
        impersonated: true,
        impersonatedBy: producerId,
        impersonationRole: "producer",
      },
      process.env.JWT_SECRET!,
      { expiresIn: "1h" }
    );

    /* =========================
       🔁 Build redirect (IMPORTANT)
    ========================= */
    const redirect = event
      ? `/producer/events/${event._id}/overview?eventId=${event._id}`
      : "/producer";

    /* =========================
       ✅ Response
    ========================= */
    const res = NextResponse.json(
      {
        success: true,
        redirect,
      },
      { status: 200 }
    );

    const opts = httpOnlyCookieOptions();

    // שומרים את טוקן המפיק (פעם אחת)
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
