import { NextResponse } from "next/server";

import { appendAuthCookieDeletes } from "@/lib/auth/clearAuthCookies";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function buildLogoutRedirect(req: Request) {
  const url = new URL(req.url);
  const redirectParam = url.searchParams.get("redirect");
  const target = redirectParam || "/login?loggedOut=1";

  return NextResponse.redirect(new URL(target, req.url), 303);
}

function createLogoutResponse(req: Request, json = false) {
  const res = json
    ? NextResponse.json(
        { success: true },
        {
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
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
