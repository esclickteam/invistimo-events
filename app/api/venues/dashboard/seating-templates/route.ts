import { NextRequest, NextResponse } from "next/server";

import VenueSeatingTemplate from "@/models/VenueSeatingTemplate";
import User from "@/models/User";
import { connectDB } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { requireVenueAccess } from "@/lib/venues/requireVenueAccess";
import { writeVenueAudit } from "@/lib/venues/audit";
import { syncSeatingTemplateToLinkedEvents } from "@/lib/venues/syncSeatingTemplateToLinkedEvents";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function stringifyDocs<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function getUserHallIds(user: any) {
  return [
    cleanString(user?.venueClientHallId),
    cleanString(user?.hallId),
    cleanString(user?.venueHallId),
    cleanString(user?.assignedHallId),
    cleanString(user?.venueSeatingService?.hallId),
  ].filter(Boolean);
}

function isVenueClientUser(user: any) {
  return (
    user?.venueClientSource === true ||
    user?.venueClientPackageType === "seating_only" ||
    user?.venueClientPackageType === "rsvp_seating" ||
    user?.venueClientPackageType === "rsvp_and_seating" ||
    user?.accessModules?.seatingTemplates === true ||
    user?.accessModules?.digitalSeating === true ||
    user?.includeSeating === true ||
    user?.includeDigitalSeating === true
  );
}

async function resolveVenueClientReadAccess(hallId: string) {
  const auth = await getUserIdFromRequest();
  if (!auth?.userId) {
    return {
      allowed: false as const,
      error: NextResponse.json(
        { success: false, error: "לא מחובר" },
        { status: 401 }
      ),
    };
  }

  const user = await User.findById(auth.userId).lean();
  if (!user) {
    return {
      allowed: false as const,
      error: NextResponse.json(
        { success: false, error: "משתמש לא נמצא" },
        { status: 404 }
      ),
    };
  }

  const currentUser = user as any;
  const allowedHallIds = getUserHallIds(currentUser);
  const isClientAllowedForHall =
    isVenueClientUser(currentUser) && allowedHallIds.includes(hallId);

  if (!isClientAllowedForHall) {
    return {
      allowed: false as const,
      error: NextResponse.json(
        {
          success: false,
          error: "אין הרשאה לצפות בתבניות של האולם הזה",
        },
        { status: 403 }
      ),
    };
  }

  return { allowed: true as const, auth, error: null };
}

/* ============================================================
   GET templates
   Venue staff: requireVenueAccess(seating.view) + hallId/ownerId
   Venue client: GET-only fallback when hallId matches their hall
============================================================ */
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const hallId = cleanString(searchParams.get("hallId"));
    const templateId = cleanString(
      searchParams.get("templateId") || searchParams.get("id")
    );

    if (!hallId) {
      return NextResponse.json(
        { success: false, error: "חסר מזהה אולם" },
        { status: 400 }
      );
    }

    const { ctx, error } = await requireVenueAccess(
      req,
      hallId,
      "seating.view"
    );

    let ownerId: string | null = null;
    let venueId = hallId;

    if (ctx) {
      ownerId = ctx.ownerId;
      venueId = ctx.venueId;
    } else if (error?.status === 403) {
      const clientAccess = await resolveVenueClientReadAccess(hallId);
      if (!clientAccess.allowed) {
        return clientAccess.error;
      }
    } else if (error) {
      return error;
    } else {
      return NextResponse.json(
        { success: false, error: "אין הרשאה לצפות בתבניות של האולם הזה" },
        { status: 403 }
      );
    }

    const query: any = {
      isActive: true,
      hallId: venueId,
    };

    // Also match the raw hallId from the query when it differs from canonical venueId
    if (venueId !== hallId) {
      query.hallId = { $in: [venueId, hallId] };
    }

    if (ownerId) {
      query.ownerId = ownerId;
    }

    if (templateId) {
      query._id = templateId;
    }

    const templates = await VenueSeatingTemplate.find(query)
      .sort({ createdAt: -1 })
      .lean();

    if (templateId && templates.length === 0) {
      return NextResponse.json(
        { success: false, error: "תבנית לא נמצאה" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      template: templateId ? stringifyDocs(templates[0]) : undefined,
      templates: stringifyDocs(templates),
    });
  } catch (error: any) {
    console.error("GET venue seating templates error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "שגיאה בשליפת תבניות הושבה",
      },
      { status: 500 }
    );
  }
}

/* ============================================================
   POST create template
============================================================ */
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json().catch(() => ({}));

    const {
      hallId,
      hallName,
      name,
      description,
      tables,
      canvas,
      settings,
    } = body || {};

    const cleanHallId = cleanString(hallId);
    const cleanName = cleanString(name);

    if (!cleanHallId) {
      return NextResponse.json(
        { success: false, error: "חסר מזהה אולם" },
        { status: 400 }
      );
    }

    const { ctx, error } = await requireVenueAccess(
      req,
      cleanHallId,
      "seating.edit"
    );
    if (error || !ctx) return error!;

    if (!cleanName || cleanName.length < 2) {
      return NextResponse.json(
        { success: false, error: "חסר שם תבנית" },
        { status: 400 }
      );
    }

    const template = await VenueSeatingTemplate.create({
      ownerId: ctx.ownerId,
      hallId: ctx.venueId,
      hallName:
        hallName != null && String(hallName).trim()
          ? String(hallName)
          : String((ctx.hall as any)?.name || ""),
      name: cleanName,
      description: description ? String(description) : "",
      tables: Array.isArray(tables) ? tables : [],
      canvas: canvas || {},
      settings: settings || {},
      isActive: true,
    });

    await writeVenueAudit({
      venueId: ctx.venueId,
      ownerId: ctx.ownerId,
      actorUserId: ctx.auth.userId,
      action: "seating_template.create",
      targetType: "VenueSeatingTemplate",
      targetId: String(template._id),
      meta: { name: cleanName },
    });

    return NextResponse.json({
      success: true,
      template: stringifyDocs(template),
    });
  } catch (error: any) {
    console.error("POST venue seating template error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "שגיאה בשמירת תבנית הושבה",
      },
      { status: 500 }
    );
  }
}

/* ============================================================
   PUT update / duplicate template
============================================================ */
export async function PUT(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json().catch(() => ({}));
    const templateId = cleanString(body.templateId || body.id || body._id);
    const action = cleanString(body.action || "update");
    const cleanHallId = cleanString(body.hallId);

    if (!cleanHallId) {
      return NextResponse.json(
        { success: false, error: "חסר מזהה אולם" },
        { status: 400 }
      );
    }

    if (!templateId) {
      return NextResponse.json(
        { success: false, error: "חסר מזהה תבנית" },
        { status: 400 }
      );
    }

    const { ctx, error } = await requireVenueAccess(
      req,
      cleanHallId,
      "seating.edit"
    );
    if (error || !ctx) return error!;

    const existing = await VenueSeatingTemplate.findOne({
      _id: templateId,
      ownerId: ctx.ownerId,
      hallId: { $in: [ctx.venueId, cleanHallId] },
      isActive: true,
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "תבנית לא נמצאה או שאין הרשאה" },
        { status: 404 }
      );
    }

    if (action === "duplicate") {
      const copy = await VenueSeatingTemplate.create({
        ownerId: ctx.ownerId,
        hallId: existing.hallId || ctx.venueId,
        hallName: existing.hallName,
        name: `${existing.name} (עותק)`,
        description: existing.description,
        tables: existing.tables || [],
        canvas: existing.canvas || {},
        settings: existing.settings || {},
        isActive: true,
      });

      await writeVenueAudit({
        venueId: ctx.venueId,
        ownerId: ctx.ownerId,
        actorUserId: ctx.auth.userId,
        action: "seating_template.duplicate",
        targetType: "VenueSeatingTemplate",
        targetId: String(copy._id),
        meta: { sourceTemplateId: templateId },
      });

      return NextResponse.json({
        success: true,
        template: stringifyDocs(copy),
      });
    }

    const nextName =
      body.name !== undefined ? cleanString(body.name) : existing.name;
    if (body.name !== undefined && nextName.length < 2) {
      return NextResponse.json(
        { success: false, error: "שם תבנית קצר מדי" },
        { status: 400 }
      );
    }

    const nextTables = Array.isArray(body.tables)
      ? body.tables
      : existing.tables || [];
    const nextCanvas =
      body.canvas !== undefined ? body.canvas || {} : existing.canvas || {};
    const nextSettings =
      body.settings !== undefined
        ? body.settings || {}
        : existing.settings || {};
    const nextDescription =
      body.description !== undefined
        ? String(body.description || "")
        : existing.description;

    // Preview sync against the candidate template BEFORE persisting.
    // Blocks silent loss of seated guests on delete/capacity shrink.
    let sync: Awaited<
      ReturnType<typeof syncSeatingTemplateToLinkedEvents>
    > | null = null;
    try {
      sync = await syncSeatingTemplateToLinkedEvents({
        template: {
          _id: existing._id,
          id: existing._id,
          name: nextName,
          tables: nextTables,
          canvas: nextCanvas,
          updatedAt: new Date(),
        },
        hallId: ctx.venueId,
        ownerId: String(ctx.ownerId),
        confirmDestructive: Boolean(
          body.confirmDestructive || body.forceSync || body.force
        ),
      });
    } catch (syncError) {
      console.error("seating template live sync failed:", syncError);
    }

    if (sync?.blocked) {
      return NextResponse.json(
        {
          success: false,
          error: "DESTRUCTIVE_SEATING_SYNC_BLOCKED",
          message:
            "השינוי בתבנית עלול למחוק הושבת אורחים קיימת. אשר במפורש (confirmDestructive) כדי להמשיך.",
          warnings: sync.warnings,
          sync,
        },
        { status: 409 }
      );
    }

    existing.name = nextName;
    existing.description = nextDescription;
    existing.tables = nextTables;
    existing.canvas = nextCanvas;
    existing.settings = nextSettings;
    await existing.save();

    await writeVenueAudit({
      venueId: ctx.venueId,
      ownerId: ctx.ownerId,
      actorUserId: ctx.auth.userId,
      action: "seating_template.update",
      targetType: "VenueSeatingTemplate",
      targetId: String(existing._id),
      meta: { name: existing.name, sync },
    });

    return NextResponse.json({
      success: true,
      template: stringifyDocs(existing),
      sync,
      warnings: sync?.warnings || [],
    });
  } catch (error: any) {
    console.error("PUT venue seating template error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "שגיאה בעדכון תבנית",
      },
      { status: 500 }
    );
  }
}

/* ============================================================
   DELETE soft-delete template
============================================================ */
export async function DELETE(req: NextRequest) {
  try {
    await connectDB();

    const url = new URL(req.url);
    const templateId = cleanString(
      url.searchParams.get("templateId") || url.searchParams.get("id")
    );
    const hallId = cleanString(url.searchParams.get("hallId"));

    if (!hallId) {
      return NextResponse.json(
        { success: false, error: "חסר מזהה אולם" },
        { status: 400 }
      );
    }

    if (!templateId) {
      return NextResponse.json(
        { success: false, error: "חסר מזהה תבנית" },
        { status: 400 }
      );
    }

    const { ctx, error } = await requireVenueAccess(
      req,
      hallId,
      "seating.edit"
    );
    if (error || !ctx) return error!;

    const existing = await VenueSeatingTemplate.findOneAndUpdate(
      {
        _id: templateId,
        ownerId: ctx.ownerId,
        hallId: { $in: [ctx.venueId, hallId] },
        isActive: true,
      },
      { $set: { isActive: false } },
      { new: true }
    );

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "תבנית לא נמצאה או שאין הרשאה" },
        { status: 404 }
      );
    }

    await writeVenueAudit({
      venueId: ctx.venueId,
      ownerId: ctx.ownerId,
      actorUserId: ctx.auth.userId,
      action: "seating_template.delete",
      targetType: "VenueSeatingTemplate",
      targetId: templateId,
      meta: { name: existing.name },
    });

    return NextResponse.json({
      success: true,
      deletedTemplateId: templateId,
    });
  } catch (error: any) {
    console.error("DELETE venue seating template error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "שגיאה במחיקת תבנית",
      },
      { status: 500 }
    );
  }
}
