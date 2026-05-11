export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

import dbConnect from "@/lib/db";
import User from "@/models/User";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

/* =========================================================
   Constants
========================================================= */

const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 ימים
const SESSION_EXPIRES_IN = "7d";

/* =========================================================
   Cookie helpers
========================================================= */

async function getCookieStore() {
  const store = cookies();
  return store instanceof Promise ? await store : store;
}

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
  // מחיקה עם domain
  res.cookies.set(name, "", deleteCookieOptions(httpOnly, true));

  // מחיקה גם בלי domain
  res.cookies.set(name, "", deleteCookieOptions(httpOnly, false));
}

/* =========================================================
   POST /api/producer/impersonate
========================================================= */

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    if (!process.env.JWT_SECRET) {
      console.error("❌ JWT_SECRET missing");

      return NextResponse.json(
        {
          success: false,
          message: "Server configuration error",
        },
        {
          status: 500,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    /* =========================
       Auth – Producer
    ========================= */

    const auth: any = await getUserIdFromRequest(req);

    if (!auth?.userId || auth.role !== "producer") {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        {
          status: 401,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    // אם כבר בהתחזות — לא מייצרים שוב טוקן
    if (auth.impersonated) {
      return NextResponse.json(
        {
          success: true,
          alreadyImpersonated: true,
          redirect: "/dashboard",
        },
        {
          status: 200,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    const producerId = String(auth.userId);

    /* =========================
       Input
    ========================= */

    const body = await req.json().catch(() => ({}));
    const clientId = body?.clientId;

    if (!clientId) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing clientId",
        },
        {
          status: 400,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    /* =========================
       Client ownership
    ========================= */

    const client: any = await User.findOne({
      _id: clientId,
      assignedProducerId: producerId,
    })
      .select("_id role name email hasPaid isTrial trialExpiresAt")
      .lean();

    if (!client) {
      return NextResponse.json(
        {
          success: false,
          message: "Client not assigned to producer",
        },
        {
          status: 403,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    /* =========================
       Cookies
    ========================= */

    const cookieStore = await getCookieStore();

    const currentAuthToken =
      cookieStore.get("authToken")?.value ||
      cookieStore.get("token")?.value ||
      null;

    const existingProducerToken =
      cookieStore.get("producerAuthToken")?.value || null;

    if (!currentAuthToken) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing producer session",
        },
        {
          status: 401,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    /* =========================
       Verify current producer token
    ========================= */

    try {
      jwt.verify(currentAuthToken, process.env.JWT_SECRET);
    } catch (err) {
      console.error("❌ Invalid producer session token:", err);

      return NextResponse.json(
        {
          success: false,
          message: "Invalid producer session",
        },
        {
          status: 401,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    const hasPaid = client.hasPaid ?? true;
    const isTrial = Boolean(client.isTrial);

    /* =========================
       Impersonation token – 7 ימים
    ========================= */

    const impersonationToken = jwt.sign(
      {
        userId: String(client._id),
        role: "client",

        hasPaid,
        isTrial,

        impersonated: true,
        impersonatedBy: producerId,
        impersonationRole: "producer",
      },
      process.env.JWT_SECRET,
      {
        expiresIn: SESSION_EXPIRES_IN,
      }
    );

    /* =========================
       Response
    ========================= */

    const res = NextResponse.json(
      {
        success: true,
        redirect: "/dashboard",
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      }
    );

    /* =========================
       Clear previous active impersonation/client state
    ========================= */

    const cookiesToClear = [
      "authToken",
      "token",
      "impersonationToken",

      // client-readable UX cookies
      "role",
      "hasPaid",
      "isTrial",
      "trialExpiresAt",
    ];

    for (const name of cookiesToClear) {
      const isHttpOnly =
        name === "authToken" ||
        name === "token" ||
        name === "impersonationToken";

      expireCookie(res, name, isHttpOnly);
    }

    /* =========================
       Save original producer token
       שומרים רק אם עדיין אין producerAuthToken
    ========================= */

    if (!existingProducerToken) {
      res.cookies.set(
        "producerAuthToken",
        currentAuthToken,
        httpOnlyCookieOptions()
      );
    }

    /* =========================
       Replace active session with client impersonation
    ========================= */

    res.cookies.set("authToken", impersonationToken, httpOnlyCookieOptions());

    // legacy support
    res.cookies.set("token", impersonationToken, httpOnlyCookieOptions());

    // explicit impersonation cookie
    res.cookies.set(
      "impersonationToken",
      impersonationToken,
      httpOnlyCookieOptions()
    );

    /* =========================
       Client-readable UX cookies
    ========================= */

    res.cookies.set("role", "client", clientCookieOptions());

    res.cookies.set("hasPaid", String(hasPaid), clientCookieOptions());

    res.cookies.set("isTrial", String(isTrial), clientCookieOptions());

    if (isTrial && client.trialExpiresAt) {
      res.cookies.set(
        "trialExpiresAt",
        String(new Date(client.trialExpiresAt).getTime()),
        clientCookieOptions()
      );
    } else {
      expireCookie(res, "trialExpiresAt", false);
    }

    console.log(
      "✅ Producer impersonation:",
      producerId,
      "-> client:",
      String(client._id)
    );

    return res;
  } catch (err) {
    console.error("❌ [Producer Impersonate] Error:", err);

    return NextResponse.json(
      {
        success: false,
        message: "Server error",
      },
      {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }
}