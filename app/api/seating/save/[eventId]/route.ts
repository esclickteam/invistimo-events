import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import SeatingTable from "@/models/SeatingTable";
import InvitationGuest from "@/models/InvitationGuest";
import Invitation from "@/models/Invitation";
import { requireSeating } from "@/lib/guards/requireSeating";

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

    /* ===============================
       🔑 eventId – מקור אמת יחיד
    =============================== */
    const { eventId } = await context.params;

    if (!eventId) {
      return NextResponse.json(
        { success: false, error: "Missing eventId" },
        { status: 400 }
      );
    }

    /* ===============================
       🔐 Guard – בדיקת חבילת הושבה
    =============================== */
    const guard = await requireSeating(eventId);
    if (!guard.ok) {
      return guard.response!;
    }

    const userId = guard.userId!;

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
       🔐 הרשאות – לקוח / מפיק
       ⭐ לקוח = בעל האירוע (הכי חשוב)
    =============================== */
    const invitation = await Invitation.findOne({ eventId }).lean();

    if (!invitation) {
      return NextResponse.json(
        { success: false, error: "INVITATION_NOT_FOUND" },
        { status: 404 }
      );
    }

    const isClientOwner =
      String(invitation.ownerId) === String(userId) ||
      String(invitation.userId) === String(userId);

    const isProducer =
      Array.isArray(invitation.producers) &&
      invitation.producers.some(
        (p: any) => String(p.userId ?? p) === String(userId)
      );

    if (!isClientOwner && !isProducer) {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN" },
        { status: 403 }
      );
    }

    /* ===============================
       SAVE / UPSERT – Seating
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
       שיוך אורחים לשולחנות
       + איפוס רק למי שלא שובץ
    =============================== */
    const updatedGuestIds = new Set<string>();

    for (const table of tables) {
      if (!Array.isArray(table.seatedGuests)) continue;

      const tableNumber =
        typeof table.name === "string"
          ? Number(table.name.replace(/\D/g, "")) || null
          : null;

      for (const seated of table.seatedGuests) {
        if (!seated?.guestId) continue;

        updatedGuestIds.add(String(seated.guestId));

        await InvitationGuest.findByIdAndUpdate(seated.guestId, {
          tableNumber,
          tableName: table.name ?? "",
        });
      }
    }

    /* 🧹 איפוס רק אורחים שלא שובצו */
    await InvitationGuest.updateMany(
      {
        invitationId: invitation._id,
        _id: { $nin: Array.from(updatedGuestIds) },
      },
      { $set: { tableNumber: null, tableName: "" } }
    );

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
