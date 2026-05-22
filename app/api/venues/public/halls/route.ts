import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import VenueHall from "@/models/VenueHall";
import User from "@/models/User";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function serializeHall(hall: any, owner: any) {
  return {
    venueOwnerId: String(hall.ownerId),
    venueHallId: String(hall.id || hall._id),
    venueHallName: hall.name || "",

    name: hall.name || "",
    subtitle: hall.subtitle || "",
    capacity: hall.capacity || 0,
    status: hall.status || "active",
    image: hall.image || "",

    ownerName:
      owner?.businessName ||
      owner?.name ||
      owner?.fullName ||
      owner?.email ||
      "בעל אולם",
  };
}

export async function GET(req: NextRequest) {
  try {
    await db();

    const { searchParams } = new URL(req.url);
    const q = String(searchParams.get("q") || "").trim();

    const query: any = {
      status: { $ne: "closed" },
    };

    if (q) {
      query.$or = [
        { name: { $regex: q, $options: "i" } },
        { subtitle: { $regex: q, $options: "i" } },
      ];
    }

    const halls = await VenueHall.find(query)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const ownerIds = [
      ...new Set(
        halls
          .map((hall: any) => String(hall.ownerId || ""))
          .filter(Boolean)
      ),
    ];

    const owners = await User.find({
      _id: { $in: ownerIds },
    })
      .select("email name fullName businessName")
      .lean();

    const ownerMap = new Map(
      owners.map((owner: any) => [String(owner._id), owner])
    );

    return NextResponse.json({
      success: true,
      halls: halls.map((hall: any) =>
        serializeHall(hall, ownerMap.get(String(hall.ownerId)))
      ),
    });
  } catch (error) {
    console.error("GET /api/venues/public/halls failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "טעינת רשימת האולמות נכשלה",
      },
      { status: 500 }
    );
  }
}