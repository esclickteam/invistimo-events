import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

import VenueHall from "@/models/VenueHall";

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

function serializeHall(hall: any) {
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
  };
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const auth = await getUserIdFromRequest(req);

    if (!auth?.userId) {
      return NextResponse.json(
        {
          success: false,
          message: "לא מחובר",
        },
        { status: 401 }
      );
    }

    const halls = await VenueHall.find({
      ownerId: auth.userId,
    })
      .sort({ createdAt: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      halls: halls.map(serializeHall),
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

    const auth = await getUserIdFromRequest(req);

    if (!auth?.userId) {
      return NextResponse.json(
        {
          success: false,
          message: "לא מחובר",
        },
        { status: 401 }
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

    const hall = await VenueHall.create({
      ownerId: auth.userId,

      id: makeHallId(name),

      name,
      subtitle,

      capacity: Math.max(0, toNumber(body.capacity)),
      monthlyEvents: 0,
      upcomingEvents: 0,
      occupancyRate: 0,
      monthlyRevenue: 0,

      nextEventAt: "",

      status: allowedStatuses.includes(body.status)
        ? body.status
        : "active",

      image,
    });

    return NextResponse.json({
      success: true,
      message: "האולם נוצר בהצלחה",
      hall: serializeHall(hall),
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