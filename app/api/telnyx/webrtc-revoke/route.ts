import { NextRequest, NextResponse } from "next/server";

import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { isSoftphoneEligibleAuth } from "@/lib/telnyx/webrtcSecurity";
import { revokeTelnyxWebRtcForUser } from "@/lib/telnyx/webrtcCredentials";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const auth = await getUserIdFromRequest(req);

    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    // Allow revoke for the signed-in softphone user (and ignore role mismatches
    // so logout/security cleanup still works after role changes).
    if (!isSoftphoneEligibleAuth(auth) && auth.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const reason =
      typeof body?.reason === "string" && body.reason.trim()
        ? body.reason.trim().slice(0, 120)
        : "client_logout";

    const result = await revokeTelnyxWebRtcForUser(auth.userId, reason);

    return NextResponse.json(
      {
        success: true,
        revoked: result.revoked,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("TELNYX WEBRTC REVOKE ROUTE ERROR");
    return NextResponse.json(
      { success: false, error: "TELNYX_WEBRTC_REVOKE_FAILED" },
      { status: 500 }
    );
  }
}
