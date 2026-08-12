import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { listUserVenueMemberships } from "@/lib/venues/requireVenueAccess";
import { isVenuePilotOwnerAllowed } from "@/lib/venues/pilotGate";
import { writeVenueAudit } from "@/lib/venues/audit";
import VenueHall from "@/models/VenueHall";
import VenueMembership from "@/models/VenueMembership";
import User from "@/models/User";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const allowedStatuses = ["active", "maintenance", "closed"];

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function makeHallId(name: string) {
  const cleaned = String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0590-\u05ff]+/gi, "-")
    .replace(/^-+|-+$/g, "");

  const suffix = Math.random().toString(36).slice(2, 8);

  return `${cleaned || "hall"}-${Date.now()}-${suffix}`;
}

function serializeHall(hall: any, extra?: { role?: string }) {
  return {
    id: hall.id,
    name: hall.name,
    subtitle: hall.subtitle,
    capacity: hall.capacity || 0,
    monthlyEvents: hall.monthlyEvents || 0,
    upcomingEvents: hall.upcomingEvents || 0,
    occupancyRate: hall.occupancyRate || 0,
    monthlyRevenue: hall.monthlyRevenue || 0,
    nextEventAt: hall.nextEventAt || "",
    status: hall.status || "active",
    image: hall.image || "",
    role: extra?.role || "",
  };
}

async function resolveVenueSuiteActor(req: NextRequest) {
  const auth = await getUserIdFromRequest(req);
  if (!auth?.userId) {
    return {
      error: NextResponse.json(
        { success: false, message: "לא מחובר" },
        { status: 401 }
      ),
    };
  }

  const user = await User.findById(auth.userId)
    .select("role isActive venueUser employeeScope accessModules")
    .lean();

  if (!user) {
    return {
      error: NextResponse.json(
        { success: false, message: "משתמש לא נמצא" },
        { status: 404 }
      ),
    };
  }

  if ((user as any).isActive === false) {
    return {
      error: NextResponse.json(
        { success: false, message: "המשתמש אינו פעיל" },
        { status: 403 }
      ),
    };
  }

  const isInvistimoStaff =
    (user as any).role === "staff" && (user as any).employeeScope !== "venue";
  const isAdmin =
    auth.role === "admin" ||
    ((user as any).role === "admin" && !auth.impersonated);

  if (isInvistimoStaff && !isAdmin) {
    return {
      error: NextResponse.json(
        { success: false, message: "אין הרשאה לאזור האולמות" },
        { status: 403 }
      ),
    };
  }

  const memberships = await listUserVenueMemberships(String(auth.userId));
  const isVenueOwnerRole =
    (user as any).role === "venue_owner" ||
    auth.role === "venue_owner" ||
    Boolean((user as any).accessModules?.venues) ||
    Boolean((user as any).venueUser);

  if (!isAdmin && !memberships.length && !isVenueOwnerRole) {
    return {
      error: NextResponse.json(
        { success: false, message: "אין הרשאה לאזור האולמות" },
        { status: 403 }
      ),
    };
  }

  return {
    auth,
    user,
    isAdmin,
    memberships,
    isVenueOwnerRole,
    error: null as null,
  };
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const actor = await resolveVenueSuiteActor(req);
    if (actor.error || !actor.auth) return actor.error!;

    const memberships = actor.memberships || [];
    const venueIds = memberships.map((m) => m.venueId);

    const halls = venueIds.length
      ? await VenueHall.find({ id: { $in: venueIds } })
          .sort({ createdAt: 1 })
          .lean()
      : [];

    const roleById = new Map(memberships.map((m) => [m.venueId, m.role]));

    return NextResponse.json({
      success: true,
      halls: halls.map((h: any) =>
        serializeHall(h, { role: roleById.get(String(h.id)) || "" })
      ),
    });
  } catch (error) {
    console.error("GET /api/venues/dashboard/halls failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "טעינת אולמות נכשלה",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const actor = await resolveVenueSuiteActor(req);
    if (actor.error || !actor.auth) return actor.error!;

    const ownerId = String(actor.auth.userId);
    const canCreate =
      actor.isAdmin ||
      actor.isVenueOwnerRole ||
      (actor.memberships || []).some((m) => m.role === "OWNER");

    if (!canCreate) {
      return NextResponse.json(
        {
          success: false,
          message: "רק בעל אולם יכול ליצור אולם חדש",
        },
        { status: 403 }
      );
    }

    const pilot = isVenuePilotOwnerAllowed({
      ownerId,
      isAdmin: actor.isAdmin,
    });
    if (!pilot.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: pilot.reason || "יצירת אולם חסומה במצב פיילוט",
        },
        { status: 403 }
      );
    }

    const body = await req.json();

    const name = String(body.name || "").trim();
    const subtitle = String(body.subtitle || "").trim();
    const image = String(body.image || "").trim();

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message: "חובה להזין שם אולם",
        },
        { status: 400 }
      );
    }

    const hallId = makeHallId(name);

    const hall = await VenueHall.create({
      ownerId,
      id: hallId,
      name,
      subtitle,
      capacity: Math.max(0, toNumber(body.capacity)),
      monthlyEvents: 0,
      upcomingEvents: 0,
      occupancyRate: 0,
      monthlyRevenue: 0,
      nextEventAt: "",
      status: allowedStatuses.includes(body.status) ? body.status : "active",
      image,
    });

    await VenueMembership.findOneAndUpdate(
      { userId: ownerId, venueId: hallId },
      {
        $setOnInsert: {
          userId: ownerId,
          venueId: hallId,
          ownerId,
          role: "OWNER",
          permissions: [],
          status: "active",
          mustChangePassword: false,
          createdBy: ownerId,
        },
      },
      { upsert: true }
    );

    await writeVenueAudit({
      venueId: hallId,
      ownerId,
      actorUserId: ownerId,
      action: "hall.create",
      targetType: "VenueHall",
      targetId: hallId,
      meta: { name },
    });

    return NextResponse.json({
      success: true,
      message: "האולם נוצר בהצלחה",
      hall: serializeHall(hall, { role: "OWNER" }),
    });
  } catch (error) {
    console.error("POST /api/venues/dashboard/halls failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "יצירת אולם נכשלה",
      },
      { status: 500 }
    );
  }
}
