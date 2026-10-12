import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import dbConnect from "@/lib/db";
import SeatingTable from "@/models/SeatingTable";
import InvitationGuest from "@/models/InvitationGuest";
import Group from "@/models/Group";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import {
  planInvitationGuestSeatingWrites,
  type PlannedSeatingGuestWrite,
} from "@/lib/invitationGuestWrites";
import { pruneHiddenTableIdsForEvent } from "@/lib/messages/reminderSmsSettings";
import {
  commitSeatingSnapshot,
  readSeatingWriteCredentials,
} from "@/lib/seating/editLockServer";
import {
  canSaveSeating,
  cleanString,
  findInvitationForSeating,
  toObjectId,
} from "@/lib/seating/seatingAccess";
import type { SaveScope } from "@/lib/seating/editLock";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* ===============================
   TYPES
=============================== */

type RouteContext = {
  params: Promise<{ eventId: string }>;
};

type BackgroundPayload = {
  url: string;
  opacity?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
};

function normalizeBackground(rawBackground: any): BackgroundPayload | null {
  if (typeof rawBackground === "string" && rawBackground.trim()) {
    return {
      url: rawBackground.trim(),
      opacity: 0.28,
    };
  }

  if (rawBackground?.url) {
    const background: BackgroundPayload = {
      url: String(rawBackground.url).trim(),
      opacity:
        typeof rawBackground.opacity === "number"
          ? rawBackground.opacity
          : 0.28,
    };

    const rect = {
      x: Number(rawBackground.x),
      y: Number(rawBackground.y),
      width: Number(rawBackground.width),
      height: Number(rawBackground.height),
    };

    if (
      Number.isFinite(rect.x) &&
      Number.isFinite(rect.y) &&
      rect.width > 0 &&
      rect.height > 0
    ) {
      Object.assign(background, rect);
    }

    return background;
  }

  return null;
}

const TABLE_GEOMETRY_KEYS = [
  "x",
  "y",
  "rotation",
  "type",
  "width",
  "height",
  "radius",
] as const;

function tableGeometryChanged(previousTables: any[], nextTables: any[]) {
  const previousById = new Map(
    (previousTables || []).map((table: any) => [String(table?.id || ""), table])
  );

  return (nextTables || []).some((table: any) => {
    const previous = previousById.get(String(table?.id || ""));
    if (!previous) return false;

    return TABLE_GEOMETRY_KEYS.some((key) => {
      const before = previous?.[key];
      const after = table?.[key];
      if (after === undefined || after === null) return false;
      if (typeof after === "number" || typeof before === "number") {
        return Math.abs(Number(after) - Number(before ?? 0)) > 0.5;
      }
      return String(after) !== String(before ?? "");
    });
  });
}

function toGuestIdFilter(guestId: string) {
  return toObjectId(guestId) || guestId;
}

function seatingGuestBulkOps(
  writes: PlannedSeatingGuestWrite[],
  invitationId: unknown
) {
  const now = new Date();

  return writes.map((write) => ({
    updateOne: {
      filter: {
        _id: toGuestIdFilter(write.guestId),
        invitationId,
      },
      update: {
        $set: {
          tableId: write.fields.tableId,
          tableNumber: write.fields.tableNumber,
          tableName: write.fields.tableName,
          updatedAt: now,
        },
      },
    },
  }));
}

async function syncInvitationGuestsFromSeating({
  invitationId,
  eventId,
  tables,
}: {
  invitationId: unknown;
  eventId: string;
  tables: any[];
}) {
  const guests = await InvitationGuest.find({ invitationId })
    .select("_id tableId tableNumber tableName")
    .lean();

  const plan = planInvitationGuestSeatingWrites({
    guests,
    tables,
    source: "seating.save",
    eventId,
    invitationId: String(invitationId),
  });

  if (!plan.writes.length) {
    return {
      writes: 0,
      skippedUnchanged: plan.skippedUnchanged,
    };
  }

  const bulkResult = await InvitationGuest.bulkWrite(
    seatingGuestBulkOps(plan.writes, invitationId),
    { ordered: false }
  );

  return {
    writes: plan.writes.length,
    skippedUnchanged: plan.skippedUnchanged,
    matchedCount: bulkResult.matchedCount,
    modifiedCount: bulkResult.modifiedCount,
  };
}

function normalizeCanvasView(rawCanvasView: any) {
  if (
    rawCanvasView &&
    typeof rawCanvasView.scale === "number" &&
    typeof rawCanvasView.x === "number" &&
    typeof rawCanvasView.y === "number"
  ) {
    return {
      scale: rawCanvasView.scale,
      x: rawCanvasView.x,
      y: rawCanvasView.y,
    };
  }

  return null;
}

async function normalizeTablesWithGroups({
  rawTables,
  invitationId,
}: {
  rawTables: any[];
  invitationId: any;
}) {
  const groupIds: string[] = Array.from(
    new Set(
      rawTables
        .map((table: any) => table?.group)
        .filter((group: unknown): group is string => {
          return (
            typeof group === "string" &&
            mongoose.Types.ObjectId.isValid(group)
          );
        })
    )
  );

  const groups =
    groupIds.length > 0
      ? await Group.find({
          _id: {
            $in: groupIds.map((id) => new mongoose.Types.ObjectId(id)),
          },
          invitationId,
        }).lean()
      : [];

  const groupsById = new Map(groups.map((group: any) => [String(group._id), group]));

  return rawTables.map((table: any) => {
    if (typeof table.group === "string") {
      const group = groupsById.get(table.group);

      return {
        ...table,
        group: group
          ? {
              id: group._id,
              name: group.name ?? "",
              expectedCount: group.expectedCount ?? 0,
            }
          : null,
      };
    }

    return table;
  });
}

/* ===============================
   POST /api/seating/save/[eventId]
=============================== */

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    await dbConnect();

    const auth = await getUserIdFromRequest(req);

    if (!auth?.userId) {
      return NextResponse.json(
        {
          success: false,
          error: "UNAUTHORIZED",
          message: "לא מחובר",
        },
        { status: 401 }
      );
    }

    const userId = String(auth.userId);
    const { eventId } = await context.params;

    if (!eventId) {
      return NextResponse.json(
        {
          success: false,
          error: "MISSING_EVENT_ID",
          message: "חסר מזהה אירוע",
        },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));

    const invitationIdFromRequest = cleanString(
      body?.invitationId ||
        body?.venueClientInvitationId ||
        req.nextUrl.searchParams.get("invitationId") ||
        req.nextUrl.searchParams.get("invitation") ||
        ""
    );

    const rawTables = Array.isArray(body.tables) ? body.tables : [];
    const zones = Array.isArray(body.zones) ? body.zones : [];
    const background = normalizeBackground(body.background);
    const canvasView = normalizeCanvasView(body.canvasView);

    console.log("📥 SAVE SEATING BODY:", {
      eventId,
      invitationId: invitationIdFromRequest,
      tables: rawTables.length,
      zones: zones.length,
    });

    const invitation = await findInvitationForSeating({
      eventId,
      invitationId: invitationIdFromRequest,
    });

    if (!invitation?._id) {
      return NextResponse.json(
        {
          success: false,
          error: "INVITATION_NOT_FOUND",
          message: "ההזמנה לא נמצאה לפי האירוע או לפי invitationId",
        },
        { status: 404 }
      );
    }

    const allowed = await canSaveSeating({
      userId,
      eventId,
      invitationId: invitationIdFromRequest || String(invitation._id),
      invitation,
      auth,
    });

    if (!allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "FORBIDDEN",
          message: "אין הרשאה לשמור הושבה לאירוע הזה",
        },
        { status: 403 }
      );
    }

    const invitationId = invitation._id;
    const eventIdForDb = toObjectId(eventId) || eventId;

    const tables = await normalizeTablesWithGroups({
      rawTables,
      invitationId,
    });

    /*
      שמירה מותנית בנעילת עריכה, ב-fencing token ובגרסת המפה.
      שינוי מיקום או קיבולת לא מחליף את שיבוצי האורחים.
    */
    const existing = await SeatingTable.findOne({ eventId: eventIdForDb })
      .select("tables")
      .lean<{ tables?: any[] }>();

    const layoutChanged = tableGeometryChanged(existing?.tables || [], tables);
    const requestedScope: SaveScope | null =
      body?.saveScope === "full" || body?.saveScope === "layout"
        ? body.saveScope
        : null;

    const saved = await commitSeatingSnapshot({
      eventId,
      userId: String(invitation.userId || invitation.ownerId || userId),
      credentials: readSeatingWriteCredentials(body),
      requestedScope,
      nextTables: tables,
      zones,
      background,
      canvasView,
      layoutChanged,
    });

    if (!saved.ok) {
      return NextResponse.json(saved.body, { status: saved.status });
    }

    const guestWriteStats = saved.syncGuestAssignments
      ? await syncInvitationGuestsFromSeating({
          invitationId,
          eventId,
          tables: saved.tables,
        })
      : { writes: 0, skippedUnchanged: 0 };

    await pruneHiddenTableIdsForEvent({
      eventId: eventIdForDb,
      liveTableIds: saved.tables.map((table: any) => String(table?.id || "")),
    });

    return NextResponse.json({
      success: true,
      seatingId: saved.seatingId,
      eventId,
      invitationId: String(invitationId),
      tablesCount: saved.tables.length,
      zonesCount: zones.length,
      guestWrites: guestWriteStats.writes,
      guestWritesSkipped: guestWriteStats.skippedUnchanged,
      mapVersion: saved.mapVersion,
      saveScope: saved.scope,
    });
  } catch (err: any) {
    console.error("❌ Save seating error:", err);

    return NextResponse.json(
      {
        success: false,
        error: "SERVER_ERROR",
        message: err?.message || "שגיאת שרת בשמירת הושבה",
      },
      { status: 500 }
    );
  }
}
