import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import SeatingTable from "@/models/SeatingTable";
import InvitationGuest from "@/models/InvitationGuest";
import Invitation from "@/models/Invitation";
import Group from "@/models/Group"; // ⭐ חובה
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

    /* 🔐 Guard אחיד – הרשאת הושבה */
    const guard = await requireSeating();
    if (!guard.ok) return guard.response!;

    const userId = guard.userId!;
    const { eventId } = await context.params;

    if (!eventId) {
      return NextResponse.json(
        { success: false, error: "Missing eventId" },
        { status: 400 }
      );
    }

    const body = await req.json();

    console.log("📥 SAVE SEATING BODY:", {
      eventId,
      tables: body.tables?.length,
      zones: body.zones?.length,
    });

    /* ===============================
       TABLES
    =============================== */
    const rawTables = Array.isArray(body.tables) ? body.tables : [];

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
       ⭐ NORMALIZE GROUP SNAPSHOT
    =============================== */
    const groupIds: string[] = Array.from(
  new Set(
    rawTables
      .map((t: any) => t?.group)
      .filter((g: unknown): g is string => typeof g === "string")
  )
);

    const groups =
      groupIds.length > 0
        ? await Group.find({
            _id: { $in: groupIds.map(id => new mongoose.Types.ObjectId(id)) },
            invitationId: invitation._id,
          }).lean()
        : [];

    const groupsById = new Map(
      groups.map((g: any) => [String(g._id), g])
    );

    const tables = rawTables.map((table: any) => {
      if (typeof table.group === "string") {
        const g = groupsById.get(table.group);

        return {
          ...table,
          group: g
            ? {
                id: g._id,
                name: g.name ?? "",
                expectedCount: g.expectedCount ?? 0,
              }
            : null,
        };
      }

      // כבר snapshot או null
      return table;
    });

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
       שיוך אורחים לשולחנות
    =============================== */
    const updatedGuestIds = new Set<string>();

    for (const table of tables) {
      if (!Array.isArray(table.seatedGuests)) continue;

      const tableNumber =
  typeof table.number === "number" ? table.number : null;


      for (const seated of table.seatedGuests) {
        if (!seated?.guestId) continue;

        updatedGuestIds.add(String(seated.guestId));

        await InvitationGuest.findByIdAndUpdate(seated.guestId, {
          tableNumber,
          tableName: null,
        });
      }
    }

    /* 🧹 איפוס רק לאורחים שלא שובצו */
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
