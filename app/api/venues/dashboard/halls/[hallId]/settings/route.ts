import { NextRequest, NextResponse } from "next/server";
import VenueHall from "@/models/VenueHall";
import { connectDB } from "@/lib/db";
import { requireVenueAccess } from "@/lib/venues/requireVenueAccess";
import { writeVenueAudit } from "@/lib/venues/audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Props = {
  params: Promise<{ hallId: string }>;
};

const allowedStatuses = ["active", "maintenance", "closed"];

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function serializeSettings(hall: any) {
  return {
    venueId: String(hall.id || hall._id),
    name: hall.name || "",
    subtitle: hall.subtitle || "",
    capacity: Number(hall.capacity || 0),
    status: hall.status || "active",
    image: hall.image || "",
    address: hall.address || "",
    phone: hall.phone || "",
    email: hall.email || "",
    timezone: hall.timezone || "Asia/Jerusalem",
  };
}

export async function GET(req: NextRequest, { params }: Props) {
  try {
    await connectDB();
    const { hallId } = await params;
    const { ctx, error } = await requireVenueAccess(req, hallId, "settings.view");
    if (error || !ctx) return error!;

    return NextResponse.json({
      success: true,
      settings: serializeSettings(ctx.hall),
    });
  } catch (err) {
    console.error("GET settings failed:", err);
    return NextResponse.json(
      { success: false, message: "טעינת הגדרות נכשלה" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, { params }: Props) {
  try {
    await connectDB();
    const { hallId } = await params;
    const { ctx, error } = await requireVenueAccess(req, hallId, "settings.edit");
    if (error || !ctx) return error!;

    const body = await req.json();

    const update: Record<string, unknown> = {};

    if (body.name !== undefined) update.name = cleanString(body.name) || "אולם ללא שם";
    if (body.subtitle !== undefined) update.subtitle = cleanString(body.subtitle);
    if (body.capacity !== undefined) {
      update.capacity = Math.max(0, Number(body.capacity) || 0);
    }
    if (body.status !== undefined && allowedStatuses.includes(body.status)) {
      update.status = body.status;
    }
    if (body.image !== undefined) update.image = cleanString(body.image);
    if (body.address !== undefined) update.address = cleanString(body.address);
    if (body.phone !== undefined) update.phone = cleanString(body.phone);
    if (body.email !== undefined) update.email = cleanString(body.email);
    if (body.timezone !== undefined) {
      update.timezone = cleanString(body.timezone) || "Asia/Jerusalem";
    }

    const hall = await VenueHall.findOneAndUpdate(
      { id: ctx.venueId, ownerId: ctx.ownerId },
      { $set: update },
      { new: true, runValidators: true }
    ).lean();

    if (!hall) {
      return NextResponse.json(
        { success: false, message: "האולם לא נמצא" },
        { status: 404 }
      );
    }

    await writeVenueAudit({
      venueId: ctx.venueId,
      ownerId: ctx.ownerId,
      actorUserId: ctx.auth.userId,
      action: "settings.update",
      targetType: "VenueHall",
      targetId: ctx.venueId,
      meta: { fields: Object.keys(update) },
    });

    return NextResponse.json({
      success: true,
      settings: serializeSettings(hall),
    });
  } catch (err) {
    console.error("PUT settings failed:", err);
    return NextResponse.json(
      { success: false, message: "שמירת הגדרות נכשלה" },
      { status: 500 }
    );
  }
}
