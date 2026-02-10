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

/* =========================================================
   Safe redirect helper (same-site paths only)
========================================================= */
function buildRedirect(target?: string, eventId?: string) {
  const safeTarget =
    typeof target === "string" &&
    target.startsWith("/") &&
    !target.startsWith("//")
      ? target
      : null;

  if (safeTarget) return safeTarget;
  if (eventId) return `/producer/events/${eventId}`;
  return "/dashboard";
}

/* =========================
   POST /api/producer/impersonate
========================= */
export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    /* =========================
       🔐 Auth – Producer only
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
    const clientId = String(body?.clientId || "").trim();
    const eventId = String(body?.eventId || "").trim(); // optional
    const target = typeof body?.target === "string" ? body.target : undefined;

    if (!clientId) {
      return NextResponse.json(
        { success: false, message: "Missing clientId" },
        { status: 400 }
      );
    }

    /* =========================
       👤 Client ownership
       (כולל role client/user למנוע גישה לא רצויה)
    ========================= */
    const client = await User.findOne({
      _id: clientId,
      assignedProducerId: producerId,
      role: { $in: ["client", "user"] },
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
       📌 Optional event validation
       אם נשלח eventId - נוודא שהוא של אותו לקוח
    ========================= */
    if (eventId) {
      const event = await Event.findOne({
        _id: eventId,
        userId: clientId,
      })
        .select("_id")
        .lean();

      if (!event) {
        return NextResponse.json(
          { success: false, message: "Event does not belong to this client" },
          { status: 400 }
        );
      }
    }

    const redirect = buildRedirect(target, eventId);

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
       אם כבר בהתחזות:
       לא נשבור, פשוט נחזיר redirect החדש
    ========================= */
    if (auth.impersonated) {
      return NextResponse.json(
        {
          success: true,
          alreadyImpersonated: true,
          redirect,
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
        redirect,
      },
      { status: 200 }
    );

    const opts = httpOnlyCookieOptions();

    // שומרים את טוקן המפיק פעם אחת (כדי לאפשר "חזור למפיק")
    if (!existingProducerToken) {
      res.cookies.set("producerAuthToken", currentAuthToken, opts);
    }

    // מחליפים authToken לטוקן התחזות לקוח
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
