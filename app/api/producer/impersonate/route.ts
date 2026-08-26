export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

import dbConnect from "@/lib/db";
import User from "@/models/User";
import {
  getUserIdFromRequest,
  type AuthPayload,
} from "@/lib/getUserIdFromRequest";

/* =========================================================
   Constants
========================================================= */

const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 ימים
const SESSION_EXPIRES_IN = "7d";

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
  // מחיקה עם domain
  res.cookies.set(name, "", deleteCookieOptions(httpOnly, true));

  // מחיקה גם בלי domain
  res.cookies.set(name, "", deleteCookieOptions(httpOnly, false));
}

function decodeCookieValue(raw: string) {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function getCookieHeaderValues(req: NextRequest, name: string): string[] {
  const values: string[] = [];
  const header = req.headers.get("cookie") || "";

  for (const part of header.split(";")) {
    const trimmed = part.trim();
    if (!trimmed.startsWith(`${name}=`)) continue;
    const value = decodeCookieValue(trimmed.slice(name.length + 1));
    if (value && !values.includes(value)) values.push(value);
  }

  try {
    const fromReq = req.cookies.get(name)?.value;
    if (fromReq && !values.includes(fromReq)) values.push(fromReq);
  } catch {
    /* NextRequest.cookies may be unavailable in some test contexts */
  }

  return values;
}

function isAdminActingAsProducer(auth: AuthPayload | null) {
  if (!auth?.userId || !auth.impersonated) return false;
  if (auth.role !== "producer") return false;

  const sourceRole = String(auth.impersonationSourceRole || "").toLowerCase();

  return auth.impersonatedByAdmin === true || sourceRole === "admin";
}

/**
 * Real logged-in producer, or admin impersonating that producer.
 * Never treats the original admin userId as the producerId.
 */
function resolveProducerActor(auth: AuthPayload | null): {
  producerId: string;
  adminActingAsProducer: boolean;
} | null {
  if (!auth?.userId) return null;
  if (auth.role !== "producer") return null;

  return {
    producerId: String(auth.userId),
    adminActingAsProducer: isAdminActingAsProducer(auth),
  };
}

function pickProducerSessionToken(
  req: NextRequest,
  producerId: string
): string | null {
  if (!process.env.JWT_SECRET) return null;

  const candidates = [
    ...getCookieHeaderValues(req, "impersonationToken"),
    ...getCookieHeaderValues(req, "authToken"),
    ...getCookieHeaderValues(req, "token"),
    ...getCookieHeaderValues(req, "producerAuthToken"),
  ];

  for (const token of candidates) {
    try {
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET);
      const tokenUserId = String(
        decoded?.userId || decoded?.id || decoded?._id || ""
      );
      const tokenRole = String(decoded?.role || "").toLowerCase();
      const tokenImpersonationRole = String(
        decoded?.impersonationRole || ""
      ).toLowerCase();

      if (
        tokenUserId === String(producerId) &&
        (tokenRole === "producer" || tokenImpersonationRole === "producer")
      ) {
        return token;
      }
    } catch {
      /* skip invalid */
    }
  }

  return null;
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
       Supports:
         1) logged-in producer
         2) admin impersonating that producer
       Never uses the original admin userId as producerId.
    ========================= */

    const auth = await getUserIdFromRequest(req);
    const producerActor = resolveProducerActor(auth);

    if (!producerActor) {
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

    const { producerId, adminActingAsProducer } = producerActor;

    /*
      אדמין שמתחזה למפיק כבר מסומן כ־impersonated.
      עדיין צריך לאפשר לו להיכנס ללקוח (התחזות מקוננת).
      חוסמים רק התחזות כפולה שאינה admin→producer.
    */
    if (auth?.impersonated && !adminActingAsProducer) {
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
      $or: [
        { assignedProducerId: producerId },
        { assignedProducerIds: producerId },
      ],
    })
      .select("_id role name email hasPaid isTrial trialExpiresAt authVersion")
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
       Producer session token
       When admin impersonates a producer, the active producer session lives
       on impersonationToken (and often authToken). Do not 401 just because
       cookies().get("authToken") missed a duplicate/host-only leftover.
    ========================= */

    const currentProducerToken = pickProducerSessionToken(req, producerId);

    if (!currentProducerToken) {
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

    const existingProducerToken =
      getCookieHeaderValues(req, "producerAuthToken")[0] || null;

    const hasPaid = client.hasPaid ?? true;
    const isTrial = Boolean(client.isTrial);
    const clientAuthVersion = Number(client.authVersion ?? 0);

    /* =========================
       Impersonation token – 7 ימים
    ========================= */

    const impersonationToken = jwt.sign(
      {
        userId: String(client._id),
        role: "client",

        hasPaid,
        isTrial,
        authVersion: Number.isFinite(clientAuthVersion) ? clientAuthVersion : 0,

        impersonated: true,
        impersonatedBy: producerId,
        impersonationRole: "producer",

        // שומרים שהמקור הוא אדמין (כשמתחזים דרך admin→producer→client)
        ...(adminActingAsProducer
          ? {
              impersonatedByAdmin: true,
              impersonationSourceRole: "admin",
              adminId: auth?.impersonatedBy ? String(auth.impersonatedBy) : null,
            }
          : {
              impersonationSourceRole: "producer",
            }),
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
        currentProducerToken,
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