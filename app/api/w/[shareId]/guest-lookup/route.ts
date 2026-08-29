import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import WeddingWebsite from "@/models/WeddingWebsite";
import InvitationGuest from "@/models/InvitationGuest";
import {
  buildPhoneMatchQuery,
  sanitizeNameQuery,
  toPublicMatches,
} from "@/lib/weddingWebsite/guestLookup";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const RATE = new Map<string, { count: number; resetAt: number }>();

function rateLimit(key: string, limit = 20, windowMs = 60_000) {
  const now = Date.now();
  const cur = RATE.get(key);
  if (!cur || now > cur.resetAt) {
    RATE.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  cur.count += 1;
  return cur.count <= limit;
}

/**
 * Event-scoped guest identification for Wedding Website RSVP.
 * Never returns full guest lists; max 5 minimal matches.
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ shareId: string }> }
) {
  try {
    const { shareId: rawShare } = await ctx.params;
    const shareId = String(rawShare || "").trim();
    if (!shareId) {
      return NextResponse.json({ success: false, error: "shareId required" }, { status: 400 });
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";
    if (!rateLimit(`${ip}:${shareId}`)) {
      return NextResponse.json(
        { success: false, error: "Too many attempts. Try again shortly." },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
    const name = typeof body?.name === "string" ? body.name.trim() : "";

    if (!phone && !name) {
      return NextResponse.json(
        { success: false, error: "נא להזין מספר טלפון או שם" },
        { status: 400 }
      );
    }
    if (phone && phone.replace(/\D/g, "").length < 7) {
      return NextResponse.json(
        { success: false, error: "מספר טלפון לא תקין" },
        { status: 400 }
      );
    }
    if (name && name.length < 2) {
      return NextResponse.json(
        { success: false, error: "שם קצר מדי" },
        { status: 400 }
      );
    }

    await db();
    const website = await WeddingWebsite.findOne({
      shareId,
      status: "published",
    })
      .select("invitationId shareId status")
      .lean();

    if (!website?.invitationId) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    const invitationId = website.invitationId;
    let guests: any[] = [];

    if (phone) {
      const phoneQ = buildPhoneMatchQuery(phone);
      if (!phoneQ) {
        return NextResponse.json(
          { success: false, error: "מספר טלפון לא תקין" },
          { status: 400 }
        );
      }
      guests = await InvitationGuest.find({
        invitationId,
        ...phoneQ,
      })
        .select("token name phone guestsCount rsvp status")
        .limit(5)
        .lean();
    } else {
      const safe = sanitizeNameQuery(name);
      guests = await InvitationGuest.find({
        invitationId,
        name: { $regex: safe, $options: "i" },
      })
        .select("token name phone guestsCount rsvp status")
        .limit(5)
        .lean();
    }

    const matches = toPublicMatches(guests);

    return NextResponse.json({
      success: true,
      matchCount: matches.length,
      matches,
      // Prefer auto-continue when single phone match
      autoToken:
        matches.length === 1 && phone ? matches[0].token : null,
    });
  } catch (err) {
    console.error("WW guest-lookup error", err);
    return NextResponse.json(
      { success: false, error: "Lookup failed" },
      { status: 500 }
    );
  }
}
