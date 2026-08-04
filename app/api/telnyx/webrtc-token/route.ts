import { NextRequest, NextResponse } from "next/server";

import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import {
  assertSafeWebrtcAuthPayload,
  checkSoftphoneWebrtcRateLimit,
  getClientIp,
  isSoftphoneEligibleAuth,
  isSoftphoneWebrtcEnabled,
} from "@/lib/telnyx/webrtcSecurity";
import {
  issueSoftphoneLoginToken,
  writeSoftphoneTokenAudit,
} from "@/lib/telnyx/webrtcCredentials";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(
  error: string,
  status: number,
  extras?: Record<string, unknown>
) {
  return NextResponse.json(
    {
      success: false,
      error,
      ...(extras || {}),
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}

async function auditAndError(input: {
  userId?: string | null;
  role?: string | null;
  ip: string;
  userAgent: string | null;
  error: string;
  status: number;
  extras?: Record<string, unknown>;
}) {
  await writeSoftphoneTokenAudit({
    userId: input.userId,
    role: input.role,
    ip: input.ip,
    userAgent: input.userAgent,
    success: false,
    failureReason: input.error,
  });

  return jsonError(input.error, input.status, input.extras);
}

export async function GET() {
  return NextResponse.json(
    {
      success: true,
      message: "Telnyx WebRTC auth endpoint is alive",
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent");

  try {
    const auth = await getUserIdFromRequest(req);

    if (!auth?.userId) {
      return auditAndError({
        ip,
        userAgent,
        error: "UNAUTHORIZED",
        status: 401,
      });
    }

    if (!isSoftphoneEligibleAuth(auth)) {
      return auditAndError({
        userId: auth.userId,
        role: auth.role,
        ip,
        userAgent,
        error: "FORBIDDEN_SOFTPHONE_ROLE",
        status: 403,
      });
    }

    const rateKey = `${auth.userId}:${ip}`;
    const rate = checkSoftphoneWebrtcRateLimit(rateKey);
    if (!rate.allowed) {
      return auditAndError({
        userId: auth.userId,
        role: auth.role,
        ip,
        userAgent,
        error: "RATE_LIMIT",
        status: 429,
        extras: {
          retryAfterMs: rate.retryAfterMs,
        },
      });
    }

    if (!isSoftphoneWebrtcEnabled()) {
      return auditAndError({
        userId: auth.userId,
        role: auth.role,
        ip,
        userAgent,
        error: "SOFTPHONE_DISABLED",
        status: 503,
      });
    }

    await connectDB();

    const user = await User.findById(auth.userId)
      .select("isActive role staffType employeeScope")
      .lean();

    if (!user) {
      return auditAndError({
        userId: auth.userId,
        role: auth.role,
        ip,
        userAgent,
        error: "USER_NOT_FOUND",
        status: 404,
      });
    }

    if ((user as any).isActive === false) {
      return auditAndError({
        userId: auth.userId,
        role: auth.role,
        ip,
        userAgent,
        error: "FORBIDDEN_USER_INACTIVE",
        status: 403,
      });
    }

    const tokenPayload = await issueSoftphoneLoginToken(auth.userId);

    const responseBody = {
      success: true as const,
      authType: tokenPayload.authType,
      login_token: tokenPayload.login_token,
      expiresIn: tokenPayload.expiresIn,
      callerId: tokenPayload.callerId,
    };

    assertSafeWebrtcAuthPayload(responseBody);

    await writeSoftphoneTokenAudit({
      userId: auth.userId,
      role: auth.role,
      ip,
      userAgent,
      success: true,
      failureReason: null,
    });

    return NextResponse.json(responseBody, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "TELNYX_WEBRTC_AUTH_ROUTE_FAILED";

    // Never include credential material in error responses or logs.
    console.error("TELNYX WEBRTC AUTH ROUTE ERROR:", message);

    return auditAndError({
      ip,
      userAgent,
      error:
        message === "TELNYX_API_KEY_MISSING" ||
        message === "TELNYX_CONNECTION_ID_MISSING" ||
        message === "TELNYX_FROM_NUMBER_MISSING" ||
        message === "TELNYX_CREATE_CREDENTIAL_FAILED" ||
        message === "TELNYX_CREATE_TOKEN_FAILED"
          ? "SOFTPHONE_TOKEN_UNAVAILABLE"
          : "TELNYX_WEBRTC_AUTH_ROUTE_FAILED",
      status: 500,
    });
  }
}
