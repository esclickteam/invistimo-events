import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import SeatingTable from "@/models/SeatingTable";
import InvitationGuest from "@/models/InvitationGuest";
import User from "@/models/User";
import Invitation from "@/models/Invitation";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const dynamic = "force-dynamic";

/* ===============================
   TYPES
=============================== */
type RouteContext = {
  params: Promise<{ eventId: string }>;
};

type BackgroundPayload = {
  url: string;
  opacity?: number;
};

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    await dbConnect();

    /* 🔐 זיהוי משתמש */
    const auth = await getUserIdFromRequest();
    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const userId = auth.userId;

    /* 🔐 בדיקת חבילה – הושבה */
    const user = await User.findById(userId).lean();
    if (!user?.planLimits?.seatingEnabled) {
      return NextResponse.json(
        {
          success: false,
          error: "Seating is not included in your plan",
          code: "SEATING_NOT_ALLOWED",
        },
        { status: 403 }
      );
    }

    const { eventId } = await context.params;
    const body = await req.json();

    console.log("📥 SAVE SEATING BODY:", {
      eventId,
      tables: body.tables?.length,
      zones: body.zones?.length,
    });

    /* ===============================
       TABLES
    =============================== */
    const tables = Array.isArray(body.tables) ? body.tables : [];

    /* ===============================
       ZONES
    =============================== */
    const zones = Array.isArray(body.zones) ? body.zones : [];

    /* ===============================
       BACKGROUND
    =============================== */
    let background: BackgroundPayload | null = null;

    if (typeof body.background === "string") {
      background = { url: body.background, opacity: 0.28 };
    } else if (body.background?.url) {
      background = {
        url: body.background.url,
        opacity:
          typeof body.background.opacity === "number"
            ? body.background.opacity
            : 0.28,
      };
    }

    /* ===============================
       CANVAS VIEW
    =============================== */
    const canvasView =
      body.canvasView &&
      typeof body.canvasView.scale === "number" &&
      typeof body.canvasView.x === "number" &&
      typeof body.canvasView.y === "number"
        ? {
            scale: body.canvasView.scale,
            x: body.canvasView.x,
            y: body.canvasView.y,
          }
        : null;

    /* ===============================
       🔐 הרשאות – לפני כתיבה
    =============================== */
    const invitation = await Invitation.findOne({ eventId }).lean();

    if (!invitation) {
      return NextResponse.json(
        { success: false, error: "INVITATION_NOT_FOUND" },
        { status: 404 }
      );
    }

    const isOwner = String(invitation.ownerId) === String(userId);

    const isProducer =
      Array.isArray(invitation.producers) &&
      invitation.producers.some(
        (p: any) => String(p.userId ?? p) === String(userId)
      );

    if (!isOwner && !isProducer) {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN" },
        { status: 403 }
      );
    }

    /* ===============================
       SAVE / UPSERT (לפי eventId)
    =============================== */
    const saved = await SeatingTable.findOneAndUpdate(
      { eventId },
      {
        $set: {
          eventId,
          tables,
          zones,
          background,
          canvasView,
          updatedAt: new Date(),
        },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    /* ===============================
       איפוס מספרי שולחן לאורחים
       (האורחים שייכים להזמנה)
    =============================== */
    await InvitationGuest.updateMany(
      { invitationId: invitation._id },
      { $set: { tableNumber: null, tableName: "" } }
    );

    /* ===============================
       שיוך אורחים לשולחנות
    =============================== */
    for (const table of tables) {
      if (!Array.isArray(table.seatedGuests)) continue;

      const tableNumber =
        typeof table.name === "string"
          ? Number(table.name.replace(/\D/g, "")) || null
          : null;

      for (const seated of table.seatedGuests) {
        if (!seated?.guestId) continue;

        await InvitationGuest.findByIdAndUpdate(seated.guestId, {
          tableNumber,
          tableName: table.name ?? "",
        });
      }
    }

    return NextResponse.json({
      success: true,
      seatingId: saved._id,
      eventId,
      tablesCount: tables.length,
      zonesCount: zones.length,
    });
  } catch (err) {
    console.error("❌ Save seating error:", err);

    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
