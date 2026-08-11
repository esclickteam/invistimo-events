import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import {
  requireVenueAccess,
  requireVenueDashboardActor,
} from "@/lib/venues/requireVenueAccess";
import { writeVenueAudit } from "@/lib/venues/audit";

import VenueTask from "@/models/VenueTask";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Props = {
  params: Promise<{
    taskId: string;
  }>;
};

const allowedPriorities = ["low", "medium", "high"];

function clean(v: unknown) {
  return String(v || "").trim();
}

function serializeTask(task: any) {
  return {
    id: String(task._id),
    title: task.title,
    area: task.area,
    due: task.due,
    priority: task.priority,
    done: Boolean(task.done),
    hallId: task.hallId || "",
    eventId: task.eventId ? String(task.eventId) : null,
  };
}

async function resolveTaskActor(req: NextRequest, task: any) {
  const hallId = clean(task.hallId);
  if (hallId) {
    return requireVenueAccess(req, hallId, "events.edit");
  }
  const { ctx, error } = await requireVenueDashboardActor(req, "events.edit");
  return { ctx, error };
}

export async function PATCH(req: NextRequest, { params }: Props) {
  try {
    await connectDB();

    const { taskId } = await params;
    const existing = await VenueTask.findById(taskId).lean();
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "המשימה לא נמצאה" },
        { status: 404 }
      );
    }

    const { ctx, error } = await resolveTaskActor(req, existing);
    if (error || !ctx) return error!;

    const ownerId = "ownerId" in ctx ? ctx.ownerId : "";
    if (String((existing as any).ownerId) !== String(ownerId)) {
      return NextResponse.json(
        { success: false, message: "המשימה לא נמצאה" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const update: Record<string, unknown> = {};

    if (typeof body.title === "string") {
      update.title = body.title.trim() || "משימה ללא כותרת";
    }

    if (typeof body.area === "string") {
      update.area = body.area.trim() || "כללי";
    }

    if (typeof body.due === "string") {
      update.due = body.due.trim();
    }

    if (typeof body.done === "boolean") {
      update.done = body.done;
    }

    if (allowedPriorities.includes(body.priority)) {
      update.priority = body.priority;
    }

    const task = await VenueTask.findOneAndUpdate(
      {
        _id: taskId,
        ownerId,
      },
      {
        $set: update,
      },
      {
        new: true,
        runValidators: true,
      }
    ).lean();

    if (!task) {
      return NextResponse.json(
        {
          success: false,
          message: "המשימה לא נמצאה",
        },
        { status: 404 }
      );
    }

    const venueId =
      clean((task as any).hallId) ||
      ("venueId" in ctx ? String((ctx as any).venueId) : "");
    if (venueId) {
      await writeVenueAudit({
        venueId,
        ownerId,
        actorUserId: String(ctx.auth.userId),
        action: "task.update",
        targetType: "VenueTask",
        targetId: String(taskId),
        meta: update,
      });
    }

    return NextResponse.json({
      success: true,
      task: serializeTask(task),
    });
  } catch (error) {
    console.error("PATCH /api/venues/dashboard/tasks/[taskId] failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "עדכון משימה נכשל",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: Props) {
  try {
    await connectDB();

    const { taskId } = await params;
    const existing = await VenueTask.findById(taskId).lean();
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "המשימה לא נמצאה" },
        { status: 404 }
      );
    }

    const { ctx, error } = await resolveTaskActor(req, existing);
    if (error || !ctx) return error!;

    const ownerId = "ownerId" in ctx ? ctx.ownerId : "";
    if (String((existing as any).ownerId) !== String(ownerId)) {
      return NextResponse.json(
        { success: false, message: "המשימה לא נמצאה" },
        { status: 404 }
      );
    }

    const deleted = await VenueTask.findOneAndDelete({
      _id: taskId,
      ownerId,
    }).lean();

    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          message: "המשימה לא נמצאה",
        },
        { status: 404 }
      );
    }

    const venueId =
      clean((deleted as any).hallId) ||
      ("venueId" in ctx ? String((ctx as any).venueId) : "");
    if (venueId) {
      await writeVenueAudit({
        venueId,
        ownerId,
        actorUserId: String(ctx.auth.userId),
        action: "task.delete",
        targetType: "VenueTask",
        targetId: String(taskId),
      });
    }

    return NextResponse.json({
      success: true,
      message: "המשימה נמחקה בהצלחה",
    });
  } catch (error) {
    console.error("DELETE /api/venues/dashboard/tasks/[taskId] failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "מחיקת משימה נכשלה",
      },
      { status: 500 }
    );
  }
}
