import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import SeatingTable from "@/models/SeatingTable";
import InvitationGuest from "@/models/InvitationGuest";
import Invitation from "@/models/Invitation";
import Group from "@/models/Group";
import { requireSeating } from "@/lib/guards/requireSeating";

export const dynamic = "force-dynamic";

/* ===============================
   TYPES
=============================== */
type BackgroundPayload = {
  url: string;
  opacity?: number;
};

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    /* 🔐 Guard – יוזר מחובר */
    const guard = await requireSeating();
    if (!guard.ok) return guard.response!;

    const userId = guard.userId!;
    const body = await req.json();

    console.log("📥 SAVE SEATING (USER):", {
      userId,
      tables: body.tables?.length,
      zones: body.zones?.length,
    });

    /* ===============================
       TABLES / ZONES
    =============================== */
    const rawTables = Array.isArray(body.tables) ? body.tables : [];
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
       ⭐ GROUP SNAPSHOT (אם יש)
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
       💾 SAVE / UPSERT – לפי userId
    =============================== */
    const saved = await SeatingTable.findOneAndUpdate(
      { userId },
      {
        $set: {
          userId,
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
       🔁 סנכרון אורחים (אם יש invitationId בבקשה)
    =============================== */
    if (body.invitationId) {
      const invitation = await Invitation.findById(body.invitationId).lean();

      if (invitation) {
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
            invitationId: invitation._id,
            _id: { $nin: Array.from(updatedGuestIds) },
          },
          { $set: { tableNumber: null, tableName: "" } }
        );
      }
    }

    return NextResponse.json({
      success: true,
      seatingId: saved._id,
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
