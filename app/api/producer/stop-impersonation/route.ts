import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

import dbConnect from "@/lib/db";
import User from "@/models/User";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

/* =========================================================
   Cookie helpers
========================================================= */
function getCookieDomain() {
  return process.env.NODE_ENV === "production" ? ".invistimo.com" : undefined;
}

function httpOnlyCookieOptions() {
  const domain = getCookieDomain();
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    ...(domain ? { domain } : {}),
    maxAge: SESSION_MAX_AGE,
  };
}

function clientCookieOptions() {
  const domain = getCookieDomain();
  return {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    ...(domain ? { domain } : {}),
    maxAge: SESSION_MAX_AGE,
  };
}

function deleteCookieOptions(httpOnly = true, withDomain = true) {
  const domain = getCookieDomain();
  return {
    httpOnly,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    ...(withDomain && domain ? { domain } : {}),
    maxAge: 0,
    expires: new Date(0),
  };
}

function expireCookie(res: NextResponse, name: string, httpOnly = true) {
  res.cookies.set(name, "", deleteCookieOptions(httpOnly, true));
  res.cookies.set(name, "", deleteCookieOptions(httpOnly, false));
}

function decodeCookieValue(raw: string) {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function getCookieHeaderValue(req: NextRequest, name: string): string | null {
  const header = req.headers.get("cookie") || "";
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    if (!trimmed.startsWith(`${name}=`)) continue;
    const value = decodeCookieValue(trimmed.slice(name.length + 1));
    if (value) return value;
  }
  try {
    return req.cookies.get(name)?.value || null;
  } catch {
    return null;
  }
}

/* =========================
   POST /api/producer/stop-impersonation
========================= */
export async function POST(req: NextRequest) {
  console.log("🟡 [Stop Impersonation] Request received");

  try {
    await dbConnect();

    const producerAuthToken =
      getCookieHeaderValue(req, "producerAuthToken") || null;

    if (!producerAuthToken) {
      return NextResponse.json(
        { success: false, message: "No active impersonation session" },
        { status: 401 }
      );
    }

    let decoded: any;
    try {
      decoded = jwt.verify(producerAuthToken, process.env.JWT_SECRET!);
    } catch (err) {
      console.error("❌ Invalid producerAuthToken", err);

      const res = NextResponse.json(
        { success: false, message: "Invalid producer session" },
        { status: 401 }
      );
      expireCookie(res, "producerAuthToken", true);
      return res;
    }

    const producerId = decoded?.userId || decoded?.id || decoded?._id || null;
    const role = String(decoded?.role || "").toLowerCase();
    const impersonationRole = String(
      decoded?.impersonationRole || ""
    ).toLowerCase();

    const isProducerSession =
      role === "producer" || impersonationRole === "producer";

    if (!producerId || !isProducerSession) {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 }
      );
    }

    const producer = await User.findById(producerId).select("_id role").lean();

    if (!producer || producer.role !== "producer") {
      return NextResponse.json(
        { success: false, message: "Producer not found" },
        { status: 403 }
      );
    }

    const adminActingAsProducer =
      decoded?.impersonated === true &&
      (decoded?.impersonatedByAdmin === true ||
        decoded?.impersonationSourceRole === "admin");

    const res = NextResponse.json({
      success: true,
      role: "producer",
      redirect: "/producer/dashboard",
      impersonatedByAdmin: adminActingAsProducer,
    });

    expireCookie(res, "authToken", true);
    expireCookie(res, "token", true);
    expireCookie(res, "impersonationToken", true);
    expireCookie(res, "role", false);

    res.cookies.set("authToken", producerAuthToken, httpOnlyCookieOptions());
    res.cookies.set("token", producerAuthToken, httpOnlyCookieOptions());
    res.cookies.set("role", "producer", clientCookieOptions());

    if (adminActingAsProducer) {
      res.cookies.set(
        "impersonationToken",
        producerAuthToken,
        httpOnlyCookieOptions()
      );
      res.cookies.set("impersonationRole", "producer", clientCookieOptions());
      res.cookies.set("impersonationSourceRole", "admin", clientCookieOptions());
      res.cookies.set("impersonatedByAdmin", "true", clientCookieOptions());
    } else {
      expireCookie(res, "impersonationToken", true);
      expireCookie(res, "impersonationRole", false);
      expireCookie(res, "impersonationSourceRole", false);
      expireCookie(res, "impersonatedByAdmin", false);
    }

    expireCookie(res, "producerAuthToken", true);

    console.log("✅ Impersonation stopped, producer restored", producerId);

    return res;
  } catch (err) {
    console.error("❌ [Stop Impersonation] Error:", err);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}
