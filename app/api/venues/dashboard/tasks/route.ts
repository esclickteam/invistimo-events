import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import {
  requireVenueAccess,
  requireVenueDashboardActor,
} from "@/lib/venues/requireVenueAccess";
import mongoose from "mongoose";

import VenueTask from "@/models/VenueTask";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const hallId = clean(new URL(req.url).searchParams.get("hallId"));

    let ownerId = "";
    if (hallId) {
      const { ctx, error } = await requireVenueAccess(
        req,
        hallId,
        "dashboard.view"
      );
      if (error || !ctx) return error!;
      ownerId = ctx.ownerId;
    } else {
      const { ctx, error } = await requireVenueDashboardActor(
        req,
        "dashboard.view"
      );
      if (error || !ctx) return error!;
      ownerId = ctx.ownerId;
    }

    const query: Record<string, unknown> = { ownerId };
    if (hallId) {
      // Include legacy tasks without hallId for this owner + hall-scoped ones
      query.$or = [{ hallId }, { hallId: "" }, { hallId: { $exists: false } }];
    }

    const tasks = await VenueTask.find(query)
      .sort({
        done: 1,
        createdAt: -1,
      })
      .lean();

    return NextResponse.json({
      success: true,
      tasks: tasks.map(serializeTask),
    });
  } catch (error) {
    console.error("GET /api/venues/dashboard/tasks failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "טעינת משימות נכשלה",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const hallId = clean(body.hallId);

    let ownerId = "";
    if (hallId) {
      const { ctx, error } = await requireVenueAccess(
        req,
        hallId,
        "events.edit"
      );
      if (error || !ctx) return error!;
      ownerId = ctx.ownerId;
    } else {
      const { ctx, error } = await requireVenueDashboardActor(
        req,
        "events.edit"
      );
      if (error || !ctx) return error!;
      ownerId = ctx.ownerId;
    }

    const eventIdRaw = clean(body.eventId);
    const eventId =
      eventIdRaw && mongoose.Types.ObjectId.isValid(eventIdRaw)
        ? new mongoose.Types.ObjectId(eventIdRaw)
        : null;

    const task = await VenueTask.create({
      ownerId,
      hallId: hallId || "",
      eventId,

      title: String(body.title || "").trim() || "משימה חדשה",
      area: String(body.area || "").trim() || "כללי",
      due: String(body.due || "").trim(),

      priority: allowedPriorities.includes(body.priority)
        ? body.priority
        : "medium",

      done: Boolean(body.done),
    });

    return NextResponse.json({
      success: true,
      task: serializeTask(task),
    });
  } catch (error) {
    console.error("POST /api/venues/dashboard/tasks failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "יצירת משימה נכשלה",
      },
      { status: 500 }
    );
  }
}
