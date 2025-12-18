import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import SeatingTable from "@/models/SeatingTable";
import InvitationGuest from "@/models/InvitationGuest";
import User from "@/models/User";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const dynamic = "force-dynamic";

/* ===============================
   TYPES
=============================== */
type RouteContext = {
  params: Promise<{ invitationId: string }>;
};

type BackgroundPayload = {
  url: string;
  opacity?: number;
};

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    await dbConnect();

    /* 🔐 זיהוי משתמש */
    const userId = await getUserIdFromRequest();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

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

    const { invitationId } = await context.params;
    const body = await req.json();

    // 🔎 בדיקה קריטית (אפשר למחוק בפרודקשן)
    console.log("📥 SAVE SEATING BODY:", body);

    /* ===============================
       TABLES
    =============================== */
    const tables = Array.isArray(body.tables) ? body.tables : [];

    /* ===============================
       ZONES
    =============================== */
    const zones = Array.isArray(body.zones) ? body.zones : [];

    /* ===============================
       BACKGROUND (OPTIONAL)
    =============================== */
    let background: BackgroundPayload | null = null;

    if (typeof body.background === "string") {
      background = { url: body.background, opacity: 0.28 };
    } else if (
      body.background &&
      typeof body.background.url === "string"
    ) {
      background = {
        url: body.background.url,
        opacity:
          typeof body.background.opacity === "number"
            ? body.background.opacity
            : 0.28,
      };
    }

    /* ===============================
       CANVAS VIEW (ZOOM + PAN)
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
       SAVE / UPSERT
    =============================== */
    const saved = await SeatingTable.findOneAndUpdate(
      { invitationId },
      {
        $set: {
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
       SNAPSHOT – RESET TABLE NUMBER
       (לא נוגעים בלוגיקה הקיימת)
    =============================== */
    await InvitationGuest.updateMany(
      { invitationId },
      { $set: { tableNumber: null } }
    );

    /* ===============================
       ASSIGN TABLES TO GUESTS
       ✅ תיקון CAST ERROR
    =============================== */
    for (const table of tables) {
      if (!Array.isArray(table.seatedGuests)) continue;

      // חילוץ מספר שולחן מהשם (אם קיים)
      const tableNumber =
        typeof table.name === "string"
          ? Number(table.name.replace(/\D/g, "")) || null
          : null;

      for (const seated of table.seatedGuests) {
        if (!seated?.guestId) continue;

        await InvitationGuest.findByIdAndUpdate(seated.guestId, {
          tableNumber,                 // ✅ מספר בלבד
          tableName: table.name ?? "", // ✅ שם לתצוגה
        });
      }
    }

    return NextResponse.json({
      success: true,
      seatingId: saved._id,
      hasBackground: !!background,
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
