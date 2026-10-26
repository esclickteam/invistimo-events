import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Event from "@/models/Event";
import Invitation from "@/models/Invitation";
import InvitationGuest from "@/models/InvitationGuest";
import { signAccessJwt } from "@/lib/auth/issueAccessJwt";
import { setAuthCookie } from "@/lib/auth/clearAuthCookies";
import {
  isPreviewAppEnv,
  isProductionAppEnv,
  resolveAppEnv,
} from "@/lib/env/appEnv";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DEMO = {
  userEmail: "studio-demo@invistimo.test",
  adminEmail: "studio-admin@invistimo.test",
  password: "studio-demo",
  shareId: "studioDemo1",
  guestToken: "studioGuest1",
} as const;

function hidden() {
  return NextResponse.json({ success: false, error: "NOT_FOUND" }, { status: 404 });
}

function requestHost(req: Request) {
  return String(req.headers.get("x-forwarded-host") || req.headers.get("host") || "")
    .toLowerCase()
    .split(":")[0];
}

/**
 * Preview/local one-click demo login for the invitation studio.
 * Upserts the demo customer so Preview does not depend on a prior seed.
 * Never runs on production hosts.
 */
function allowDemo(req: Request) {
  if (isProductionAppEnv()) return false;
  const env = resolveAppEnv();
  if (env !== "development" && env !== "preview" && env !== "test") return false;

  const host = requestHost(req);
  if (!host) return false;
  if (host === "invistimo.com" || host === "www.invistimo.com") return false;
  if (host.endsWith(".invistimo.com") && !host.startsWith("staging.")) return false;

  if (host.includes("localhost") || host.includes("127.0.0.1") || host.endsWith(".vercel.app")) {
    return true;
  }
  return process.env.STUDIO_DEMO_LOGIN === "1" || isPreviewAppEnv();
}

async function ensureDemoUser(as: "user" | "admin") {
  const email = as === "admin" ? DEMO.adminEmail : DEMO.userEmail;
  const password = await bcrypt.hash(DEMO.password, 8);
  return User.findOneAndUpdate(
    { email },
    {
      $set: {
        name: as === "admin" ? "אדמין סטודיו" : "דמו סטודיו",
        email,
        password,
        role: as === "admin" ? "admin" : "user",
        plan: "plan1",
        paidAmount: 1,
        hasPaid: true,
        designedInvitationEnabled: true,
        isActive: true,
        authVersion: 0,
        needsPasswordSetup: false,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function ensureDemoInvitation(ownerId: unknown) {
  const event = await Event.findOneAndUpdate(
    { email: DEMO.userEmail, title: "החתונה של שירה ויונתן — סטודיו" },
    {
      $set: {
        userId: ownerId,
        email: DEMO.userEmail,
        title: "החתונה של שירה ויונתן — סטודיו",
        eventType: "wedding",
        date: "2027-06-10",
        time: "19:30",
        location: { name: "אולם הגן", address: "הרצליה" },
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const invitation = await Invitation.findOneAndUpdate(
    { shareId: DEMO.shareId },
    {
      $set: {
        ownerId,
        eventId: event._id,
        title: "שירה ויונתן",
        eventType: "wedding",
        eventDate: new Date("2027-06-10T12:00:00.000Z"),
        eventTime: "19:30",
        location: { name: "אולם הגן", address: "הרצליה" },
        canvasData: {},
        standaloneGame: false,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await InvitationGuest.findOneAndUpdate(
    { token: DEMO.guestToken },
    {
      $set: {
        invitationId: invitation._id,
        name: "יעל כהן",
        phone: "0500000199",
        token: DEMO.guestToken,
        rsvp: "pending",
        status: "pending",
        arrivedCount: 0,
        amount: 0,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return invitation;
}

export async function GET(req: Request) {
  if (!allowDemo(req)) return hidden();

  const url = new URL(req.url);
  const as = url.searchParams.get("as") === "admin" ? "admin" : "user";
  await connectDB();

  const user = await ensureDemoUser(as);
  if (as === "user") {
    await ensureDemoInvitation(user._id);
  }

  const token = signAccessJwt(user);
  const next = String(url.searchParams.get("next") || "").trim();
  const dest =
    next.startsWith("/dashboard/invitation-studio") || next.startsWith("/admin/invitation-studio")
      ? next
      : as === "admin"
        ? "/admin/invitation-studio"
        : "/dashboard/invitation-studio";

  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || url.host;
  const proto = req.headers.get("x-forwarded-proto") || url.protocol.replace(":", "") || "http";
  const res = NextResponse.redirect(`${proto}://${host}${dest}`);
  setAuthCookie(res, "authToken", token, { httpOnly: true });
  setAuthCookie(res, "role", String(user.role || "user"), { httpOnly: false });
  return res;
}
