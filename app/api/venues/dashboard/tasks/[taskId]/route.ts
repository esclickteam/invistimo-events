import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

import VenueTask from "@/models/VenueTask";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Props = {
  params: Promise<{
    taskId: string;
  }>;
};

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

export async function PATCH(req: NextRequest, { params }: Props) {
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

    const { taskId } = await params;
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
        ownerId: auth.userId,
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

    const { taskId } = await params;

    const deleted = await VenueTask.findOneAndDelete({
      _id: taskId,
      ownerId: auth.userId,
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