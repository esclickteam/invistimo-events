import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireVenueAccess } from "@/lib/venues/requireVenueAccess";
import { writeVenueAudit } from "@/lib/venues/audit";
import { createVenueAlert } from "@/lib/venues/alerts";
import VenueEquipment from "@/models/VenueEquipment";
import VenueEquipmentAssignment from "@/models/VenueEquipmentAssignment";
import { eventHasVerifiedVenueLink } from "@/lib/venues/eventVenueLinkInvariant";
import Event from "@/models/Event";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Props = { params: Promise<{ hallId: string }> };

const ASSIGNMENT_STATUSES = [
  "reserved",
  "out",
  "returned",
  "missing",
  "damaged",
] as const;

function clean(v: unknown) {
  return String(v || "").trim();
}

function toQty(v: unknown, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

function serializeEquipment(item: any, reserved = 0) {
  const quantity = toQty(item.quantity);
  return {
    id: String(item._id),
    name: item.name || "",
    sku: item.sku || "",
    quantity,
    reserved,
    available: Math.max(0, quantity - reserved),
    notes: item.notes || "",
    status: item.status || "active",
    createdAt: item.createdAt ? new Date(item.createdAt).toISOString() : null,
  };
}

function serializeAssignment(row: any, equipmentName = "") {
  return {
    id: String(row._id),
    equipmentId: String(row.equipmentId),
    equipmentName,
    eventId: row.eventId ? String(row.eventId) : null,
    quantity: toQty(row.quantity, 1),
    status: row.status || "reserved",
    notes: row.notes || "",
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : null,
  };
}

async function reservedByEquipment(ownerId: string, hallId: string) {
  const ownerMatch: any[] = [ownerId];
  if (mongoose.Types.ObjectId.isValid(ownerId)) {
    ownerMatch.push(new mongoose.Types.ObjectId(ownerId));
  }
  const rows = await VenueEquipmentAssignment.aggregate([
    {
      $match: {
        ownerId: { $in: ownerMatch },
        hallId,
        status: { $in: ["reserved", "out", "missing", "damaged"] },
      },
    },
    {
      $group: {
        _id: "$equipmentId",
        qty: { $sum: "$quantity" },
      },
    },
  ]);
  const map = new Map<string, number>();
  for (const r of rows) map.set(String(r._id), Number(r.qty) || 0);
  return map;
}

export async function GET(req: NextRequest, { params }: Props) {
  try {
    await connectDB();
    const { hallId } = await params;
    const { ctx, error } = await requireVenueAccess(req, hallId, "settings.view");
    if (error || !ctx) return error!;

    const url = new URL(req.url);
    const includeAssignments = url.searchParams.get("assignments") === "1";

    const items = await VenueEquipment.find({
      ownerId: ctx.ownerId,
      hallId: ctx.venueId,
    })
      .sort({ name: 1 })
      .lean();

    const reservedMap = await reservedByEquipment(
      String(ctx.ownerId),
      ctx.venueId
    );

    let assignments: any[] = [];
    if (includeAssignments) {
      const rows = await VenueEquipmentAssignment.find({
        ownerId: ctx.ownerId,
        hallId: ctx.venueId,
      })
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();
      const nameById = new Map(
        items.map((i: any) => [String(i._id), String(i.name || "")])
      );
      assignments = rows.map((r) =>
        serializeAssignment(r, nameById.get(String(r.equipmentId)) || "")
      );
    }

    return NextResponse.json({
      success: true,
      equipment: items.map((i) =>
        serializeEquipment(i, reservedMap.get(String(i._id)) || 0)
      ),
      assignments,
    });
  } catch (err) {
    console.error("GET equipment failed:", err);
    return NextResponse.json(
      { success: false, message: "טעינת ציוד נכשלה" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, { params }: Props) {
  try {
    await connectDB();
    const { hallId } = await params;
    const { ctx, error } = await requireVenueAccess(req, hallId, "settings.edit");
    if (error || !ctx) return error!;

    const body = await req.json().catch(() => ({}));
    const action = clean(body.action) || "create_item";

    if (action === "create_item") {
      const name = clean(body.name);
      if (!name) {
        return NextResponse.json(
          { success: false, message: "חובה להזין שם פריט" },
          { status: 400 }
        );
      }
      const item = await VenueEquipment.create({
        ownerId: ctx.ownerId,
        hallId: ctx.venueId,
        name,
        sku: clean(body.sku),
        quantity: toQty(body.quantity),
        notes: clean(body.notes),
        status: body.status === "retired" ? "retired" : "active",
      });

      await writeVenueAudit({
        venueId: ctx.venueId,
        ownerId: ctx.ownerId,
        actorUserId: String(ctx.auth.userId),
        action: "equipment.create",
        targetType: "VenueEquipment",
        targetId: String(item._id),
        meta: { name },
      });

      await createVenueAlert({
        ownerId: String(ctx.ownerId),
        hallId: ctx.venueId,
        title: `נוסף ציוד: ${name}`,
        description: `כמות: ${item.quantity}`,
        tone: "emerald",
        type: "maintenance",
        linkHref: `/venues/dashboard/halls/${encodeURIComponent(ctx.venueId)}/equipment`,
        dedupeKey: `equip-create:${String(item._id)}`,
      });

      return NextResponse.json({
        success: true,
        equipment: serializeEquipment(item, 0),
      });
    }

    if (action === "assign") {
      const equipmentId = clean(body.equipmentId);
      const eventId = clean(body.eventId);
      const quantity = Math.max(1, toQty(body.quantity, 1));
      if (!equipmentId || !mongoose.Types.ObjectId.isValid(equipmentId)) {
        return NextResponse.json(
          { success: false, message: "חסר ציוד" },
          { status: 400 }
        );
      }

      const item = await VenueEquipment.findOne({
        _id: equipmentId,
        ownerId: ctx.ownerId,
        hallId: ctx.venueId,
        status: "active",
      });
      if (!item) {
        return NextResponse.json(
          { success: false, message: "הציוד לא נמצא" },
          { status: 404 }
        );
      }

      if (eventId) {
        if (!mongoose.Types.ObjectId.isValid(eventId)) {
          return NextResponse.json(
            { success: false, message: "מזהה אירוע לא תקין" },
            { status: 400 }
          );
        }
        const event = await Event.findById(eventId).lean();
        if (!event || !(await eventHasVerifiedVenueLink(event))) {
          return NextResponse.json(
            { success: false, message: "ניתן לשייך רק לאירוע אולם מאומת" },
            { status: 400 }
          );
        }
      }

      const reservedMap = await reservedByEquipment(
        String(ctx.ownerId),
        ctx.venueId
      );
      const reserved = reservedMap.get(String(item._id)) || 0;
      const available = Math.max(0, toQty(item.quantity) - reserved);
      if (quantity > available) {
        return NextResponse.json(
          {
            success: false,
            message: `אין מספיק מלאי פנוי (זמין: ${available})`,
          },
          { status: 409 }
        );
      }

      const status = ASSIGNMENT_STATUSES.includes(body.status)
        ? body.status
        : "reserved";

      const row = await VenueEquipmentAssignment.create({
        ownerId: ctx.ownerId,
        hallId: ctx.venueId,
        equipmentId: item._id,
        eventId: eventId || null,
        quantity,
        status,
        notes: clean(body.notes),
      });

      await writeVenueAudit({
        venueId: ctx.venueId,
        ownerId: ctx.ownerId,
        actorUserId: String(ctx.auth.userId),
        action: "equipment.assign",
        targetType: "VenueEquipmentAssignment",
        targetId: String(row._id),
        meta: { equipmentId, eventId: eventId || null, quantity, status },
      });

      return NextResponse.json({
        success: true,
        assignment: serializeAssignment(row, item.name),
      });
    }

    if (action === "update_assignment") {
      const assignmentId = clean(body.assignmentId || body.id);
      if (!assignmentId) {
        return NextResponse.json(
          { success: false, message: "חסר מזהה שיוך" },
          { status: 400 }
        );
      }
      const update: Record<string, unknown> = {};
      if (ASSIGNMENT_STATUSES.includes(body.status)) update.status = body.status;
      if (body.notes !== undefined) update.notes = clean(body.notes);
      if (body.quantity !== undefined) {
        update.quantity = Math.max(1, toQty(body.quantity, 1));
      }

      const row = await VenueEquipmentAssignment.findOneAndUpdate(
        {
          _id: assignmentId,
          ownerId: ctx.ownerId,
          hallId: ctx.venueId,
        },
        { $set: update },
        { new: true }
      ).lean();

      if (!row) {
        return NextResponse.json(
          { success: false, message: "שיוך לא נמצא" },
          { status: 404 }
        );
      }

      await writeVenueAudit({
        venueId: ctx.venueId,
        ownerId: ctx.ownerId,
        actorUserId: String(ctx.auth.userId),
        action: "equipment.assignment_update",
        targetType: "VenueEquipmentAssignment",
        targetId: assignmentId,
        meta: update,
      });

      return NextResponse.json({
        success: true,
        assignment: serializeAssignment(row),
      });
    }

    if (action === "update_item") {
      const itemId = clean(body.equipmentId || body.id);
      if (!itemId) {
        return NextResponse.json(
          { success: false, message: "חסר מזהה ציוד" },
          { status: 400 }
        );
      }
      const update: Record<string, unknown> = {};
      if (typeof body.name === "string") update.name = clean(body.name) || "פריט";
      if (typeof body.sku === "string") update.sku = clean(body.sku);
      if (typeof body.notes === "string") update.notes = clean(body.notes);
      if (body.quantity !== undefined) update.quantity = toQty(body.quantity);
      if (body.status === "active" || body.status === "retired") {
        update.status = body.status;
      }

      const item = await VenueEquipment.findOneAndUpdate(
        { _id: itemId, ownerId: ctx.ownerId, hallId: ctx.venueId },
        { $set: update },
        { new: true }
      ).lean();

      if (!item) {
        return NextResponse.json(
          { success: false, message: "הציוד לא נמצא" },
          { status: 404 }
        );
      }

      await writeVenueAudit({
        venueId: ctx.venueId,
        ownerId: ctx.ownerId,
        actorUserId: String(ctx.auth.userId),
        action: "equipment.update",
        targetType: "VenueEquipment",
        targetId: itemId,
        meta: update,
      });

      const reservedMap = await reservedByEquipment(
        String(ctx.ownerId),
        ctx.venueId
      );
      return NextResponse.json({
        success: true,
        equipment: serializeEquipment(
          item,
          reservedMap.get(String(item._id)) || 0
        ),
      });
    }

    if (action === "delete_item") {
      const itemId = clean(body.equipmentId || body.id);
      const active = await VenueEquipmentAssignment.countDocuments({
        ownerId: ctx.ownerId,
        hallId: ctx.venueId,
        equipmentId: itemId,
        status: { $in: ["reserved", "out"] },
      });
      if (active > 0) {
        return NextResponse.json(
          {
            success: false,
            message: "לא ניתן למחוק ציוד עם שיוכים פעילים — החזירו/בטלו קודם",
          },
          { status: 409 }
        );
      }
      const deleted = await VenueEquipment.findOneAndDelete({
        _id: itemId,
        ownerId: ctx.ownerId,
        hallId: ctx.venueId,
      }).lean();
      if (!deleted) {
        return NextResponse.json(
          { success: false, message: "הציוד לא נמצא" },
          { status: 404 }
        );
      }
      await writeVenueAudit({
        venueId: ctx.venueId,
        ownerId: ctx.ownerId,
        actorUserId: String(ctx.auth.userId),
        action: "equipment.delete",
        targetType: "VenueEquipment",
        targetId: itemId,
      });
      return NextResponse.json({ success: true, message: "נמחק" });
    }

    return NextResponse.json(
      { success: false, message: "פעולה לא נתמכת" },
      { status: 400 }
    );
  } catch (err) {
    console.error("POST equipment failed:", err);
    return NextResponse.json(
      { success: false, message: "שמירת ציוד נכשלה" },
      { status: 500 }
    );
  }
}
