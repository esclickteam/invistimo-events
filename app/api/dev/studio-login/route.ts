import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { signAccessJwt } from "@/lib/auth/issueAccessJwt";
import { setAuthCookie } from "@/lib/auth/clearAuthCookies";
import { isProductionAppEnv, resolveAppEnv } from "@/lib/env/appEnv";

export const dynamic = "force-dynamic";

const DEMO_EMAILS = {
  user: "studio-demo@invistimo.test",
  admin: "studio-admin@invistimo.test",
} as const;

function hidden() {
  return NextResponse.json({ success: false, error: "NOT_FOUND" }, { status: 404 });
}

/**
 * Local walkthrough login for the seeded studio demo only.
 * Absent unless APP_ENV is development and STUDIO_DEMO_LOGIN=1.
 * Refuses production hosts so this cannot mint a live session.
 */
export async function GET(req: Request) {
  if (process.env.STUDIO_DEMO_LOGIN !== "1") return hidden();
  if (resolveAppEnv() !== "development" || isProductionAppEnv()) return hidden();

  const site = String(process.env.NEXT_PUBLIC_SITE_URL || "").toLowerCase();
  if (site.includes("invistimo.com")) return hidden();

  const url = new URL(req.url);
  const as = url.searchParams.get("as") === "admin" ? "admin" : "user";
  await connectDB();
  const user = await User.findOne({ email: DEMO_EMAILS[as], isActive: { $ne: false } });
  if (!user) {
    return NextResponse.json({ success: false, error: "DEMO_USER_MISSING" }, { status: 404 });
  }

  const token = signAccessJwt(user);
  const dest = as === "admin" ? "/admin/invitation-studio" : "/dashboard/invitation-studio";
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || url.host;
  const proto = req.headers.get("x-forwarded-proto") || url.protocol.replace(":", "") || "http";
  const res = NextResponse.redirect(`${proto}://${host}${dest}`);
  setAuthCookie(res, "authToken", token, { httpOnly: true });
  setAuthCookie(res, "role", String(user.role || "user"), { httpOnly: false });
  return res;
}
