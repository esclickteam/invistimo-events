import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import VenueHall from "@/models/VenueHall";
import VenueFile from "@/models/VenueFile";
import { requireVenueAccess } from "@/lib/venues/requireVenueAccess";
import { writeVenueAudit } from "@/lib/venues/audit";
import {
  deleteVenueFileFromCloudinary,
  uploadVenueFileToCloudinary,
  VenueStorageError,
} from "@/lib/venues/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Props = {
  params: Promise<{ hallId: string }>;
};

function isRealFile(value: FormDataEntryValue | null): value is File {
  return value instanceof File && value.size > 0;
}

function serializeHall(hall: any) {
  return {
    id: hall.id,
    name: hall.name,
    subtitle: hall.subtitle || "",
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

/* ======================================================
   PATCH — upload hall image and set VenueHall.image
====================================================== */
export async function PATCH(req: NextRequest, { params }: Props) {
  try {
    await connectDB();

    const { hallId } = await params;

    const { ctx, error } = await requireVenueAccess(
      req,
      hallId,
      "settings.edit"
    );
    if (error || !ctx) return error!;

    const formData = await req.formData();

    const file = isRealFile(formData.get("file"))
      ? (formData.get("file") as File)
      : null;

    if (!file) {
      return NextResponse.json(
        { success: false, message: "חובה להעלות תמונה" },
        { status: 400 }
      );
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { success: false, message: "יש להעלות קובץ תמונה בלבד" },
        { status: 400 }
      );
    }

    const existingHall = await VenueHall.findOne({
      ownerId: ctx.ownerId,
      id: ctx.venueId,
    }).lean();

    if (!existingHall) {
      return NextResponse.json(
        { success: false, message: "האולם לא נמצא" },
        { status: 404 }
      );
    }

    const previousFiles = await VenueFile.find({
      venueId: ctx.venueId,
      ownerId: ctx.ownerId,
      kind: "hall_image",
    }).lean();

    const uploaded = await uploadVenueFileToCloudinary({
      venueId: ctx.venueId,
      file,
      kind: "hall_image",
      folderSuffix: "hall-image",
    });

    const hall = await VenueHall.findOneAndUpdate(
      {
        ownerId: ctx.ownerId,
        id: ctx.venueId,
      },
      {
        $set: {
          image: uploaded.url,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    ).lean();

    if (!hall) {
      return NextResponse.json(
        { success: false, message: "האולם לא נמצא" },
        { status: 404 }
      );
    }

    // Best-effort cleanup of previous Cloudinary assets + VenueFile rows
    for (const prev of previousFiles as any[]) {
      try {
        if (prev.publicId) {
          await deleteVenueFileFromCloudinary(prev.publicId, prev.mimeType);
        }
      } catch (cleanupErr) {
        console.error("Previous hall image Cloudinary cleanup failed:", cleanupErr);
      }
    }
    if (previousFiles.length) {
      await VenueFile.deleteMany({
        venueId: ctx.venueId,
        ownerId: ctx.ownerId,
        kind: "hall_image",
        publicId: { $ne: uploaded.publicId },
      });
    }

    const venueFile = await VenueFile.create({
      venueId: ctx.venueId,
      ownerId: ctx.ownerId,
      kind: "hall_image",
      url: uploaded.url,
      publicId: uploaded.publicId,
      originalName: uploaded.originalName,
      mimeType: uploaded.mimeType,
      size: uploaded.size,
      uploadedBy: ctx.auth.userId,
    });

    await writeVenueAudit({
      venueId: ctx.venueId,
      ownerId: ctx.ownerId,
      actorUserId: ctx.auth.userId,
      action: "hall.image.upload",
      targetType: "VenueHall",
      targetId: ctx.venueId,
      meta: {
        fileId: String(venueFile._id),
        originalName: uploaded.originalName,
      },
    });

    return NextResponse.json({
      success: true,
      message: "תמונת האולם עודכנה",
      image: uploaded.url,
      hall: serializeHall(hall),
      file: {
        id: String(venueFile._id),
        url: uploaded.url,
        publicId: uploaded.publicId,
        originalName: uploaded.originalName,
        mimeType: uploaded.mimeType,
        size: uploaded.size,
      },
    });
  } catch (error) {
    if (error instanceof VenueStorageError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: error.status }
      );
    }

    console.error("PATCH hall image failed:", error);

    return NextResponse.json(
      { success: false, message: "העלאת תמונת אולם נכשלה" },
      { status: 500 }
    );
  }
}
