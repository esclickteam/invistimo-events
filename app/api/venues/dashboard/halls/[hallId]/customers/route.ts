import { NextRequest, NextResponse } from "next/server";
import VenueLead from "@/models/VenueLead";
import VenueEvent from "@/models/VenueEvent";
import { connectDB } from "@/lib/db";
import { requireVenueAccess } from "@/lib/venues/requireVenueAccess";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Props = {
  params: Promise<{ hallId: string }>;
};

type CustomerRow = {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: string;
  eventCount: number;
  sources: string[];
  notes: string;
  lastActivity: string;
  lastActivityAt: string | null;
};

function normalizeKey(name: string, phone: string, email: string) {
  const e = email.trim().toLowerCase();
  const p = phone.replace(/\D/g, "");
  if (e) return `email:${e}`;
  if (p) return `phone:${p}`;
  return `name:${name.trim().toLowerCase()}`;
}

function mergeCustomer(
  map: Map<string, CustomerRow>,
  key: string,
  partial: Omit<CustomerRow, "id" | "eventCount" | "sources"> & {
    source?: string;
    eventCountDelta?: number;
  }
) {
  const existing = map.get(key);
  const source = partial.source?.trim();

  if (!existing) {
    map.set(key, {
      id: key,
      name: partial.name,
      phone: partial.phone,
      email: partial.email,
      status: partial.status,
      eventCount: partial.eventCountDelta || 0,
      sources: source ? [source] : [],
      notes: partial.notes,
      lastActivity: partial.lastActivity,
      lastActivityAt: partial.lastActivityAt,
    });
    return;
  }

  if (partial.name && !existing.name) existing.name = partial.name;
  if (partial.phone && !existing.phone) existing.phone = partial.phone;
  if (partial.email && !existing.email) existing.email = partial.email;
  if (partial.notes && !existing.notes) existing.notes = partial.notes;

  existing.eventCount += partial.eventCountDelta || 0;
  if (source && !existing.sources.includes(source)) {
    existing.sources.push(source);
  }

  if (partial.lastActivityAt && existing.lastActivityAt) {
    if (new Date(partial.lastActivityAt) > new Date(existing.lastActivityAt)) {
      existing.lastActivity = partial.lastActivity;
      existing.lastActivityAt = partial.lastActivityAt;
      existing.status = partial.status;
    }
  } else if (partial.lastActivityAt && !existing.lastActivityAt) {
    existing.lastActivity = partial.lastActivity;
    existing.lastActivityAt = partial.lastActivityAt;
    existing.status = partial.status;
  }
}

export async function GET(req: NextRequest, { params }: Props) {
  try {
    await connectDB();
    const { hallId } = await params;
    const { ctx, error } = await requireVenueAccess(req, hallId, "guests.view");
    if (error || !ctx) return error!;

    const [leads, events] = await Promise.all([
      VenueLead.find({
        hallId: ctx.venueId,
        ownerId: ctx.ownerId,
      })
        .sort({ updatedAt: -1 })
        .lean(),
      VenueEvent.find({
        hallId: ctx.venueId,
        ownerId: ctx.ownerId,
      })
        .sort({ updatedAt: -1 })
        .lean(),
    ]);

    const map = new Map<string, CustomerRow>();

    for (const lead of leads) {
      const name = String((lead as any).name || "").trim() || "ללא שם";
      const phone = String((lead as any).phone || "");
      const email = String((lead as any).email || "");
      const key = normalizeKey(name, phone, email);
      const updatedAt = (lead as any).updatedAt
        ? new Date((lead as any).updatedAt).toISOString()
        : null;

      mergeCustomer(map, key, {
        name,
        phone,
        email,
        status: String((lead as any).status || "lead"),
        source: String((lead as any).source || "ליד"),
        eventCountDelta: (lead as any).venueEventId || (lead as any).eventId ? 1 : 0,
        notes: String((lead as any).lastActivity || ""),
        lastActivity: String((lead as any).lastActivity || "ליד"),
        lastActivityAt: updatedAt,
      });
    }

    for (const event of events) {
      const name =
        String((event as any).clientName || "").trim() ||
        String((event as any).title || "").trim() ||
        "ללא שם";
      const phone = String((event as any).clientPhone || "");
      const email = String((event as any).clientEmail || "");
      const key = normalizeKey(name, phone, email);
      const updatedAt = (event as any).updatedAt
        ? new Date((event as any).updatedAt).toISOString()
        : null;

      mergeCustomer(map, key, {
        name,
        phone,
        email,
        status: String((event as any).status || "event"),
        source: "אירוע",
        eventCountDelta: 1,
        notes: String((event as any).notes || ""),
        lastActivity: `אירוע: ${String((event as any).title || name)}`,
        lastActivityAt: updatedAt,
      });
    }

    const customers = Array.from(map.values()).sort((a, b) => {
      const aTime = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
      const bTime = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0;
      return bTime - aTime;
    });

    return NextResponse.json({
      success: true,
      customers,
      count: customers.length,
    });
  } catch (err) {
    console.error("GET customers failed:", err);
    return NextResponse.json(
      { success: false, message: "טעינת לקוחות נכשלה" },
      { status: 500 }
    );
  }
}
