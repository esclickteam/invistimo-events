import { NextResponse } from "next/server";

import { appendAuthCookieDeletes } from "@/lib/auth/clearAuthCookies";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { revokeTelnyxWebRtcForUser } from "@/lib/telnyx/webrtcCredentials";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function buildLogoutRedirect(req: Request) {
  const url = new URL(req.url);
  const redirectParam = url.searchParams.get("redirect");
  const target = redirectParam || "/login?loggedOut=1";

  return NextResponse.redirect(new URL(target, req.url), 303);
}

async function revokeOnLogout(req: Request) {
  try {
    const auth = await getUserIdFromRequest(req);
    if (!auth?.userId) return;

    await revokeTelnyxWebRtcForUser(auth.userId, "logout");
  } catch {
    console.error("TELNYX WEBRTC REVOKE ON LOGOUT FAILED");
  }
}

async function createLogoutResponse(req: Request, json = false) {
  await revokeOnLogout(req);

  const res = json
    ? NextResponse.json(
        { success: true },
        {
          headers: {
            "Cache-Control":
              "no-store, no-cache, must-revalidate, proxy-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        }
      )
    : buildLogoutRedirect(req);

  appendAuthCookieDeletes(res);
  return res;
}

/*
  Browser logout should use GET /api/logout so cookie deletion and redirect
  happen in a single navigation response (fetch + client redirect can leave
  stale HttpOnly cookies behind).
*/
export async function GET(req: Request) {
  return createLogoutResponse(req, false);
}

export async function POST(req: Request) {
  return createLogoutResponse(req, false);
}
