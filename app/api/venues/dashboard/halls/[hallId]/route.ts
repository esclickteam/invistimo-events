import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

import VenueHall from "@/models/VenueHall";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Props = {
  params: Promise<{
    hallId: string;
  }>;
};

const allowedStatuses = ["active", "maintenance", "closed"];

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function sanitizeHallBody(body: any) {
  return {
    name: String(body.name || "").trim() || "אולם ללא שם",
    subtitle: String(body.subtitle || "").trim(),

    capacity: Math.max(0, toNumber(body.capacity)),
    monthlyEvents: Math.max(0, toNumber(body.monthlyEvents)),
    upcomingEvents: Math.max(0, toNumber(body.upcomingEvents)),
    occupancyRate: Math.min(100, Math.max(0, toNumber(body.occupancyRate))),
    monthlyRevenue: Math.max(0, toNumber(body.monthlyRevenue)),

    nextEventAt: String(body.nextEventAt || "").trim(),

    status: allowedStatuses.includes(body.status) ? body.status : "active",

    image: String(body.image || "").trim(),
  };
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

export async function GET(req: NextRequest, { params }: Props) {
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

    const { hallId } = await params;

    const hall = await VenueHall.findOne({
      ownerId: auth.userId,
      id: hallId,
    }).lean();

    if (!hall) {
      return NextResponse.json(
        {
          success: false,
          message: "האולם לא נמצא",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      hall: serializeHall(hall),
    });
  } catch (error) {
    console.error("GET /api/venues/dashboard/halls/[hallId] failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "טעינת אולם נכשלה",
      },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, { params }: Props) {
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

    const { hallId } = await params;
    const body = await req.json();

    const update = sanitizeHallBody(body);

    const hall = await VenueHall.findOneAndUpdate(
      {
        ownerId: auth.userId,
        id: hallId,
      },
      {
        $set: update,
        $setOnInsert: {
          ownerId: auth.userId,
          id: hallId,
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    ).lean();

    return NextResponse.json({
      success: true,
      hall: serializeHall(hall),
    });
  } catch (error) {
    console.error("PUT /api/venues/dashboard/halls/[hallId] failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "שמירת פרטי אולם נכשלה",
      },
      { status: 500 }
    );
  }
}