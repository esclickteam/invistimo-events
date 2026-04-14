import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import SeatingTable from "@/models/SeatingTable";
import InvitationGuest from "@/models/InvitationGuest";
import Invitation from "@/models/Invitation";
import Group from "@/models/Group";
import { requireSeating } from "@/lib/guards/requireSeating";

export const dynamic = "force-dynamic";

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

    const guard = await requireSeating();
    if (!guard.ok) return guard.response!;

    const userId = guard.userId!;

    /* ===============================
       ⭐ query (חדש!)
    =============================== */
    const { searchParams } = new URL(req.url);
    const invitationIdFromQuery = searchParams.get("invitationId");

    const { eventId } = await context.params;

    if (!invitationIdFromQuery && !eventId) {
      return NextResponse.json(
        { success: false, error: "Missing invitationId or eventId" },
        { status: 400 }
      );
    }

    const body = await req.json();

    console.log("📥 SAVE SEATING BODY:", {
      eventId,
      invitationIdFromQuery,
      tables: body.tables?.length,
    });

    /* ===============================
       ⭐ מציאת invitation אמיתי
    =============================== */
    let invitation = null;

    if (invitationIdFromQuery) {
      invitation = await Invitation.findById(invitationIdFromQuery).lean();
    }

    if (!invitation && eventId) {
      invitation = await Invitation.findOne({ eventId }).lean();
    }

    if (!invitation) {
      return NextResponse.json(
        { success: false, error: "INVITATION_NOT_FOUND" },
        { status: 404 }
      );
    }

    const realInvitationId = String(invitation._id);

    /* ===============================
       🔐 הרשאות
    =============================== */
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
       DATA
    =============================== */
    const rawTables = Array.isArray(body.tables) ? body.tables : [];
    const zones = Array.isArray(body.zones) ? body.zones : [];

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

    const canvasView =
      body.canvasView &&
      typeof body.canvasView.scale === "number"
        ? {
            scale: body.canvasView.scale,
            x: body.canvasView.x,
            y: body.canvasView.y,
          }
        : null;

    /* ===============================
       GROUP SNAPSHOT
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
            _id: {
              $in: groupIds.map((id) => new mongoose.Types.ObjectId(id)),
            },
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

      return table;
    });

    /* ===============================
       ⭐ SAVE לפי invitationId
    =============================== */
    const saved = await SeatingTable.findOneAndUpdate(
      { invitationId: realInvitationId },
      {
        $set: {
          invitationId: realInvitationId,
          eventId: invitation.eventId,
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
       UPDATE GUESTS
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

    await InvitationGuest.updateMany(
      {
        invitationId: realInvitationId,
        _id: { $nin: Array.from(updatedGuestIds) },
      },
      { $set: { tableNumber: null, tableName: "" } }
    );

    return NextResponse.json({
      success: true,
      seatingId: saved._id,
      invitationId: realInvitationId,
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