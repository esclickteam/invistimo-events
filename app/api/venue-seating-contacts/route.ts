import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { VENUE_SEATING_RESPONSIBILITY_TEXT } from "@/lib/venueSeatingContacts/logic";
import {
  getHallSeatingContactState,
  saveHallSeatingContacts,
} from "@/lib/venueSeatingContacts/service";

export const dynamic = "force-dynamic";

function customerId(auth: { userId: string; adminManagingUserId?: string | null }) {
  return auth.adminManagingUserId || auth.userId;
}

function readContact(value: unknown) {
  const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    fullName: String(source.fullName || ""),
    phone: String(source.phone || ""),
    relation: String(source.relation || ""),
    canApproveReserves: Boolean(source.canApproveReserves),
  };
}

export async function GET(request: Request) {
  const auth = await getUserIdFromRequest(request);
  if (!auth) return NextResponse.json({ success: false }, { status: 401 });

  const eventId = new URL(request.url).searchParams.get("eventId") || "";
  if (!eventId) {
    return NextResponse.json({ success: false, error: "MISSING_EVENT" }, { status: 400 });
  }

  await dbConnect();
  const state = await getHallSeatingContactState({
    userId: customerId(auth),
    eventId,
  });
  if (!state.found) {
    return NextResponse.json({ success: false, error: "NOT_FOUND" }, { status: 404 });
  }
  if (!state.access.showTab) {
    return NextResponse.json({
      success: true,
      eligible: false,
      showTab: false,
    });
  }

  return NextResponse.json({
    success: true,
    eligible: true,
    showTab: true,
    event: state.event,
    contact: state.contact,
    responsibilityText: VENUE_SEATING_RESPONSIBILITY_TEXT,
  });
}

export async function PUT(request: Request) {
  const auth = await getUserIdFromRequest(request);
  if (!auth) return NextResponse.json({ success: false }, { status: 401 });

  const body = await request.json().catch(() => null);
  const eventId = String(body?.eventId || "");
  if (!eventId) {
    return NextResponse.json({ success: false, error: "MISSING_EVENT" }, { status: 400 });
  }

  await dbConnect();
  const userId = customerId(auth);
  const actor = await User.findById(auth.userId).select("name").lean<{ name?: string } | null>();
  const saved = await saveHallSeatingContacts({
    userId,
    eventId,
    actorUserId: auth.userId,
    actorName: actor?.name || "",
    primary: readContact(body?.primary),
    secondary: body?.secondary ? readContact(body.secondary) : null,
    responsibilityAccepted: Boolean(body?.responsibilityAccepted),
  });

  if (!saved.ok) {
    return NextResponse.json(
      { success: false, errors: saved.errors },
      { status: saved.status }
    );
  }

  return NextResponse.json({ success: true, contact: saved.contact });
}
