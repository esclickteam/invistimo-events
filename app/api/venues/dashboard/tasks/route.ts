import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

import VenueTask from "@/models/VenueTask";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const allowedPriorities = ["low", "medium", "high"];

function serializeTask(task: any) {
  return {
    id: String(task._id),
    title: task.title,
    area: task.area,
    due: task.due,
    priority: task.priority,
    done: Boolean(task.done),
  };
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const auth = await getUserIdFromRequest(req);

    if (!auth?.userId) {
      return NextResponse.json(
        {
          success: false,
          message: "לא מחובר",
        },
        { status: 401 }
      );
    }

    const tasks = await VenueTask.find({
      ownerId: auth.userId,
    })
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

    const auth = await getUserIdFromRequest(req);

    if (!auth?.userId) {
      return NextResponse.json(
        {
          success: false,
          message: "לא מחובר",
        },
        { status: 401 }
      );
    }

    const body = await req.json();

    const task = await VenueTask.create({
      ownerId: auth.userId,

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