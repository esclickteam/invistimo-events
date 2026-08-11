import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { requireTransportationManagement } from "@/lib/guards/requireTransportation";
import { getOrCreateEventTransportation, serializeDoc } from "@/lib/transportation/service";
import { buildEventTransportSummary } from "@/lib/transportation/capacity";
import TransportRoute from "@/models/TransportRoute";
import TransportStop from "@/models/TransportStop";
import TransportRegistration from "@/models/TransportRegistration";
import InvitationGuest from "@/models/InvitationGuest";
import Invitation from "@/models/Invitation";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    await connectDB();
    const { eventId } = await params;

    const gate = await requireTransportationManagement({ eventId });
    if (!gate.ok) return gate.response;

    const settings = await getOrCreateEventTransportation(eventId);
    const summary = await buildEventTransportSummary(eventId);

    const [routes, stops, registrations] = await Promise.all([
      TransportRoute.find({ eventId }).sort({ sortOrder: 1, createdAt: 1 }).lean(),
      TransportStop.find({ eventId }).sort({ sortOrder: 1 }).lean(),
      TransportRegistration.find({ eventId })
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    // Guests without transport registration (for "not selected transport" filter)
    const invitation = await Invitation.findOne({ eventId }).select("_id").lean();
    let guestsWithoutTransport: any[] = [];
    if (invitation) {
      const registeredGuestIds = registrations
        .filter((r) => r.invitationGuestId && r.status === "registered")
        .map((r) => String(r.invitationGuestId));

      const guests = await InvitationGuest.find({
        invitationId: invitation._id,
      })
        .select("name phone rsvp arrivedCount guestsCount")
        .lean();

      guestsWithoutTransport = guests
        .filter((g) => !registeredGuestIds.includes(String(g._id)))
        .map((g) => ({
          _id: String(g._id),
          name: g.name,
          phone: g.phone || "",
          rsvp: g.rsvp,
          arrivedCount: g.arrivedCount,
          guestsCount: g.guestsCount,
        }));
    }

    return NextResponse.json({
      success: true,
      settings: serializeDoc(settings),
      summary: {
        ...summary,
        guestsWithoutTransportCount: guestsWithoutTransport.length,
      },
      routes: routes.map(serializeDoc),
      stops: stops.map(serializeDoc),
      registrations: registrations.map(serializeDoc),
      guestsWithoutTransport,
    });
  } catch (err) {
    console.error("❌ GET transportation failed:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    await connectDB();
    const { eventId } = await params;

    const gate = await requireTransportationManagement({ eventId });
    if (!gate.ok) return gate.response;

    const body = await req.json();
    const settings = await getOrCreateEventTransportation(eventId);

    if (typeof body.enabled === "boolean") settings.enabled = body.enabled;
    if (typeof body.guestRegistrationEnabled === "boolean") {
      settings.guestRegistrationEnabled = body.guestRegistrationEnabled;
    }
    if (typeof body.waitlistEnabled === "boolean") {
      settings.waitlistEnabled = body.waitlistEnabled;
    }
    if (typeof body.notes === "string") settings.notes = body.notes.trim();
    if (body.invitationId) settings.invitationId = body.invitationId;

    await settings.save();

    return NextResponse.json({
      success: true,
      settings: serializeDoc(settings),
    });
  } catch (err) {
    console.error("❌ PATCH transportation failed:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
